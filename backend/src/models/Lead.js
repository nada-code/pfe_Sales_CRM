const mongoose = require('mongoose');

// ── History sub-schema ────────────────────────────────────────────────────────
const historySchema = new mongoose.Schema(
  {
    action:  {
      type: String,
      enum: ['created','info_updated','status_changed','assigned','unassigned',
             'note_added','call_scheduled','call_completed'],
      required: true,
    },
    by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at:      { type: Date, default: Date.now },
    from:    String,   // statut précédent ou ancienne valeur
    to:      String,   // nouveau statut ou nouvelle valeur
    fields:  [String], // champs modifiés (info_updated)
    preview: String,   // aperçu de la note (note_added)
  },
  { _id: false }
);

// ── Lead schema ───────────────────────────────────────────────────────────────
const leadSchema = new mongoose.Schema(
  {
    // ── Informations personnelles ──────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format'],
    },

    // ── Localisation ──────────────────────────────────────────────────────
    address:    String,
    city:       String,
    region:     String,
    postalCode: String,
    country:    { type: String, default: 'Tunisie' },

    // ── Catégorisation ────────────────────────────────────────────────────
    source: {
      type: String,
      enum: ['Website', 'Referral', 'Phone', 'Email', 'Social Media', 'Other'],
      default: 'Other',
    },
  

    // ── Statut commercial ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Interested', 'NotInterested', 'DealClosed', 'Lost'],
      default: 'New',
    },
    statusChangedAt: Date,
    statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Attribution ───────────────────────────────────────────────────────
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Gestion des appels ────────────────────────────────────────────────
    nextCallAt:   Date,
    lastCalledAt: Date,
    callsCount:   { type: Number, default: 0 },

    // ── Notes ─────────────────────────────────────────────────────────────
    notes: [
      {
        content:   String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ── Historique ────────────────────────────────────────────────────────
    history: [historySchema],

    // ── Métadonnées ───────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

// ── Index ─────────────────────────────────────────────────────────────────────
leadSchema.index({ email:      1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ status:     1 });
leadSchema.index({ source:     1 });
leadSchema.index({ nextCallAt: 1 });
leadSchema.index({ createdAt:  1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ isDeleted:  1 });

module.exports = mongoose.model('Lead', leadSchema);