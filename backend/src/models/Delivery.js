const mongoose = require('mongoose');

/**
 * Delivery
 * ─────────────────────────────────────────────────────────────
 * Créée quand une Commande est confirmée et expédiée.
 * Cycle : En_Preparation → En_Transit → Livré
 *                                     → Echoué
 * Relation : Commande 1──1 Delivery (1-N si réexpédition future)
 * ─────────────────────────────────────────────────────────────
 */
const deliverySchema = new mongoose.Schema(
  {
    commande: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commande',
      required: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    company: {
      type: String,
      enum: ['aramex', 'dhl', 'colissimo', 'laposte'],
      required: true,
    },

    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['En_Preparation', 'En_Transit', 'Livré', 'Echoué'],
      default: 'En_Preparation',
      index: true,
    },

    estimatedDeliveryAt: { type: Date, default: null },
    lastTrackedAt:       { type: Date, default: null },
    deliveredAt:         { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

deliverySchema.index({ status: 1, createdAt: -1 });
deliverySchema.index({ commande: 1, status: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
