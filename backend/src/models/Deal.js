const mongoose = require('mongoose');

/**
 * Deal
 * ─────────────────────────────────────────────────────────────
 * Créé automatiquement quand un Lead passe à DealClosed.
 * Cycle de vie : En_Attente → Confirmé → (crée une Commande)
 *                           → Annulé
 * Relation : Lead 1──1 Deal
 * ─────────────────────────────────────────────────────────────
 */
const dealSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      unique: true,   // 1 deal par lead
      index: true,
    },

    status: {
      type: String,
      enum: ['En_Attente', 'Confirmé', 'Annulé'],
      default: 'En_Attente',
      index: true,
    },

    // CXP qui a traité ce deal
    handledBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt:  { type: Date, default: null },

    cancelledBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt:     { type: Date, default: null },
    cancellationNote: { type: String, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

dealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Deal', dealSchema);
