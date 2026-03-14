const Lead     = require('../models/Lead');
const Deal     = require('../models/Deal');
const User     = require('../models/User');
const mongoose = require('mongoose');
const { notify, notifyMany } = require('../services/notificationService');

const getIO = (req) => req.app.get('io');

// ── Helpers ───────────────────────────────────────────────────────────────────
const leadName   = (l)    => `${l.firstName} ${l.lastName}`;
const senderName = (u)    => `${u.firstName} ${u.lastName}`;
const getSalesLeaders = () => User.find({ role: 'sales_leader', isActive: true }).select('_id');
const getCxpAgents    = () => User.find({ role: 'cxp',          isActive: true }).select('_id');

////////////////////////////////////////////////////////////
// CREATE LEAD
////////////////////////////////////////////////////////////
exports.createLead = async (req, res) => {
  try {
    const existing = await Lead.findOne({
      firstName: req.body.firstName,
      lastName:  req.body.lastName,
    });
    if (existing) return res.status(400).json({ message: 'Lead already exists' });

    const lead = await Lead.create({ ...req.body, createdBy: req.user.id });
    getIO(req).emit('lead:created', lead);

    res.status(201).json({
      success: true,
      message: `Lead ${lead.firstName} ${lead.lastName} created successfully`,
      data:    lead,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// IMPORT LEADS (BULK)
////////////////////////////////////////////////////////////
exports.importLeads = async (req, res) => {
  try {
    const formatted = req.body.map((lead) => ({ ...lead, createdBy: req.user.id }));
    const inserted  = await Lead.insertMany(formatted);
    getIO(req).emit('lead:imported', { count: inserted.length });
    res.status(201).json({ success: true, count: inserted.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// GET ONE LEAD BY ID
////////////////////////////////////////////////////////////
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy',  'firstName lastName');

    if (!lead || lead.isDeleted)
      return res.status(404).json({ message: 'Lead not found' });

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// GET ALL LEADS (SEARCH + FILTER + PAGINATION)
////////////////////////////////////////////////////////////
exports.getAllLeads = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, source, assignedTo, dateFrom, dateTo } = req.query;

    const query = { isDeleted: false };

    if (source) query.source = source;

    // CXP only sees DealClosed leads (can filter by other statuses too)
    if (req.user.role === 'cxp') {
      query.status = status || 'DealClosed';
    } else {
      if (status) query.status = status;
    }

    // Salesmen only see their own leads
    if (req.user.role === 'salesman') {
      query.assignedTo = req.user.id;
    } else if (assignedTo === 'null') {
      query.assignedTo = null;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.statusChangedAt = {};
      if (dateFrom) query.statusChangedAt['$gte'] = new Date(dateFrom);
      if (dateTo)   query.statusChangedAt['$lte'] = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
        { phone:     { $regex: search, $options: 'i' } },
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'firstName lastName')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: 1 }),
      Lead.countDocuments(query),
    ]);

    res.json({ total, page: Number(page), pages: Math.ceil(total / limit), data: leads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// UPDATE LEAD
// • Salesman édite         → notifier tous les Sales Leaders
// • Sales Leader édite     → notifier le salesman assigné
////////////////////////////////////////////////////////////
exports.updateLead = async (req, res) => {
  try {
    let allowedFields;

    if (req.user.role === 'salesman') {
      const { firstName, lastName, email, phone, city, country, source } = req.body;
      allowedFields = { firstName, lastName, email, phone, city, country, source };

      const lead = await Lead.findOne({ _id: req.params.id, assignedTo: req.user.id, isDeleted: false });
      if (!lead) return res.status(403).json({ message: 'Lead not found or not assigned to you' });

    } else if (req.user.role === 'cxp') {
      // CXP peut modifier les infos de contact uniquement sur les leads DealClosed
      const lead = await Lead.findOne({ _id: req.params.id, status: 'DealClosed', isDeleted: false });
      if (!lead) return res.status(403).json({ message: 'Lead not found or not in DealClosed status' });

      const { firstName, lastName, email, phone, address, city, region, postalCode, country } = req.body;
      allowedFields = { firstName, lastName, email, phone, address, city, region, postalCode, country };

    } else {
      allowedFields = { ...req.body };
    }

    Object.keys(allowedFields).forEach((k) => allowedFields[k] === undefined && delete allowedFields[k]);

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      { ...allowedFields, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName');

    if (!updated) return res.status(404).json({ message: 'Lead not found' });

    getIO(req).emit('lead:updated', updated);

    const io     = getIO(req);
    const name   = leadName(updated);
    const byName = senderName(req.user);
    const meta   = { leadId: updated._id, leadName: name, salesmanName: byName };

    // ── Salesman édite → notifier tous les Sales Leaders ──────────────────────
    if (req.user.role === 'salesman') {
      const leaders = await getSalesLeaders();
      await notifyMany(io, leaders.map((l) => l._id), {
        sentBy:  req.user.id,
        type:    'lead_edited_by_salesman',
        title:   'Lead modifié par un commercial',
        message: `${byName} a modifié les informations du lead ${name}.`,
        meta,
      });
    }

    // ── CXP édite → notifier tous les Sales Leaders ──────────────────────────
    if (req.user.role === 'cxp') {
      const leaders = await getSalesLeaders();
      await notifyMany(io, leaders.map((l) => l._id), {
        sentBy:  req.user.id,
        type:    'lead_edited_by_cxp',
        title:   'Lead modifié par CXP',
        message: `${byName} (CXP) a modifié les informations du lead ${name}.`,
        meta,
      });
    }

    // ── Sales Leader édite → notifier le salesman assigné ─────────────────────
    if (req.user.role === 'sales_leader' && updated.assignedTo) {
      await notify(io, {
        recipient: updated.assignedTo._id,
        sentBy:    req.user.id,
        type:      'lead_edited_by_leader',
        title:     'Lead modifié par le Sales Leader',
        message:   `Les informations du lead ${name} ont été modifiées par ${byName}.`,
        meta,
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// DELETE LEAD
// • Sales Leader supprime  → notifier le salesman assigné (s'il y en a un)
////////////////////////////////////////////////////////////
exports.deleteLead = async (req, res) => {
  try {
    // Récupérer le lead avant suppression pour avoir l'assigné
    const leadBefore = await Lead.findById(req.params.id)
      .populate('assignedTo', '_id firstName lastName');

    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    getIO(req).emit('lead:deleted', { _id: req.params.id });

    // Notifier le salesman si le lead lui était assigné
    if (leadBefore?.assignedTo) {
      await notify(getIO(req), {
        recipient: leadBefore.assignedTo._id,
        sentBy:    req.user.id,
        type:      'lead_deleted_by_leader',
        title:     'Lead supprimé',
        message:   `Le lead ${leadName(leadBefore)} vous a été retiré et supprimé par ${senderName(req.user)}.`,
        meta:      { leadName: leadName(leadBefore), salesmanName: senderName(req.user) },
      });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// ASSIGN LEAD
// • Nouveau salesman assigné → notifier ce salesman
// • Ancien salesman retiré   → notifier l'ancien salesman
////////////////////////////////////////////////////////////
exports.assignLead = async (req, res) => {
  try {
    const { salesmanId } = req.body;

    const prevLead = await Lead.findById(req.params.id).select('assignedTo firstName lastName');

    if (salesmanId) {
      const user = await User.findById(salesmanId);
      if (!user || user.role !== 'salesman')
        return res.status(400).json({ message: 'Invalid salesman' });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { assignedTo: salesmanId || null, assignedAt: Date.now(), assignedBy: req.user.id },
      { new: true }
    ).populate('assignedTo', 'firstName lastName');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    getIO(req).emit('lead:updated', lead);

    const io     = getIO(req);
    const name   = leadName(lead);
    const byName = senderName(req.user);

    // Notif → nouveau salesman
    if (salesmanId) {
      await notify(io, {
        recipient: salesmanId,
        sentBy:    req.user.id,
        type:      'lead_assigned',
        title:     'Nouveau lead assigné',
        message:   `Le lead ${name} vous a été assigné par ${byName}.`,
        meta:      { leadId: lead._id, leadName: name, salesmanName: byName },
      });
    }

    // Notif → ancien salesman (lead retiré)
    const prevId = prevLead?.assignedTo?.toString();
    if (prevId && prevId !== salesmanId) {
      await notify(io, {
        recipient: prevId,
        sentBy:    req.user.id,
        type:      'lead_unassigned',
        title:     'Lead retiré',
        message:   `Le lead ${name} vous a été retiré par ${byName}.`,
        meta:      { leadId: lead._id, leadName: name },
      });
    }

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// CHANGE STATUS
// • Salesman change statut     → notifier Sales Leaders
//   (DealClosed) en plus       → notifier CXP
// • Sales Leader change statut → notifier salesman assigné
////////////////////////////////////////////////////////////
exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status, statusChangedAt: Date.now(), statusChangedBy: req.user.id },
      { new: true }
    ).populate('assignedTo', 'firstName lastName');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    getIO(req).emit('lead:updated', lead);

    const io     = getIO(req);
    const name   = leadName(lead);
    const byName = senderName(req.user);

    // ── Salesman change le statut ──────────────────────────────────────────────
    if (req.user.role === 'salesman') {
      const leaders    = await getSalesLeaders();
      const leaderIds  = leaders.map((l) => l._id);

      if (status === 'DealClosed') {
        // Alerte Deal Closed → Sales Leaders
        await notifyMany(io, leaderIds, {
          sentBy:  req.user.id,
          type:    'deal_closed_alert',
          title:   '🎉 Deal Closed !',
          message: `Le lead ${name} a été closed par ${byName}.`,
          meta:    { leadId: lead._id, leadName: name, salesmanName: byName, leadStatus: status },
        });
        // Créer automatiquement un Deal En_Attente
        const existingDeal = await Deal.findOne({ lead: lead._id });
        if (!existingDeal) {
          await Deal.create({ lead: lead._id, status: 'En_Attente', createdBy: req.user.id });
        }
        // Notifier CXP
        const cxp = await getCxpAgents();
        await notifyMany(io, cxp.map((c) => c._id), {
          sentBy:  req.user.id,
          type:    'deal_to_confirm',
          title:   '🆕 Nouveau deal à traiter',
          message: `Le lead ${name} est passé en Deal Closed. Traitez le deal.`,
          meta:    { leadId: lead._id, leadName: name, salesmanName: byName },
        });
      } else {
        // Autre statut → Sales Leaders
        await notifyMany(io, leaderIds, {
          sentBy:  req.user.id,
          type:    'lead_status_updated',
          title:   'Statut de lead mis à jour',
          message: `${byName} a changé le statut du lead ${name} → ${status}.`,
          meta:    { leadId: lead._id, leadName: name, salesmanName: byName, leadStatus: status },
        });
      }
    }

    // ── Sales Leader change le statut → salesman assigné ──────────────────────
    if (req.user.role === 'sales_leader' && lead.assignedTo) {
      await notify(io, {
        recipient: lead.assignedTo._id,
        sentBy:    req.user.id,
        type:      'lead_status_changed_by_leader',
        title:     'Statut de lead modifié',
        message:   `Le statut du lead ${name} a été changé en "${status}" par ${byName}.`,
        meta:      { leadId: lead._id, leadName: name, leadStatus: status, salesmanName: byName },
      });
    }

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// ADD NOTE
// • Sales Leader ajoute note   → notifier le salesman assigné
// • Salesman ou CXP ajoute note → notifier tous les Sales Leaders
////////////////////////////////////////////////////////////
exports.addNote = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Note content is required' });

    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.notes.push({ content, createdBy: req.user.id });
    await lead.save();
    await lead.populate('assignedTo', 'firstName lastName');

    getIO(req).emit('lead:updated', lead);

    const io      = getIO(req);
    const name    = leadName(lead);
    const byName  = senderName(req.user);
    const preview = `"${content.slice(0, 80)}${content.length > 80 ? '…' : ''}"`;
    const meta    = { leadId: lead._id, leadName: name, salesmanName: byName };

    // ── Sales Leader → notifier le salesman ───────────────────────────────────
    // if (req.user.role === 'sales_leader' && lead.assignedTo) {
    //   await notify(io, {
    //     recipient: lead.assignedTo._id,
    //     sentBy:    req.user.id,
    //     type:      'note_added',
    //     title:     'Nouvelle instruction du Sales Leader',
    //     message:   `${byName} a ajouté une note sur le lead ${name} : ${preview}`,
    //     meta,
    //   });
    // }

    // ── Salesman ou CXP → notifier tous les Sales Leaders ─────────────────────
    if (req.user.role === 'salesman' || req.user.role === 'cxp') {
      const leaders = await getSalesLeaders();
      await notifyMany(io, leaders.map((l) => l._id), {
        sentBy:  req.user.id,
        type:    'note_added_to_leader',
        title:   `Note ajoutée par ${req.user.role === 'cxp' ? 'CXP' : 'un commercial'}`,
        message: `${byName} a ajouté une note sur le lead ${name} : ${preview}`,
        meta,
      });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// REPORT PROBLEM  →  notifier tous les Sales Leaders
////////////////////////////////////////////////////////////
exports.reportProblem = async (req, res) => {
  try {
    const { leadId, message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const lead   = leadId ? await Lead.findById(leadId).select('firstName lastName') : null;
    const name   = lead ? leadName(lead) : null;
    const byName = senderName(req.user);
    const io     = getIO(req);

    const leaders = await getSalesLeaders();
    await notifyMany(io, leaders.map((l) => l._id), {
      sentBy:  req.user.id,
      type:    'problem_reported',
      title:   '⚠️ Problème signalé',
      message: name
        ? `${byName} a signalé un problème sur le lead ${name} : "${message.slice(0, 100)}"`
        : `${byName} a signalé un problème : "${message.slice(0, 100)}"`,
      meta: { leadId: lead?._id ?? null, leadName: name, salesmanName: byName },
    });

    res.status(201).json({ success: true, message: 'Problème signalé aux Sales Leaders' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// REPORT DELIVERY STATUS (CXP)  →  Sales Leaders + salesman
////////////////////////////////////////////////////////////
exports.reportDelivery = async (req, res) => {
  try {
    const { leadId, deliveryStatus, deliveryRef } = req.body;

    const typeMap = {
      sent:        'delivery_sent',
      in_progress: 'delivery_in_progress',
      success:     'delivery_success',
      failed:      'delivery_failed',
    };
    const titleMap = {
      sent:        'Commande envoyée',
      in_progress: 'Colis en cours de livraison',
      success:     '✅ Colis livré avec succès',
      failed:      '❌ Livraison échouée',
    };

    const type  = typeMap[deliveryStatus];
    const title = titleMap[deliveryStatus];
    if (!type) return res.status(400).json({ message: 'Invalid deliveryStatus' });

    const lead = leadId
      ? await Lead.findById(leadId).populate('assignedTo', '_id firstName lastName')
      : null;
    const name = lead ? leadName(lead) : 'N/A';
    const ref  = deliveryRef ? ` (Réf: ${deliveryRef})` : '';
    const msg  = `${title} — Lead ${name}${ref}`;
    const io   = getIO(req);
    const meta = { leadId: lead?._id ?? null, leadName: name, deliveryRef: deliveryRef ?? null };

    const leaders = await getSalesLeaders();
    await notifyMany(io, leaders.map((l) => l._id), {
      sentBy: req.user.id, type, title, message: msg, meta,
    });

    if (lead?.assignedTo) {
      await notify(io, {
        recipient: lead.assignedTo._id,
        sentBy:    req.user.id,
        type, title, message: msg, meta,
      });
    }

    res.status(201).json({ success: true, message: 'Delivery status notified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// LEADS STATISTICS
////////////////////////////////////////////////////////////
exports.getLeadStats = async (req, res) => {
  try {
    const match = { isDeleted: false };
    if (req.user.role === 'salesman') {
      match.assignedTo = new mongoose.Types.ObjectId(req.user.id);
    }

    const [stats, total] = await Promise.all([
      Lead.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.countDocuments(match),
    ]);

    res.json({ totalLeads: total, byStatus: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
