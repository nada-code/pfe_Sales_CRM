const Lead     = require('../models/Lead');
const User     = require('../models/User');
const mongoose = require('mongoose');

// Helper — get io instance
const getIO = (req) => req.app.get('io');

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
    const { page = 1, limit = 10, search, status, source, assignedTo } = req.query;

    const query = { isDeleted: false };

    if (status) query.status = status;
    if (source) query.source = source;

    // Salesmen only see their own leads
    if (req.user.role === 'salesman') {
      query.assignedTo = req.user.id;
    } else if (assignedTo === 'null') {
      query.assignedTo = null;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
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
        .sort({ createdAt: -1 }),
      Lead.countDocuments(query),
    ]);

    res.json({ total, page: Number(page), pages: Math.ceil(total / limit), data: leads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// UPDATE LEAD
////////////////////////////////////////////////////////////
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    ).populate('assignedTo', 'firstName lastName');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    getIO(req).emit('lead:updated', lead);

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// DELETE LEAD
////////////////////////////////////////////////////////////
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    getIO(req).emit('lead:deleted', { _id: req.params.id });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// ASSIGN LEAD TO SALESMAN
////////////////////////////////////////////////////////////
exports.assignLead = async (req, res) => {
  try {
    const { salesmanId } = req.body;

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

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// CHANGE STATUS
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

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

////////////////////////////////////////////////////////////
// ADD NOTE
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

    res.status(200).json({ success: true, data: lead });
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