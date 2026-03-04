const mongoose = require('mongoose');
const leadSchema = new mongoose.Schema(
  {
    // leadNumber: {
    //   type: String,
    //   unique: true,
    //   sparse: true,
    // },

    // Informations personnelles
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
      // required: [true, 'Email is required'],
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      required: [true, 'Phone number is required'],
      type: String,
      match: [/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format'],
    },


    // Localisation
    address: String,
    city: String,
    region: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Tunisie',
    },

    // Catégorisation
    source: {
      type: String,
      enum: ['Website', 'Referral', 'Phone', 'Email', 'Social Media', 'Other'],
      default: 'Other',
    },

    // Statut commercial
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Interested', 'NotInterested', 'DealClosed', 'Lost'],
      default: 'New',
    },
    statusChangedAt: Date,
    statusChangedBy: mongoose.Schema.Types.ObjectId,

    // Attribution
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: Date,
    assignedBy: mongoose.Schema.Types.ObjectId,

    // Notes et commentaires
    notes: [
      {
        content: String,
        createdBy: mongoose.Schema.Types.ObjectId,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Métadonnées
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index pour optimiser les requêtes
leadSchema.index({ email: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ isDeleted: 1 });

// leadSchema.pre('save', async function () {
//   if (this.isNew && !this.leadNumber) {
//     const count = await mongoose.model('Lead').countDocuments();
//     this.leadNumber = `#${String(count + 1).padStart(5, '0')}`;  // → #00001
//   }
// });

module.exports = mongoose.model('Lead', leadSchema);