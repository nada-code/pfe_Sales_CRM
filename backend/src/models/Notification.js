const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    sentBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    type: {
      type: String,
      enum: [
        // ── Sales Leader reçoit ───────────────────────────────────
        'lead_status_updated',          // salesman change statut → leaders
        'deal_closed_alert',            // salesman Deal Closed → leaders
        'lead_edited_by_salesman',      // salesman édite infos lead → leaders  ★ NOUVEAU
        'note_added_to_leader',         // salesman/CXP ajoute une note → leaders  ★ NOUVEAU
        'problem_reported',             // salesman/CXP signale un pb → leaders
        'overdue_leads_reminder',       // leads sans appel X jours → leaders
        'objective_reached',            // objectif atteint
        'objective_missed',             // objectif non atteint

        // ── Salesman reçoit ───────────────────────────────────────
        'lead_assigned',                // nouveau lead assigné → salesman
        'lead_unassigned',              // lead retiré → salesman
        'lead_edited_by_leader',        // leader édite lead → salesman  ★ NOUVEAU (remplace lead_status_changed_by_leader)
        'lead_deleted_by_leader',       // leader supprime lead → salesman  ★ NOUVEAU
        'lead_status_changed_by_leader',// leader change statut → salesman
        'note_added',                   // leader ajoute note → salesman
        'call_reminder',                // rappel appel quotidien

        // ── CXP reçoit ────────────────────────────────────────────
        'deal_to_confirm',
        'delivery_sent',
        'delivery_in_progress',
        'delivery_success',
        'delivery_failed',

        'general',
      ],
      default: 'general',
      index:   true,
    },

    title:   { type: String, required: true },
    message: { type: String, required: true },

    meta: {
      leadId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
      leadName:     { type: String, default: null },
      leadStatus:   { type: String, default: null },
      salesmanName: { type: String, default: null },
      leadsCount:   { type: Number, default: 0 },
      leadIds:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
      deliveryRef:  { type: String, default: null },
      extra:        { type: mongoose.Schema.Types.Mixed, default: null },
    },

    read:   { type: Boolean, default: false, index: true },
    readAt: { type: Date,    default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
