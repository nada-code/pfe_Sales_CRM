import { useState } from 'react';
import { createLead } from '../../api/leadsApi';
import {  SOURCE_CFG} from '../../config/leadsConfig';
import { toast } from 'react-toastify';

const DEFAULT_FORM = {
  firstName: '', lastName:  '', email: '', phone: '',
  city: '', country: 'Tunisie',
  status: 'New', source: 'Other'
};

export default function NewLeadModal({ onClose, onCreated }) {
  const [form,   setForm]   = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    setErr('');
    if (!form.firstName || !form.lastName || !form.phone) {
      const msg = 'Prénom, nom et téléphone sont requis.';
      setErr(msg); toast.error(msg); return;
    }
    setSaving(true);
    try {
      const response = await createLead(form);
      toast.success(response.message || 'Lead créé avec succès');
      onCreated(response.data);
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Erreur lors de la création';
      setErr(msg); toast.error(msg, { autoClose: 2500, pauseOnHover: false });
    } finally {
      setSaving(false);
    }
  }

  const TEXT_FIELDS = [
    { f: 'firstName', l: 'Prénom *' },
    { f: 'lastName',  l: 'Nom *'    },
    { f: 'email',     l: 'Email',   span: 2 },
    { f: 'phone',     l: 'Téléphone *', span: 2 },
    { f: 'city',      l: 'Ville'    },
    { f: 'country',   l: 'Pays'     },
    { f: 'status',    l: 'Statut'   },
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--md">
        <div className="modal__header">
          <div className="modal__title">Nouveau Lead</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          <div className="form-grid">
            {TEXT_FIELDS.map(({ f, l, span }) => (
              <div key={f} className={span === 2 ? 'form-grid__full' : ''}>
                <label className="form-label">{l}</label>
                <input className="form-input" value={form[f]}
                  onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}

            {/* Status */}
            {/* <div>
              <label className="form-label">Statut</label>
              <select className="form-input" value={form.status}  onChange={(e) => set('status', e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div> */}

            {/* Source */}
            <div>
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={(e) => set('source', e.target.value)}>
                {Object.entries(SOURCE_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>

            {err && <div className="form-error form-grid__full">{err}</div>}
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}
            onClick={submit} disabled={saving}>
            {saving ? 'Création…' : '+ Créer le lead'}
          </button>
        </div>
      </div>
    </div>
  );
}