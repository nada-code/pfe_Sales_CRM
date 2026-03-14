const mongoose = require('mongoose');

/**
 * Commande
 * ─────────────────────────────────────────────────────────────
 * Créée quand un Deal passe à "Confirmé".
 * Cycle : En_Attente → Confirmé → En_Preparation → En_Transit → Livré
 * Relation : Deal 1──1 Commande
 *            Commande 1──1 Delivery (après confirmation)
 * ─────────────────────────────────────────────────────────────
 */
const commandeSchema = new mongoose.Schema(
  {
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
      unique: true,   // 1 commande par deal
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['En_Attente', 'Confirmé', 'En_Preparation', 'En_Transit', 'Livré'],
      default: 'En_Attente',
      index: true,
    },

    // Code de recharge — généré serveur lors de la confirmation
    rechargeCode:        { type: String, default: null },
    rechargeGeneratedAt: { type: Date,   default: null },
    rechargeGeneratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

commandeSchema.index({ status: 1, createdAt: -1 });
commandeSchema.index({ lead:   1, status: 1 });

module.exports = mongoose.model('Commande', commandeSchema);
