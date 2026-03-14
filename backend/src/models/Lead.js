const mongoose = require('mongoose');

// ── History sub-schema ────────────────────────────────────────────────────────
const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'created', 'info_updated', 'status_changed', 'assigned', 'unassigned',
        'note_added', 'call_scheduled', 'call_completed',
        'order_confirmed', 'order_status_changed',
        'recharge_code_generated', 'recharge_code_regenerated',
        'delivery_created', 'delivery_status_changed',
      ],
      required: true,
    },
    by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at:      { type: Date, default: Date.now },
    from:    String,
    to:      String,
    fields:  [String],
    preview: String,
  },
  { _id: false }
);

// ── Lead schema ───────────────────────────────────────────────────────────────
const leadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName:  { type: String, required: [true, 'Last name is required'],  trim: true },
    email: {
      type: String, lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    phone: {
      type: String, required: [true, 'Phone is required'],
      match: [/^[\d\s\-\+\(\)]+$/, 'Invalid phone'],
    },
    address:    String,
    city:       String,
    region:     String,
    postalCode: String,
    country:    { type: String, default: 'Tunisie' },
    source: {
      type:    String,
      enum:    ['Website', 'Referral', 'Phone', 'Email', 'Social Media', 'Other'],
      default: 'Other',
    },
    status: {
      type:    String,
      enum:    ['New', 'Contacted', 'Interested', 'NotInterested', 'DealClosed', 'Lost'],
      default: 'New',
    },
    statusChangedAt: Date,
    statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nextCallAt:   Date,
    lastCalledAt: Date,
    callsCount:   { type: Number, default: 0 },
    notes: [{
      content:   { type: String, required: true, maxlength: 2000 },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    }],
    history:   [historySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

leadSchema.index({ email: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ nextCallAt: 1 });
leadSchema.index({ createdAt: 1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ isDeleted: 1 });
leadSchema.index({ statusChangedAt: 1 });

module.exports = mongoose.model('Lead', leadSchema);
