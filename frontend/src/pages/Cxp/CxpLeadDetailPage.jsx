import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addNote as apiAddNote, updateLead } from '../../api/leadsApi';
import {
  fetchDealById,
  confirmDeal, cancelDeal,
  updateCommandeStatus, regenRechargeCode,
  createDelivery, trackDelivery,
} from '../../api/cxpApi';
import { useSocket } from '../../context/SocketContext';
import { SOURCE_CFG } from '../../config/leadsConfig';
import { fmtDate, fmtTime, acolor, av2 } from '../../utils/leadsUtils';
import { Spinner } from '../../components/UI';
import {
  ArrowLeft, CheckCircle2, Package, Truck, Tag, FileText,
  RefreshCw, AlertCircle, Clock, MapPin, ChevronDown, ChevronUp,
  Edit3, Save, X, XCircle
} from 'lucide-react';
import '../../styles/CxpLeadDetail.css';

const NOTES_PREVIEW = 3;

const DELIVERY_COMPANIES = [
  { id: 'aramex',    name: 'Aramex',    logo: '🚚', color: '#e63946' },
  { id: 'dhl',       name: 'DHL',       logo: '📦', color: '#f4a261' },
  { id: 'colissimo', name: 'Colissimo', logo: '🏪', color: '#457b9d' },
  { id: 'laposte',   name: 'La Poste',  logo: '✉️', color: '#2a9d8f' },
];

const DEAL_STATUS_CFG = {
  En_Attente: { bg: '#fef9c3', color: '#854d0e', label: 'En Attente'  },
  Confirmé:   { bg: '#dcfce7', color: '#166534', label: 'Confirmé'    },
  Annulé:     { bg: '#fee2e2', color: '#991b1b', label: 'Annulé'      },
};

const CMD_STATUS_CFG = {
  En_Attente:     { bg: '#fef9c3', color: '#854d0e', label: 'En Attente'     },
  Confirmé:       { bg: '#dcfce7', color: '#166534', label: 'Confirmé'       },
  En_Preparation: { bg: '#e0f2fe', color: '#075985', label: 'En Préparation' },
  En_Transit:     { bg: '#ede9fe', color: '#5b21b6', label: 'En Transit'     },
  Livré:          { bg: '#d1fae5', color: '#065f46', label: 'Livré ✓'        },
};

const DEL_STATUS_CFG = {
  En_Preparation: { bg: '#e0f2fe', color: '#075985', label: 'En Préparation' },
  En_Transit:     { bg: '#ede9fe', color: '#5b21b6', label: 'En Transit'     },
  Livré:          { bg: '#d1fae5', color: '#065f46', label: 'Livré ✓'        },
  Echoué:         { bg: '#fee2e2', color: '#991b1b', label: 'Échoué'         },
};

function Badge({ cfg }) {
  if (!cfg) return null;
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20,
      background: cfg.bg, color: cfg.color, whiteSpace:'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function TrackingTimeline({ delivery }) {
  if (!delivery) return null;
  const steps = [
    { key: 'En_Preparation', label: 'En préparation' },
    { key: 'En_Transit',     label: 'Expédié'        },
    { key: 'Livré',          label: 'Livré'          },
  ];
  const idx = { En_Preparation: 0, En_Transit: 1, Livré: 2, Echoué: 1 };
  const cur = idx[delivery.status] ?? 0;
  return (
    <div className="cxp-det2-timeline">
      {steps.map((s, i) => (
        <div key={s.key} className={`cxp-det2-timeline__step${i<=cur?' done':''}${delivery.status==='Echoué'&&i===cur?' error':''}`}>
          <div className="cxp-det2-timeline__dot"/>
          {i < steps.length-1 && <div className="cxp-det2-timeline__line"/>}
          <div className="cxp-det2-timeline__body">
            <div className="cxp-det2-timeline__label">{s.label}</div>
            {i===cur && delivery.lastTrackedAt && (
              <div className="cxp-det2-timeline__date">
                {new Date(delivery.lastTrackedAt).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const EDITABLE_FIELDS = [
  { key:'firstName',  label:'Prénom',      type:'text',  required:true  },
  { key:'lastName',   label:'Nom',         type:'text',  required:true  },
  { key:'email',      label:'Email',       type:'email', required:false },
  { key:'phone',      label:'Téléphone',   type:'tel',   required:true  },
  { key:'address',    label:'Adresse',     type:'text',  required:false, full:true },
  { key:'city',       label:'Ville',       type:'text',  required:false },
  { key:'region',     label:'Région',      type:'text',  required:false },
  { key:'postalCode', label:'Code Postal', type:'text',  required:false },
  { key:'country',    label:'Pays',        type:'text',  required:false },
];

export default function CxpLeadDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const socket   = useSocket();

  const [tab,   setTab]   = useState('overview');
  const [data,  setData]  = useState({ lead:null, deal:null, commande:null, delivery:null });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [aL, setAL] = useState({}); // actionLoading per key
  const [aMsg,  setAMsg]  = useState('');
  const [aErr,  setAErr]  = useState('');

  const [selCompany,    setSelCompany]    = useState('aramex');
  const [cancelNote,    setCancelNote]    = useState('');
  const [noteText,      setNoteText]      = useState('');
  const [noteSaving,    setNoteSaving]    = useState(false);
  const [noteError,     setNoteError]     = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const noteRef = useRef(null);

  const [editForm,    setEditForm]    = useState({});
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchDealById(id);
      setData(res);
      if (res.lead) setEditForm({
        firstName:  res.lead.firstName  || '',
        lastName:   res.lead.lastName   || '',
        email:      res.lead.email      || '',
        phone:      res.lead.phone      || '',
        address:    res.lead.address    || '',
        city:       res.lead.city       || '',
        region:     res.lead.region     || '',
        postalCode: res.lead.postalCode || '',
        country:    res.lead.country    || 'Tunisie',
      });
    } catch(e) {
      setError(e?.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const h = (e) => { if (String(e.leadId) === id) load(true); };
    socket.on('deal:updated',     h);
    socket.on('commande:updated', h);
    socket.on('delivery:created', h);
    socket.on('delivery:updated', h);
    return () => {
      socket.off('deal:updated',     h);
      socket.off('commande:updated', h);
      socket.off('delivery:created', h);
      socket.off('delivery:updated', h);
    };
  }, [socket, id, load]);

  useEffect(() => { if (tab==='notes') setTimeout(()=>noteRef.current?.focus(),80); }, [tab]);

  // ── Action helpers ────────────────────────────────────────────────────────
  const startA = (k) => { setAL(p=>({...p,[k]:true})); setAErr(''); setAMsg(''); };
  const endA   = (k) => setAL(p=>({...p,[k]:false}));
  const showMsg = (m,ms=3500) => { setAMsg(m); setTimeout(()=>setAMsg(''),ms); };

  async function action(key, fn, successMsg) {
    startA(key);
    try {
      const res = await fn();
      // Merge returned sub-documents into state immediately (no extra round-trip)
      setData(prev => ({
        lead:     res.lead     ?? prev.lead,
        deal:     res.deal     ?? prev.deal,
        commande: res.commande ?? prev.commande,
        delivery: res.delivery ?? prev.delivery,
      }));
      showMsg(successMsg || '✓ Opération réussie');
      // Reload for any data not returned directly (e.g. history)
      await load(true);
    } catch(e) {
      setAErr(e?.response?.data?.message || e.message || 'Erreur');
    } finally { endA(key); }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    setEditSaving(true); setEditError(''); setEditSuccess('');
    if (!editForm.firstName?.trim()) { setEditError('Prénom requis'); setEditSaving(false); return; }
    if (!editForm.lastName?.trim())  { setEditError('Nom requis');    setEditSaving(false); return; }
    if (!editForm.phone?.trim())     { setEditError('Téléphone requis'); setEditSaving(false); return; }
    try {
      const updated = await updateLead(id, editForm);
      setData(prev => ({ ...prev, lead: updated }));
      setEditSuccess('✓ Informations mises à jour');
      setTimeout(() => setEditSuccess(''), 4000);
    } catch(e) {
      setEditError(e?.response?.data?.message || 'Erreur');
    } finally { setEditSaving(false); }
  }

  // ── Add note ──────────────────────────────────────────────────────────────
  async function handleAddNote() {
    if (!noteText.trim()) { setNoteError('Note vide'); return; }
    setNoteSaving(true); setNoteError('');
    try {
      await apiAddNote(id, noteText.trim());
      setNoteText('');
      load(true);
    } catch(e) {
      setNoteError(e?.response?.data?.message || 'Erreur');
    } finally { setNoteSaving(false); }
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code);
    showMsg('✓ Code copié', 2000);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div className="cxp-det2-loading"><Spinner size={32}/><span>Chargement…</span></div>;
  if (error)   return (
    <div className="cxp-det2-error">
      <AlertCircle size={18}/><span>{error}</span>
      <button className="cxp-det2-btn cxp-det2-btn--ghost" onClick={()=>navigate(-1)}>← Retour</button>
    </div>
  );

  const { lead, deal, commande, delivery } = data;
  if (!lead) return null;

  const heroColor  = acolor(lead._id);
  const sourceCfg  = SOURCE_CFG[lead.source] || SOURCE_CFG.Other;
  const dealCfg    = DEAL_STATUS_CFG[deal?.status || 'En_Attente'];
  const cmdCfg     = CMD_STATUS_CFG[commande?.status || 'En_Attente'];
  const delCfg     = DEL_STATUS_CFG[delivery?.status];
  const visNotes   = notesExpanded ? lead.notes : (lead.notes?.slice(-NOTES_PREVIEW) || []);

  const TABS = [
    { k:'overview',  label:'Aperçu',    icon:<FileText size={13}/> },
    { k:'deal',      label:'Deal',      icon:<Tag size={13}/> },
    { k:'commande',  label:'Commande',  icon:<CheckCircle2 size={13}/> },
    { k:'delivery',  label:'Livraison', icon:<Truck size={13}/> },
    { k:'edit',      label:'Modifier',  icon:<Edit3 size={13}/> },
    { k:'notes',     label:`Notes (${lead.notes?.length||0})` },
  ];

  return (
    <div className="cxp-det2-root">

      {/* ── Hero ── */}
      <div className="cxp-det2-hero" style={{'--hero':heroColor}}>
        <div className="cxp-det2-hero__blob" style={{background:heroColor}}/>
        <div className="cxp-det2-hero__inner">

          <button className="cxp-det2-back" onClick={()=>navigate('/cxp/deals')}>
            <ArrowLeft size={14}/> Deals Clôturés
          </button>

          <div className="cxp-det2-profile">
            <div className="cxp-det2-avatar" style={{background:heroColor}}>
              {`${lead.firstName?.[0]||''}${lead.lastName?.[0]||''}`.toUpperCase()}
            </div>
            <div className="cxp-det2-identity">
              <div className="cxp-det2-id">#{String(lead._id).slice(-6).toUpperCase()}</div>
              <h1 className="cxp-det2-name">{lead.firstName} {lead.lastName}</h1>
              <div className="cxp-det2-meta">{lead.email} · {lead.phone}</div>
              {lead.city && <div className="cxp-det2-meta"><MapPin size={12}/> {lead.city}{lead.country?`, ${lead.country}`:''}</div>}
              <div className="cxp-det2-badges">
                <span className="cxp-det2-badge cxp-det2-badge--closed"><CheckCircle2 size={11}/> Deal Closed</span>
                <Badge cfg={dealCfg}/>
                {commande && <Badge cfg={cmdCfg}/>}
                {delivery && <span className="cxp-det2-badge cxp-det2-badge--track"><Package size={11}/> {delivery.trackingNumber}</span>}
              </div>
            </div>
            {lead.assignedTo && (
              <div className="cxp-det2-agent">
                <div className="cxp-det2-agent__av" style={{background:acolor(lead.assignedTo._id)}}>{av2(lead.assignedTo)}</div>
                <div>
                  <div className="cxp-det2-agent__label">Salesman</div>
                  <div className="cxp-det2-agent__name">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</div>
                </div>
              </div>
            )}
          </div>

          <div className="cxp-det2-tabs">
            {TABS.map(t => (
              <button key={t.k}
                className={`cxp-det2-tab${tab===t.k?' cxp-det2-tab--active':''}`}
                onClick={()=>{setTab(t.k);setAErr('');setAMsg('');}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="cxp-det2-content">
        {aMsg && <div className="cxp-det2-success">{aMsg}</div>}
        {aErr && <div className="cxp-det2-error-msg">⚠ {aErr}</div>}

        {/* ══ APERÇU ══ */}
        {tab==='overview' && (
          <div className="cxp-det2-bento">
            <div className="cxp-det2-card cxp-det2-card--wide">
              <div className="cxp-det2-card__label">📋 Informations de contact</div>
              <div className="cxp-det2-grid">
                {[
                  {icon:'✉',  label:'Email',       value:lead.email      ||'—'},
                  {icon:'📞', label:'Téléphone',   value:lead.phone      ||'—'},
                  {icon:'🏙', label:'Ville',       value:lead.city       ||'—'},
                  {icon:'🌍', label:'Pays',        value:lead.country    ||'—'},
                  {icon:'📍', label:'Adresse',     value:lead.address    ||'—'},
                  {icon:'📮', label:'Code postal', value:lead.postalCode ||'—'},
                  {icon:'🔖', label:'Source',      value:`${sourceCfg.icon} ${sourceCfg.label}`},
                  {icon:'📅', label:'Créé le',     value:fmtDate(lead.createdAt)},
                ].map(row=>(
                  <div key={row.label} className="cxp-det2-info-row">
                    <span className="cxp-det2-info-icon">{row.icon}</span>
                    <div>
                      <div className="cxp-det2-info-label">{row.label}</div>
                      <div className="cxp-det2-info-value">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cxp-det2-card">
              <div className="cxp-det2-card__label">📊 Résumé post-vente</div>
              <div className="cxp-det2-post-sale">
                <div className="cxp-det2-post-row"><span>Deal</span><Badge cfg={dealCfg}/></div>
                {commande && <div className="cxp-det2-post-row"><span>Commande</span><Badge cfg={cmdCfg}/></div>}
                {commande?.rechargeCode && (
                  <div className="cxp-det2-post-row">
                    <span>Code recharge</span>
                    <span className="cxp-det2-code-badge">{commande.rechargeCode}</span>
                  </div>
                )}
                {delivery && (
                  <>
                    <div className="cxp-det2-post-row"><span>Livraison</span><Badge cfg={delCfg}/></div>
                    <div className="cxp-det2-post-row">
                      <span>N° colis</span>
                      <span className="cxp-det2-track-badge"><Package size={11}/> {delivery.trackingNumber}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ DEAL ══ */}
        {tab==='deal' && (
          <div className="cxp-det2-order">
            <div className="cxp-det2-section-header">
              <h2>🤝 Gestion du Deal</h2>
              <p>Confirmez ou annulez ce deal. La confirmation crée automatiquement une commande.</p>
            </div>

            <div className="cxp-det2-order-card">
              <div className="cxp-det2-order-card__title">Statut actuel du Deal</div>
              <div className="cxp-det2-order-status-row">
                <Badge cfg={dealCfg}/>
                {deal?.handledAt && <span className="cxp-det2-order-date">Traité : {new Date(deal.handledAt).toLocaleString('fr-FR')}</span>}
              </div>
            </div>

            {/* Actions selon statut */}
            {(!deal || deal.status === 'En_Attente') && (
              <div className="cxp-det2-order-card cxp-det2-order-card--highlight">
                <div className="cxp-det2-order-card__title">✅ Confirmer le Deal</div>
                <p className="cxp-det2-order-desc">
                  Après confirmation avec le client, confirmez ce deal.<br/>
                  Une <strong>Commande</strong> sera créée automatiquement.
                </p>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <button className="cxp-det2-btn cxp-det2-btn--confirm"
                    onClick={()=>action('confirm', ()=>confirmDeal(id), '✓ Deal confirmé — commande créée')}
                    disabled={aL.confirm}>
                    {aL.confirm ? <><Spinner size={14}/> Confirmation…</> : <><CheckCircle2 size={15}/> Confirmer le Deal</>}
                  </button>
                  <button className="cxp-det2-btn cxp-det2-btn--cancel"
                    onClick={()=>action('cancel', ()=>cancelDeal(id, cancelNote), '✓ Deal annulé')}
                    disabled={aL.cancel}>
                    {aL.cancel ? <><Spinner size={14}/> Annulation…</> : <><XCircle size={15}/> Annuler</>}
                  </button>
                </div>
                <div style={{marginTop:10}}>
                  <input className="cxp-det2-field__input" placeholder="Raison de l'annulation (optionnel)"
                    value={cancelNote} onChange={e=>setCancelNote(e.target.value)} style={{width:'100%',maxWidth:360}}/>
                </div>
              </div>
            )}

            {deal?.status === 'Annulé' && (
              <div className="cxp-det2-order-card" style={{borderColor:'#fecaca'}}>
                <div className="cxp-det2-order-card__title" style={{color:'#dc2626'}}>❌ Deal annulé</div>
                {deal.cancellationNote && <p className="cxp-det2-order-desc">Raison : {deal.cancellationNote}</p>}
              </div>
            )}

            {deal?.status === 'Confirmé' && (
              <div className="cxp-det2-order-card" style={{borderColor:'#bbf7d0'}}>
                <div className="cxp-det2-order-card__title" style={{color:'#059669'}}>✅ Deal confirmé</div>
                <p className="cxp-det2-order-desc">
                  Une commande a été créée. Gérez-la depuis l'onglet <strong>Commande</strong>.
                </p>
                <button className="cxp-det2-btn cxp-det2-btn--ghost"
                  onClick={()=>setTab('commande')}>
                  Voir la Commande →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ COMMANDE ══ */}
        {tab==='commande' && (
          <div className="cxp-det2-order">
            <div className="cxp-det2-section-header">
              <h2>🛒 Gestion de la Commande</h2>
              <p>Confirmez la commande, gérez le statut et le code de recharge.</p>
            </div>

            {!commande ? (
              <div className="cxp-det2-order-card">
                <div className="cxp-det2-warn">⚠ Aucune commande. Confirmez d'abord le deal.
                  <button className="cxp-det2-btn cxp-det2-btn--ghost cxp-det2-btn--sm"
                    onClick={()=>setTab('deal')} style={{marginLeft:10}}>→ Deal</button>
                </div>
              </div>
            ) : (
              <>
                {/* Statut */}
                <div className="cxp-det2-order-card">
                  <div className="cxp-det2-order-card__title">Statut actuel</div>
                  <div className="cxp-det2-order-status-row">
                    <Badge cfg={cmdCfg}/>
                    {commande.confirmedAt && <span className="cxp-det2-order-date">Confirmé : {new Date(commande.confirmedAt).toLocaleString('fr-FR')}</span>}
                  </div>
                  <div className="cxp-det2-order-card__title cxp-det2-mt">Changer le statut</div>
                  <div className="cxp-det2-status-buttons">
                    {Object.entries(CMD_STATUS_CFG).map(([s,cfg])=>{
                      const active = commande.status===s;
                      return (
                        <button key={s}
                          className={`cxp-det2-status-btn${active?' active':''}`}
                          style={active?{background:cfg.bg,color:cfg.color,borderColor:cfg.color}:{}}
                          onClick={()=>action('cmdStatus',()=>updateCommandeStatus(id,s),`✓ Statut : ${cfg.label}`)}
                          disabled={aL.cmdStatus||active}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Code recharge */}
                <div className="cxp-det2-order-card">
                  <div className="cxp-det2-order-card__title"><Tag size={14}/> Code de Recharge</div>
                  {commande.rechargeCode ? (
                    <div className="cxp-det2-code-section">
                      <div className="cxp-det2-code-display">
                        <span className="cxp-det2-code-value">{commande.rechargeCode}</span>
                        <button className="cxp-det2-btn cxp-det2-btn--ghost cxp-det2-btn--sm"
                          onClick={()=>copyCode(commande.rechargeCode)}>📋 Copier</button>
                        <button className="cxp-det2-btn cxp-det2-btn--ghost cxp-det2-btn--sm"
                          onClick={()=>action('regen',()=>regenRechargeCode(id),'✓ Nouveau code généré')}
                          disabled={aL.regen}>
                          {aL.regen?<Spinner size={11}/>:<RefreshCw size={11}/>} Régénérer
                        </button>
                      </div>
                      {commande.rechargeGeneratedAt && (
                        <p className="cxp-det2-hint">Généré le {new Date(commande.rechargeGeneratedAt).toLocaleString('fr-FR')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="cxp-det2-code-section">
                      <div className="cxp-det2-code-placeholder">
                        <span className="cxp-det2-code-placeholder__text">— Généré lors de la confirmation —</span>
                      </div>
                      <p className="cxp-det2-hint">Passez le statut à "Confirmé" pour générer le code.</p>
                    </div>
                  )}
                </div>

                {/* CTA livraison */}
                {commande.status === 'Confirmé' && (!delivery || delivery.status === 'Echoué') && (
                  <div className="cxp-det2-order-card" style={{borderColor:'#bae6fd',background:'#f0f9ff'}}>
                    <div className="cxp-det2-order-card__title">📦 Prêt pour la livraison</div>
                    <p className="cxp-det2-order-desc">La commande est confirmée. Créez maintenant la livraison.</p>
                    <button className="cxp-det2-btn cxp-det2-btn--ghost" onClick={()=>setTab('delivery')}>
                      Créer la livraison →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ DELIVERY ══ */}
        {tab==='delivery' && (
          <div className="cxp-det2-delivery">
            <div className="cxp-det2-section-header">
              <h2>🚚 Livraison</h2>
              <p>Créez et suivez la livraison en temps réel.</p>
            </div>

            {/* Garde : commande doit exister et ne pas être En_Attente */}
            {(!commande || commande.status === 'En_Attente') ? (
              <div className="cxp-det2-order-card">
                <div className="cxp-det2-warn">
                  ⚠ La commande doit être <strong>confirmée</strong> avant de créer une livraison.
                  <button className="cxp-det2-btn cxp-det2-btn--ghost cxp-det2-btn--sm"
                    onClick={()=>setTab('commande')} style={{marginLeft:10}}>→ Confirmer la commande</button>
                </div>
              </div>
            ) : (!delivery || delivery.status === 'Echoué') ? (
              /* Créer livraison (nouvelle ou réexpédition après échec) */
              <div className="cxp-det2-order-card">
                <div className="cxp-det2-order-card__title">📦 Créer un Colis</div>
                <p className="cxp-det2-order-desc">Sélectionnez la société de livraison :</p>
                <div className="cxp-det2-company-grid">
                  {DELIVERY_COMPANIES.map(co=>(
                    <button key={co.id}
                      className={`cxp-det2-company-btn${selCompany===co.id?' active':''}`}
                      style={selCompany===co.id?{borderColor:co.color,background:co.color+'12'}:{}}
                      onClick={()=>setSelCompany(co.id)}>
                      <span className="cxp-det2-company-logo">{co.logo}</span>
                      <span>{co.name}</span>
                      {selCompany===co.id && <CheckCircle2 size={13} style={{color:co.color,marginLeft:'auto'}}/>}
                    </button>
                  ))}
                </div>
                <div className="cxp-det2-delivery-info">
                  <div className="cxp-det2-info-row">
                    <span className="cxp-det2-info-icon">👤</span>
                    <div>
                      <div className="cxp-det2-info-label">Destinataire</div>
                      <div className="cxp-det2-info-value">{lead.firstName} {lead.lastName}</div>
                    </div>
                  </div>
                  <div className="cxp-det2-info-row">
                    <span className="cxp-det2-info-icon">📍</span>
                    <div>
                      <div className="cxp-det2-info-label">Adresse</div>
                      <div className="cxp-det2-info-value">
                        {[lead.address,lead.city,lead.postalCode,lead.country].filter(Boolean).join(', ')||'—'}
                      </div>
                    </div>
                  </div>
                </div>
                <button className="cxp-det2-btn cxp-det2-btn--primary cxp-det2-btn--full"
                  onClick={()=>action('createDel',()=>createDelivery(id,selCompany),'✓ Colis créé')}
                  disabled={aL.createDel}>
                  {aL.createDel?<><Spinner size={14}/> Création…</>:<><Package size={15}/> Créer le Colis</>}
                </button>
              </div>
            ) : (
              /* Suivi livraison */
              <>
                <div className="cxp-det2-order-card cxp-det2-order-card--track">
                  <div className="cxp-det2-order-card__title">
                    📦 Numéro de Suivi
                    <button className="cxp-det2-btn cxp-det2-btn--ghost cxp-det2-btn--sm"
                      style={{marginLeft:'auto'}}
                      onClick={()=>action('track',()=>trackDelivery(id),'✓ Statut actualisé')}
                      disabled={aL.track}>
                      <RefreshCw size={11} className={aL.track?'spin':''}/> {aL.track?'…':'Actualiser'}
                    </button>
                  </div>
                  <div className="cxp-det2-track-number">
                    <span>{delivery.trackingNumber}</span>
                    <button className="cxp-det2-btn cxp-det2-btn--ghost cxp-det2-btn--sm"
                      onClick={()=>copyCode(delivery.trackingNumber)}>📋</button>
                  </div>
                  <div className="cxp-det2-order-date">
                    {DELIVERY_COMPANIES.find(c=>c.id===delivery.company)?.logo}{' '}
                    {DELIVERY_COMPANIES.find(c=>c.id===delivery.company)?.name}
                    {delivery.createdAt && ` · Créé le ${new Date(delivery.createdAt).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>

                <div className="cxp-det2-order-card">
                  <div className="cxp-det2-order-card__title">
                    📍 Statut en Temps Réel <Badge cfg={delCfg}/>
                  </div>
                  {delivery.estimatedDeliveryAt && (
                    <div className="cxp-det2-info-row" style={{marginBottom:12}}>
                      <Clock size={14} style={{color:'#f59e0b'}}/>
                      <div>
                        <div className="cxp-det2-info-label">Livraison estimée</div>
                        <div className="cxp-det2-info-value">
                          {new Date(delivery.estimatedDeliveryAt).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
                        </div>
                      </div>
                    </div>
                  )}
                  <TrackingTimeline delivery={delivery}/>
                </div>

                <div className="cxp-det2-order-card">
                  <div className="cxp-det2-order-card__title">🔄 Mise à jour manuelle</div>
                  <div className="cxp-det2-status-buttons">
                    {Object.entries(DEL_STATUS_CFG).map(([s,cfg])=>{
                      const active = delivery.status===s;
                      return (
                        <button key={s}
                          className={`cxp-det2-status-btn${active?' active':''}`}
                          style={active?{background:cfg.bg,color:cfg.color,borderColor:cfg.color}:{}}
                          onClick={()=>action('track',()=>trackDelivery(id,s),`✓ ${cfg.label}`)}
                          disabled={aL.track||active}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CTA réexpédition si échec */}
                {delivery.status === 'Echoué' && (
                  <div className="cxp-det2-order-card" style={{borderColor:'#fca5a5', background:'#fff5f5'}}>
                    <div className="cxp-det2-order-card__title" style={{color:'#dc2626'}}>
                      ❌ Livraison échouée — Réexpédition possible
                    </div>
                    <p className="cxp-det2-order-desc">
                      La commande est repassée à <strong>Confirmée</strong>. Vous pouvez créer
                      une nouvelle livraison avec une autre société de transport.
                    </p>
                    <button className="cxp-det2-btn cxp-det2-btn--confirm"
                      onClick={()=>{setSelCompany('aramex'); /* reset to default */ window.scrollTo(0,0);}}>
                      📦 Créer une nouvelle livraison →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ MODIFIER ══ */}
        {tab==='edit' && (
          <div className="cxp-det2-edit-tab">
            <div className="cxp-det2-section-header">
              <h2>✏️ Modifier les Informations</h2>
              <p>Mettez à jour les coordonnées du client.</p>
            </div>
            {editError   && <div className="cxp-det2-error-msg">⚠ {editError}</div>}
            {editSuccess && <div className="cxp-det2-success">{editSuccess}</div>}
            <div className="cxp-det2-edit-form">
              <div className="cxp-det2-edit-grid">
                {EDITABLE_FIELDS.map(f=>(
                  <div key={f.key} className={`cxp-det2-field${f.full?' cxp-det2-field--full':''}`}>
                    <label className="cxp-det2-field__label">
                      {f.label}{f.required&&<span className="cxp-det2-field__req">*</span>}
                    </label>
                    <input type={f.type} className="cxp-det2-field__input"
                      value={editForm[f.key]||''} disabled={editSaving} placeholder={f.label}
                      onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))}/>
                  </div>
                ))}
              </div>
              <div className="cxp-det2-edit-actions">
                <button className="cxp-det2-btn cxp-det2-btn--ghost" disabled={editSaving}
                  onClick={()=>{setEditForm({firstName:lead.firstName||'',lastName:lead.lastName||'',email:lead.email||'',phone:lead.phone||'',address:lead.address||'',city:lead.city||'',region:lead.region||'',postalCode:lead.postalCode||'',country:lead.country||'Tunisie'});setEditError('');setEditSuccess('');}}>
                  <X size={14}/> Réinitialiser
                </button>
                <button className="cxp-det2-btn cxp-det2-btn--confirm" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving?<><Spinner size={13}/> Sauvegarde…</>:<><Save size={14}/> Sauvegarder</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ NOTES ══ */}
        {tab==='notes' && (
          <div className="cxp-det2-notes">
            <div className="cxp-det2-section-header">
              <h2>💬 Notes</h2>
              <p>{lead.notes?.length ? `${lead.notes.length} note(s)` : 'Aucune note.'}</p>
            </div>
            <div className="cxp-det2-note-form">
              <div className="cxp-det2-order-card__title">Ajouter une Note</div>
              <textarea ref={noteRef} className="cxp-det2-textarea" rows={3}
                placeholder="Confirmation client, détails livraison…"
                value={noteText} disabled={noteSaving}
                onChange={e=>{setNoteText(e.target.value);setNoteError('');}}/>
              {noteError && <p className="cxp-det2-error-msg" style={{margin:'4px 0 0'}}>{noteError}</p>}
              <div className="cxp-det2-note-footer">
                <span className="cxp-det2-chars">{noteText.length}/2000</span>
                <button className="cxp-det2-btn cxp-det2-btn--confirm"
                  onClick={handleAddNote} disabled={noteSaving||!noteText.trim()}>
                  {noteSaving?'Sauvegarde…':'✎ Sauvegarder'}
                </button>
              </div>
            </div>
            {visNotes.length>0 && (
              <div className="cxp-det2-notes-list">
                {visNotes.map((note,i)=>(
                  <div key={i} className="cxp-det2-note-item">
                    <div className="cxp-det2-note-meta">
                      <span className="cxp-det2-note-num">#{lead.notes.length-i}</span>
                      <span className="cxp-det2-note-date">{fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}</span>
                    </div>
                    <p className="cxp-det2-note-content">{note.content}</p>
                  </div>
                ))}
                {lead.notes?.length>NOTES_PREVIEW && (
                  <button className="cxp-det2-btn cxp-det2-btn--ghost cxp-det2-btn--full"
                    onClick={()=>setNotesExpanded(v=>!v)}>
                    {notesExpanded?<><ChevronUp size={14}/> Réduire</>:<><ChevronDown size={14}/> Voir toutes les {lead.notes.length} notes</>}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}