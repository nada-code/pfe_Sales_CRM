/**
 * notificationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Service centralisé pour créer des notifications en base et les émettre
 * via Socket.IO en temps réel.
 *
 * Usage :
 *   const { notify } = require('../services/notificationService');
 *   await notify(io, {
 *     recipient : userId,
 *     sentBy    : req.user.id,   // optionnel
 *     type      : 'lead_assigned',
 *     title     : 'Nouveau lead assigné',
 *     message   : `Le lead Jean Dupont vous a été assigné`,
 *     meta      : { leadId, leadName: 'Jean Dupont' },
 *   });
 */

const Notification = require('../models/Notification');

/**
 * Crée une notification en base et l'émet via Socket.IO.
 * @param {object} io      - Instance Socket.IO
 * @param {object} payload - Données de la notification
 * @returns {Promise<Notification>}
 */
async function notify(io, payload) {
  try {
    const notif = await Notification.create(payload);

    // Émettre au destinataire spécifique
    if (io && payload.recipient) {
      io.emit(`notification:${payload.recipient.toString()}`, {
        type:    payload.type,
        payload: notif,
      });
    }

    return notif;
  } catch (err) {
    // Non bloquant : log l'erreur mais ne fait pas échouer l'action principale
    console.error('[NotifService]', err.message);
    return null;
  }
}

/**
 * Envoie la même notification à plusieurs destinataires.
 * @param {object}   io         - Instance Socket.IO
 * @param {string[]} recipients - Tableau d'IDs
 * @param {object}   payload    - Données communes (sans recipient)
 */
async function notifyMany(io, recipients, payload) {
  const docs = recipients.map((r) => ({ ...payload, recipient: r }));
  try {
    const notifs = await Notification.insertMany(docs);
    if (io) {
      notifs.forEach((n) => {
        io.emit(`notification:${n.recipient.toString()}`, {
          type:    n.type,
          payload: n,
        });
      });
    }
    return notifs;
  } catch (err) {
    console.error('[NotifService.notifyMany]', err.message);
    return [];
  }
}

module.exports = { notify, notifyMany };
