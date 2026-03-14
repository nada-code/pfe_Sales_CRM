/**
 * cxpController.js
 * ─────────────────────────────────────────────────────────────────
 * Architecture 4 modèles :
 *   Lead (DealClosed) → Deal → Commande → Delivery
 *
 * Endpoints :
 *   GET  /cxp/stats
 *   GET  /cxp/deals                         — leads DealClosed + leur deal
 *   GET  /cxp/deals/:leadId                 — détail complet lead+deal+commande+delivery
 *   POST /cxp/deals/:leadId/confirm         — confirmer le Deal (crée Deal si absent)
 *   PUT  /cxp/deals/:leadId/cancel          — annuler le Deal
 *   POST /cxp/deals/:leadId/commande        — créer la Commande (Deal doit être Confirmé)
 *   PUT  /cxp/deals/:leadId/commande/status — changer statut Commande
 *   POST /cxp/deals/:leadId/commande/regen-code
 *   POST /cxp/deals/:leadId/delivery        — créer Delivery (Commande doit être Confirmée)
 *   PUT  /cxp/deals/:leadId/delivery/track  — tracker / mettre à jour Delivery
 *   GET  /cxp/deliveries                    — toutes les livraisons
 * ─────────────────────────────────────────────────────────────────
 */

const crypto   = require('crypto');
const mongoose = require('mongoose');
const Lead     = require('../models/Lead');
const Deal     = require('../models/Deal');
const Commande = require('../models/Commande');
const Delivery = require('../models/Delivery');
const User     = require('../models/User');
const { notify, notifyMany } = require('../services/notificationService');

const getIO           = (req) => req.app.get('io');
const fullName        = (l)   => `${l.firstName} ${l.lastName}`;
const senderName      = (u)   => `${u.firstName} ${u.lastName}`;
const getSalesLeaders = ()    => User.find({ role: 'sales_leader', isActive: true }).select('_id');
const isValidId       = (id)  => id && /^[a-f\d]{24}$/i.test(String(id));

// ── Code recharge ─────────────────────────────────────────────────────────────
function generateRechargeCode(leadId) {
  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const idPart  = String(leadId).slice(-4).toUpperCase();
  let rand = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) rand += CHARSET[bytes[i] % CHARSET.length];
  const hmac = crypto
    .createHmac('sha256', process.env.RECHARGE_SECRET || 'cxp-secret')
    .update(idPart + rand).digest('hex');
  return `RC-${idPart}-${rand}-${(hmac[0] + hmac[1]).toUpperCase()}`;
}

// ── Fake delivery API ─────────────────────────────────────────────────────────
const COMPANIES = {
  aramex:    { name: 'Aramex',    prefix: 'ARX' },
  dhl:       { name: 'DHL',       prefix: 'DHL' },
  colissimo: { name: 'Colissimo', prefix: 'COL' },
  laposte:   { name: 'La Poste',  prefix: 'LAP' },
};

async function fakeCreateShipment(company, leadId) {
  const co = COMPANIES[company];
  const rand = crypto.randomBytes(5).toString('hex').toUpperCase();
  return {
    trackingNumber:      `${co.prefix}-${String(leadId).slice(-4).toUpperCase()}-${rand}`,
    estimatedDeliveryAt: new Date(Date.now() + 48 * 3600 * 1000),
  };
}

async function fakeTrackShipment(trackingNumber) {
  const statuses = ['En_Preparation', 'En_Transit', 'Livré'];
  return { status: statuses[trackingNumber.charCodeAt(trackingNumber.length - 1) % 3] };
}

// ── Guard : lead DealClosed valide ────────────────────────────────────────────
async function getLeadOrFail(leadId, res) {
  if (!isValidId(leadId)) {
    res.status(400).json({ message: 'ID lead invalide' });
    return null;
  }
  const lead = await Lead.findOne({ _id: leadId, status: 'DealClosed', isDeleted: false })
    .populate('assignedTo', 'firstName lastName email');
  if (!lead) {
    res.status(404).json({ message: 'Lead DealClosed introuvable' });
    return null;
  }
  return lead;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /cxp/stats
// ─────────────────────────────────────────────────────────────────────────────
exports.getCxpStats = async (req, res) => {
  try {
    const [
      totalDeals,
      dealsEnAttente,
      dealsConfirmes,
      dealsAnnules,
      commandesEnAttente,
      commandesConfirmees,
      commandesEnPrep,
      commandesEnTransit,
      commandesLivrees,
      livraisonsEnTransit,
      livraisonsLivrees,
      livraisonsEchouees,
    ] = await Promise.all([
      Deal.countDocuments(),
      Deal.countDocuments({ status: 'En_Attente' }),
      Deal.countDocuments({ status: 'Confirmé' }),
      Deal.countDocuments({ status: 'Annulé' }),
      Commande.countDocuments({ status: 'En_Attente' }),
      Commande.countDocuments({ status: 'Confirmé' }),
      Commande.countDocuments({ status: 'En_Preparation' }),
      Commande.countDocuments({ status: 'En_Transit' }),
      Commande.countDocuments({ status: 'Livré' }),
      Delivery.countDocuments({ status: 'En_Transit' }),
      Delivery.countDocuments({ status: 'Livré' }),
      Delivery.countDocuments({ status: 'Echoué' }),
    ]);

    res.json({
      deals:     { total: totalDeals, enAttente: dealsEnAttente, confirmes: dealsConfirmes, annules: dealsAnnules },
      commandes: { enAttente: commandesEnAttente, confirmes: commandesConfirmees, enPreparation: commandesEnPrep, enTransit: commandesEnTransit, livrees: commandesLivrees },
      livraisons: { enTransit: livraisonsEnTransit, livrees: livraisonsLivrees, echouees: livraisonsEchouees },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /cxp/deals  — liste leads DealClosed + deal associé
// ─────────────────────────────────────────────────────────────────────────────
exports.getDeals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, assignedTo, dealStatus, dateFrom, dateTo } = req.query;

    const query = { status: 'DealClosed', isDeleted: false };
    if (assignedTo) query.assignedTo = assignedTo;
    if (dateFrom || dateTo) {
      query.statusChangedAt = {};
      if (dateFrom) query.statusChangedAt.$gte = new Date(dateFrom);
      if (dateTo)   query.statusChangedAt.$lte = new Date(new Date(dateTo).setHours(23,59,59,999));
    }
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      query.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'firstName lastName')
        .select('-history -notes')
        .sort({ statusChangedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Lead.countDocuments(query),
    ]);

    // Attacher le deal + commande à chaque lead en une requête groupée
    const leadIds = leads.map(l => l._id);
    const [deals, commandes] = await Promise.all([
      Deal.find({ lead: { $in: leadIds } }),
      Commande.find({ lead: { $in: leadIds } }).select('deal status rechargeCode'),
    ]);

    const dealMap     = Object.fromEntries(deals.map(d => [String(d.lead), d]));
    const commandeMap = Object.fromEntries(commandes.map(c => [String(c.deal), c]));

    // Filtrer par dealStatus si demandé (post-requête — leads sans deal = En_Attente)
    let data = leads.map(l => {
      const deal     = dealMap[String(l._id)] || null;
      const commande = deal ? (commandeMap[String(deal._id)] || null) : null;
      return { ...l.toObject(), deal, commande };
    });

    if (dealStatus) {
      data = data.filter(d => (d.deal?.status || 'En_Attente') === dealStatus);
    }

    res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /cxp/deals/:leadId  — détail complet
// ─────────────────────────────────────────────────────────────────────────────
exports.getDealById = async (req, res) => {
  try {
    if (!isValidId(req.params.leadId)) return res.status(400).json({ message: 'ID invalide' });

    const lead = await Lead.findOne({ _id: req.params.leadId, isDeleted: false })
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy',  'firstName lastName');
    if (!lead) return res.status(404).json({ message: 'Lead introuvable' });

    const deal = await Deal.findOne({ lead: lead._id })
      .populate('handledBy',   'firstName lastName')
      .populate('cancelledBy', 'firstName lastName');

    const commande = deal
      ? await Commande.findOne({ deal: deal._id })
          .populate('confirmedBy',         'firstName lastName')
          .populate('rechargeGeneratedBy', 'firstName lastName')
      : null;

    const delivery = commande
      ? await Delivery.findOne({ commande: commande._id }).sort({ createdAt: -1 })
      : null;

    res.json({ lead, deal, commande, delivery });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /cxp/deals/:leadId/confirm
// Confirme le Deal (le crée s'il n'existe pas encore).
// Crée automatiquement une Commande associée.
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmDeal = async (req, res) => {
  try {
    const lead = await getLeadOrFail(req.params.leadId, res);
    if (!lead) return;

    const now = new Date();
    const io  = getIO(req);

    // Créer ou récupérer le Deal
    let deal = await Deal.findOne({ lead: lead._id });

    if (deal?.status === 'Annulé') {
      return res.status(400).json({ message: 'Ce deal a été annulé. Impossible de le confirmer.' });
    }
    if (deal?.status === 'Confirmé') {
      const commande = await Commande.findOne({ deal: deal._id });
      return res.json({ message: 'Déjà confirmé', deal, commande });
    }

    // Créer le Deal confirmé
    if (!deal) {
      deal = await Deal.create({
        lead:      lead._id,
        status:    'Confirmé',
        handledBy: req.user.id,
        handledAt: now,
        createdBy: req.user.id,
      });
    } else {
      deal.status    = 'Confirmé';
      deal.handledBy = req.user.id;
      deal.handledAt = now;
      await deal.save();
    }

    // Créer la Commande (En_Attente — le CXP devra la confirmer ensuite)
    const commande = await Commande.create({
      deal:      deal._id,
      lead:      lead._id,
      status:    'En_Attente',
      createdBy: req.user.id,
    });

    // Historique lead
    lead.history.push({ action: 'order_confirmed', by: req.user.id, at: now, to: 'Confirmé' });
    await lead.save();

    io.emit('deal:updated', { leadId: lead._id, deal, commande });

    // Notifier le salesman
    if (lead.assignedTo) {
      await notify(io, {
        recipient: lead.assignedTo._id,
        sentBy:    req.user.id,
        type:      'deal_confirmed',
        title:     '✅ Deal confirmé',
        message:   `Le deal de ${fullName(lead)} a été confirmé par CXP. Une commande a été créée.`,
        meta:      { leadId: lead._id },
      });
    }

    res.status(201).json({ message: 'Deal confirmé, commande créée', deal, commande });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /cxp/deals/:leadId/cancel
// Body: { note: 'raison optionnelle' }
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelDeal = async (req, res) => {
  try {
    const lead = await getLeadOrFail(req.params.leadId, res);
    if (!lead) return;

    let deal = await Deal.findOne({ lead: lead._id });
    if (!deal) {
      deal = await Deal.create({ lead: lead._id, status: 'En_Attente', createdBy: req.user.id });
    }
    if (deal.status === 'Annulé') {
      return res.status(400).json({ message: 'Deal déjà annulé' });
    }

    const now = new Date();
    deal.status           = 'Annulé';
    deal.cancelledBy      = req.user.id;
    deal.cancelledAt      = now;
    deal.cancellationNote = req.body.note || '';
    await deal.save();

    lead.history.push({ action: 'order_status_changed', by: req.user.id, at: now, from: deal.status, to: 'Annulé' });
    await lead.save();

    getIO(req).emit('deal:updated', { leadId: lead._id, deal });
    res.json({ message: 'Deal annulé', deal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /cxp/deals/:leadId/commande/status
// Body: { status: 'Confirmé' | 'En_Preparation' | 'En_Transit' | 'Livré' }
// ─────────────────────────────────────────────────────────────────────────────
exports.updateCommandeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ALLOWED = ['En_Attente', 'Confirmé', 'En_Preparation', 'En_Transit', 'Livré'];
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ message: `Statut invalide. Valeurs: ${ALLOWED.join(', ')}` });
    }

    const lead = await getLeadOrFail(req.params.leadId, res);
    if (!lead) return;

    const deal = await Deal.findOne({ lead: lead._id, status: 'Confirmé' });
    if (!deal) return res.status(404).json({ message: 'Aucun deal confirmé pour ce lead' });

    const commande = await Commande.findOne({ deal: deal._id });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });

    const prev = commande.status;
    const now  = new Date();

    commande.status = status;

    // Quand on confirme la commande → générer automatiquement le code de recharge
    if (status === 'Confirmé') {
      if (!commande.confirmedBy) {
        commande.confirmedBy = req.user.id;
        commande.confirmedAt = now;
      }
      // Générer le code si pas encore fait (idempotent)
      if (!commande.rechargeCode) {
        commande.rechargeCode        = generateRechargeCode(lead._id);
        commande.rechargeGeneratedAt = now;
        commande.rechargeGeneratedBy = req.user.id;
        lead.history.push({
          action: 'recharge_code_generated',
          by: req.user.id, at: now,
          preview: commande.rechargeCode,
        });
      }
    }

    await commande.save();

    lead.history.push({ action: 'order_status_changed', by: req.user.id, at: now, from: prev, to: status });
    await lead.save();

    getIO(req).emit('commande:updated', { leadId: lead._id, commande });
    res.json({ message: 'Statut commande mis à jour', commande });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /cxp/deals/:leadId/commande/regen-code
// ─────────────────────────────────────────────────────────────────────────────
exports.regenRechargeCode = async (req, res) => {
  try {
    const lead = await getLeadOrFail(req.params.leadId, res);
    if (!lead) return;

    const deal     = await Deal.findOne({ lead: lead._id, status: 'Confirmé' });
    if (!deal) return res.status(404).json({ message: 'Aucun deal confirmé' });

    const commande = await Commande.findOne({ deal: deal._id });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });

    const code = generateRechargeCode(lead._id);
    const now  = new Date();

    commande.rechargeCode        = code;
    commande.rechargeGeneratedAt = now;
    commande.rechargeGeneratedBy = req.user.id;
    await commande.save();

    lead.history.push({ action: 'recharge_code_regenerated', by: req.user.id, at: now, preview: code });
    await lead.save();

    getIO(req).emit('commande:updated', { leadId: lead._id, commande });
    res.json({ message: 'Code régénéré', rechargeCode: code, commande });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /cxp/deals/:leadId/delivery
// Body: { company: 'aramex'|'dhl'|'colissimo'|'laposte' }
// La commande doit être "Confirmé" pour créer une livraison.
// ─────────────────────────────────────────────────────────────────────────────
exports.createDelivery = async (req, res) => {
  try {
    const { company } = req.body;
    if (!COMPANIES[company]) {
      return res.status(400).json({ message: `Société invalide. Valeurs: ${Object.keys(COMPANIES).join(', ')}` });
    }

    const lead = await getLeadOrFail(req.params.leadId, res);
    if (!lead) return;

    const deal = await Deal.findOne({ lead: lead._id, status: 'Confirmé' });
    if (!deal) return res.status(400).json({ message: 'Le deal doit être confirmé avant de créer une livraison' });

    const commande = await Commande.findOne({ deal: deal._id });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });

    // La commande doit être au moins confirmée (pas encore en attente)
    const COMMANDE_READY = ['Confirmé', 'En_Preparation', 'En_Transit', 'Livré'];
    if (!COMMANDE_READY.includes(commande.status)) {
      return res.status(400).json({
        message: `La commande doit être confirmée avant de créer une livraison (statut actuel: ${commande.status})`,
      });
    }

    // Vérifier qu'il n'y a pas déjà une livraison active
    const existing = await Delivery.findOne({ commande: commande._id, status: { $in: ['En_Preparation', 'En_Transit'] } });
    if (existing) {
      return res.status(400).json({ message: 'Une livraison est déjà en cours', trackingNumber: existing.trackingNumber });
    }

    const { trackingNumber, estimatedDeliveryAt } = await fakeCreateShipment(company, lead._id);
    const now = new Date();

    const delivery = await Delivery.create({
      commande:            commande._id,
      lead:                lead._id,
      company,
      trackingNumber,
      status:              'En_Preparation',
      estimatedDeliveryAt,
      lastTrackedAt:       now,
      createdBy:           req.user.id,
    });

    // Passer la commande en En_Preparation
    commande.status = 'En_Preparation';
    await commande.save();

    lead.history.push({ action: 'delivery_created', by: req.user.id, at: now, preview: `${company} — ${trackingNumber}` });
    await lead.save();

    const io = getIO(req);
    io.emit('delivery:created', { leadId: lead._id, delivery, commande });

    // Notifier salesman + leaders
    const [leaders] = await Promise.all([getSalesLeaders()]);
    const notifPayload = {
      sentBy:  req.user.id,
      type:    'delivery_created',
      title:   '📦 Colis créé',
      message: `Colis créé pour ${fullName(lead)} — ${company.toUpperCase()} ${trackingNumber}`,
      meta:    { leadId: lead._id, trackingNumber },
    };
    await notifyMany(io, leaders.map(l => l._id), notifPayload);
    if (lead.assignedTo) await notify(io, { ...notifPayload, recipient: lead.assignedTo._id });

    res.status(201).json({ message: 'Livraison créée', trackingNumber, delivery, commande });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /cxp/deals/:leadId/delivery/track
// Body: { status? } — si absent, auto-tracking via API courrier
// ─────────────────────────────────────────────────────────────────────────────
exports.trackDelivery = async (req, res) => {
  try {
    const lead = await getLeadOrFail(req.params.leadId, res);
    if (!lead) return;

    const delivery = await Delivery.findOne({ lead: lead._id }).sort({ createdAt: -1 });
    if (!delivery) return res.status(404).json({ message: 'Aucune livraison trouvée pour ce lead' });

    const ALLOWED = ['En_Preparation', 'En_Transit', 'Livré', 'Echoué'];
    let newStatus;

    if (req.body?.status) {
      if (!ALLOWED.includes(req.body.status)) {
        return res.status(400).json({ message: `Statut invalide. Valeurs: ${ALLOWED.join(', ')}` });
      }
      newStatus = req.body.status;
    } else {
      const tracked = await fakeTrackShipment(delivery.trackingNumber);
      newStatus = tracked.status;
    }

    const prev = delivery.status;
    const now  = new Date();

    delivery.status        = newStatus;
    delivery.lastTrackedAt = now;
    if (newStatus === 'Livré') delivery.deliveredAt = now;
    await delivery.save();

    // Synchroniser la Commande avec le statut de la livraison
    const commande = await Commande.findById(delivery.commande);
    if (commande) {
      if (newStatus === 'En_Transit') commande.status = 'En_Transit';
      if (newStatus === 'Livré')      commande.status = 'Livré';

      // Livraison échouée → commande repasse à 'Confirmé'
      // pour permettre au CXP de créer une nouvelle livraison (réexpédition)
      if (newStatus === 'Echoué') commande.status = 'Confirmé';

      await commande.save();
    }

    lead.history.push({ action: 'delivery_status_changed', by: req.user.id, at: now, from: prev, to: newStatus });
    await lead.save();

    const io = getIO(req);
    io.emit('delivery:updated', { leadId: lead._id, delivery, commande });

    // Notifier sur changements importants
    if (newStatus !== prev) {
      const titleMap = { 'En_Transit': '🚚 Colis expédié', 'Livré': '✅ Livré !', 'Echoué': '❌ Livraison échouée' };
      if (titleMap[newStatus]) {
        const notifPayload = {
          sentBy:  req.user.id,
          type:    'delivery_status_changed',
          title:   titleMap[newStatus],
          message: `${fullName(lead)} — ${titleMap[newStatus]}`,
          meta:    { leadId: lead._id, trackingNumber: delivery.trackingNumber },
        };
        // Toujours notifier le salesman
        if (lead.assignedTo) {
          await notify(io, { ...notifPayload, recipient: lead.assignedTo._id });
        }
        // Sur échec → notifier aussi les Sales Leaders pour qu'ils puissent agir
        if (newStatus === 'Echoué') {
          const leaders = await getSalesLeaders();
          await notifyMany(io, leaders.map(l => l._id), {
            ...notifPayload,
            title:   '❌ Livraison échouée — action requise',
            message: `La livraison du lead ${fullName(lead)} a échoué. Une réexpédition est nécessaire.`,
          });
        }
      }
    }

    res.json({ message: 'Livraison mise à jour', status: newStatus, delivery, commande });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /cxp/deliveries — toutes les livraisons avec lead + commande
// ─────────────────────────────────────────────────────────────────────────────
exports.getDeliveries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate({ path: 'lead',     select: 'firstName lastName phone city' })
        .populate({ path: 'commande', select: 'status rechargeCode' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Delivery.countDocuments(query),
    ]);

    res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), data: deliveries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};