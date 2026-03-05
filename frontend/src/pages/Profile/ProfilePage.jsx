import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Mail, Phone, Lock, Users,
  Camera, CheckCircle, AlertCircle, Eye, EyeOff, ChevronRight, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_THEME } from '../../config/roleConfig';
import {
  getProfile, updateProfile, changePassword ,getTeamProfiles, getUserProfile,
} from '../../api/profileApi';
import './ProfilePage.css';

// ── Helpers ────────────────────────────────────────────────────────────────
const initials = (u) =>
  u ? `${(u.firstName ?? '')[0] ?? ''}${(u.lastName ?? '')[0] ?? ''}`.toUpperCase() : '?';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const passwordStrength = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6)                     score++;
  if (pw.length >= 10)                    score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw))           score++;
  return score;
};
const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Bien', 'Fort'];

// ── Avatar display ─────────────────────────────────────────────────────────
function AvatarDisplay({ user, size = 96, radius = 22 }) {
  const style = { width: size, height: size, borderRadius: radius };
  if (user?.avatar) {
    return <img src={user.avatar} alt="avatar" style={{ ...style, objectFit: 'cover' }} />;
  }
  return <span style={{ fontSize: size * 0.35 }}>{initials(user)}</span>;
}

// ── Member detail modal ────────────────────────────────────────────────────
function MemberModal({ userId, theme, onClose }) {
  const [member,  setMember]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(userId)
      .then((res) => setMember(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const cssVars = {
    '--role-gradient': theme.gradient,
    '--role-accent':   theme.accent,
    '--role-light':    theme.light,
    '--role-shadow':   theme.shadow ?? 'rgba(99,102,241,.3)',
  };

  return (
    <div className="prof-member-modal" onClick={onClose} style={cssVars}>
      <div className="prof-member-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="prof-member-modal__head">
          <button className="prof-member-modal__close" onClick={onClose}>×</button>
          {loading ? (
            <div className="prof-skel" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 12 }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="prof-member-av" style={{ width: 64, height: 64, fontSize: 22, margin: 0, flexShrink: 0 }}>
                {member?.avatar
                  ? <img src={member.avatar} alt="" />
                  : <span>{initials(member)}</span>}
              </div>
              <div>
                <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: "'Fraunces',serif" }}>
                  {member?.firstName} {member?.lastName}
                </p>
                <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,.65)', fontSize: 12 }}>Salesman</p>
              </div>
            </div>
          )}
        </div>

        <div className="prof-member-modal__body">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="prof-skel" style={{ height: 40, borderRadius: 10, marginBottom: 10 }} />)
          ) : (
            <>
              {[
                { icon: <Mail size={14} />,     label: 'Email',        value: member?.email },
                { icon: <Phone size={14} />,    label: 'Téléphone',    value: member?.phone || '—' },
                { icon: <User size={14} />,     label: 'Bio',          value: member?.bio   || '—' },
                { icon: <CheckCircle size={14}/>,label: 'Membre depuis',value: fmtDate(member?.createdAt) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="prof-quick-row">
                  <div className="prof-quick-icon">{icon}</div>
                  <div>
                    <p className="prof-quick-label">{label}</p>
                    <p className="prof-quick-value">{value}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const role  = user?.role ?? 'salesman';
  const theme = ROLE_THEME[role] ?? ROLE_THEME.salesman;

  const cssVars = {
    '--role-gradient': theme.gradient,
    '--role-accent':   theme.accent,
    '--role-light':    theme.light,
    '--role-badge':    theme.badge,
    '--role-shadow':   theme.shadow ?? 'rgba(99,102,241,.3)',
  };

  const [tab,            setTab]            = useState('info');
  const [profileData,    setProfileData]    = useState(null);
  const [team,           setTeam]           = useState([]);
  const [teamLoading,    setTeamLoading]    = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Edit form state
  const [form,    setForm]    = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null); // { type: 'success'|'error', text }

  // Password form state
  const [pwForm,   setPwForm]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg,    setPwMsg]    = useState(null);
  const [showPw,   setShowPw]   = useState({ current: false, new: false, confirm: false });

  const fileRef = useRef(null);

  // ── Load own profile ─────────────────────────────────────────────────────
  useEffect(() => {
    getProfile().then((res) => {
      const d = res.data;
      setProfileData(d);
      setForm({
        firstName: d.firstName || '',
        lastName:  d.lastName  || '',
        email:     d.email     || '',
        phone:     d.phone     || '',
        bio:       d.bio       || '',
      });
    });
  }, []);

  // ── Load team (sales_leader only) ─────────────────────────────────────────
  useEffect(() => {
    if (role !== 'sales_leader' || tab !== 'team') return;
    setTeamLoading(true);
    getTeamProfiles()
      .then((res) => setTeam(res.data || []))
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  }, [role, tab]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { setMsg({ type: 'error', text: 'Image trop lourde (max 500 KB)' }); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const avatar = ev.target.result;
      try {
        const res = await updateProfile({ ...form, avatar });
        setProfileData(res.data);
        updateUser({ avatar });
        setMsg({ type: 'success', text: 'Photo mise à jour ✓' });
      } catch { setMsg({ type: 'error', text: 'Échec de la mise à jour' }); }
    };
    reader.readAsDataURL(file);
  }, [form, updateUser]);

  // ── Save info ─────────────────────────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await updateProfile({ ...form, avatar: profileData?.avatar });
      setProfileData(res.data);
      updateUser({ firstName: res.data.firstName, lastName: res.data.lastName, email: res.data.email });
      setMsg({ type: 'success', text: 'Profil mis à jour avec succès ✓' });
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Erreur lors de la mise à jour' });
    } finally { setSaving(false); }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' }); return;
    }
    setPwSaving(true); setPwMsg(null);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg({ type: 'success', text: 'Mot de passe changé avec succès ✓' });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err?.response?.data?.message || 'Erreur' });
    } finally { setPwSaving(false); }
  };

  const strength      = passwordStrength(pwForm.newPassword);
  const strengthLabel = STRENGTH_LABELS[strength];

  const tabs = [
    { k: 'info',     icon: <User size={14} />,  label: 'Informations' },
    { k: 'password', icon: <Lock size={14} />,  label: 'Mot de passe' },
    ...(role === 'sales_leader' ? [{ k: 'team', icon: <Users size={14} />, label: 'Mon Équipe' }] : []),
  ];

  return (
    <div className="prof-root" style={cssVars}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="prof-hero">
        <div className="prof-hero__blob prof-hero__blob--1" />
        <div className="prof-hero__blob prof-hero__blob--2" />
        <div className="prof-hero__inner">
          <div className="prof-hero__title">
            <h1>Mon Profil</h1>
            <p>Gérez vos informations personnelles et votre sécurité</p>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="prof-body">

        {/* ── Left sidebar ── */}
        <div className="prof-card prof-sidebar">

          <div className="prof-avatar-section">
            <div className="prof-avatar-wrap">
              <div className="prof-avatar">
                {profileData?.avatar
                  ? <img src={profileData.avatar} alt="avatar" />
                  : initials(profileData)}
              </div>
              <label className="prof-avatar-upload-btn" title="Changer la photo">
                <Camera size={14} />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            {profileData ? (
              <>
                <p className="prof-avatar-name">{profileData.firstName} {profileData.lastName}</p>
                <span className="prof-avatar-role">{theme.label}</span>
              </>
            ) : (
              <>
                <div className="prof-skel" style={{ width: 120, height: 18, borderRadius: 6, marginBottom: 8 }} />
                <div className="prof-skel" style={{ width: 80, height: 22, borderRadius: 99 }} />
              </>
            )}
          </div>

          <div className="prof-quick-info">
            {[
              { icon: <Mail size={14} />,  label: 'Email',        value: profileData?.email },
              { icon: <Phone size={14} />, label: 'Téléphone',    value: profileData?.phone || '—' },
              { icon: <User size={14} />,  label: 'Membre depuis',value: fmtDate(profileData?.createdAt) },
            ].map(({ icon, label, value }) => (
              <div key={label} className="prof-quick-row">
                <div className="prof-quick-icon">{icon}</div>
                <div>
                  <p className="prof-quick-label">{label}</p>
                  {profileData
                    ? <p className="prof-quick-value">{value}</p>
                    : <div className="prof-skel" style={{ width: 100, height: 14, borderRadius: 4 }} />}
                </div>
              </div>
            ))}

            {profileData?.bio && (
              <div className="prof-quick-row">
                <div className="prof-quick-icon"><User size={14} /></div>
                <div>
                  <p className="prof-quick-label">Bio</p>
                  <p className="prof-quick-value" style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5 }}>
                    {profileData.bio}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right main ── */}
        <div className="prof-card prof-main">

          {/* Tabs */}
          <div className="prof-tabs">
            {tabs.map((t) => (
              <button
                key={t.k}
                className={`prof-tab${tab === t.k ? ' active' : ''}`}
                onClick={() => { setTab(t.k); setMsg(null); setPwMsg(null); }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="prof-form-area">

            {/* ── Tab: Informations ── */}
            {tab === 'info' && (
              <form onSubmit={handleSaveInfo}>
                {msg && (
                  <div className={`prof-msg prof-msg--${msg.type}`}>
                    {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    {msg.text}
                  </div>
                )}

                <div className="prof-grid-2">
                  <div className="prof-field">
                    <label className="prof-label">Prénom</label>
                    <input
                      className="prof-input"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Prénom"
                      required
                    />
                  </div>
                  <div className="prof-field">
                    <label className="prof-label">Nom</label>
                    <input
                      className="prof-input"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Nom"
                      required
                    />
                  </div>
                  <div className="prof-field prof-field--full">
                    <label className="prof-label">Email</label>
                    <input
                      className="prof-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  <div className="prof-field prof-field--full">
                    <label className="prof-label">Téléphone</label>
                    <input
                      className="prof-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+216 XX XXX XXX"
                    />
                  </div>
                  <div className="prof-field prof-field--full">
                    <label className="prof-label">Bio</label>
                    <textarea
                      className="prof-textarea"
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 300) })}
                      placeholder="Quelques mots sur vous…"
                      maxLength={300}
                    />
                    <span className="prof-char-count">{form.bio.length}/300</span>
                  </div>
                </div>

                <div className="prof-actions">
                  <button type="button" className="prof-btn prof-btn--ghost"
                    onClick={() => setForm({
                      firstName: profileData?.firstName || '', lastName:  profileData?.lastName  || '',
                      email:     profileData?.email     || '', phone:     profileData?.phone     || '',
                      bio:       profileData?.bio       || '',
                    })}>
                    Annuler
                  </button>
                  <button type="submit" className="prof-btn prof-btn--primary" disabled={saving}>
                    {saving ? 'Enregistrement…' : '✓ Enregistrer'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Tab: Mot de passe ── */}
            {tab === 'password' && (
              <form onSubmit={handleChangePassword}>
                {pwMsg && (
                  <div className={`prof-msg prof-msg--${pwMsg.type}`}>
                    {pwMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    {pwMsg.text}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Current password */}
                  <div className="prof-field">
                    <label className="prof-label">Mot de passe actuel</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="prof-input"
                        type={showPw.current ? 'text' : 'password'}
                        value={pwForm.currentPassword}
                        onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                        placeholder="••••••••"
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: 42 }}
                        required
                      />
                      <button type="button"
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        onClick={() => setShowPw((p) => ({ ...p, current: !p.current }))}>
                        {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div className="prof-field">
                    <label className="prof-label">Nouveau mot de passe</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="prof-input"
                        type={showPw.new ? 'text' : 'password'}
                        value={pwForm.newPassword}
                        onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                        placeholder="••••••••"
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: 42 }}
                        required
                      />
                      <button type="button"
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        onClick={() => setShowPw((p) => ({ ...p, new: !p.new }))}>
                        {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {pwForm.newPassword && (
                      <>
                        <div className="prof-strength">
                          {[1,2,3,4].map((i) => (
                            <div key={i} className={`prof-strength-bar${i <= strength ? ` filled-${strength}` : ''}`} />
                          ))}
                        </div>
                        <p className="prof-strength-label">{strengthLabel}</p>
                      </>
                    )}
                  </div>

                  {/* Confirm */}
                  <div className="prof-field">
                    <label className="prof-label">Confirmer le mot de passe</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className={`prof-input${pwForm.confirm && pwForm.confirm !== pwForm.newPassword ? ' error' : ''}`}
                        type={showPw.confirm ? 'text' : 'password'}
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                        placeholder="••••••••"
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: 42 }}
                        required
                      />
                      <button type="button"
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}>
                        {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {pwForm.confirm && pwForm.confirm !== pwForm.newPassword && (
                      <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Les mots de passe ne correspondent pas</p>
                    )}
                  </div>
                </div>

                <div className="prof-actions">
                  <button type="button" className="prof-btn prof-btn--ghost"
                    onClick={() => setPwForm({ currentPassword: '', newPassword: '', confirm: '' })}>
                    Effacer
                  </button>
                  <button type="submit" className="prof-btn prof-btn--primary" disabled={pwSaving}>
                    {pwSaving ? 'Changement…' : '🔒 Changer le mot de passe'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Tab: Équipe (sales_leader only) ── */}
            {tab === 'team' && (
              <div>
                <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>
                  {team.length} commercial{team.length > 1 ? 'aux' : ''} dans votre équipe
                </p>

                {teamLoading ? (
                  <div className="prof-team-grid">
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ border: '1.5px solid #e8edf5', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                        <div className="prof-skel" style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 10px' }} />
                        <div className="prof-skel" style={{ width: 100, height: 14, borderRadius: 4, margin: '0 auto 6px' }} />
                        <div className="prof-skel" style={{ width: 130, height: 12, borderRadius: 4, margin: '0 auto' }} />
                      </div>
                    ))}
                  </div>
                ) : team.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <Users size={40} style={{ opacity: .3, marginBottom: 12 }} />
                    <p style={{ margin: 0 }}>Aucun commercial approuvé pour l'instant</p>
                  </div>
                ) : (
                  <div className="prof-team-grid">
                    {team.map((member) => (
                      <div
                        key={member.id}
                        className="prof-member-card"
                        onClick={() => setSelectedMember(member.id)}
                      >
                        <div className="prof-member-av">
                          {member.avatar
                            ? <img src={member.avatar} alt="" />
                            : initials(member)}
                        </div>
                        <p className="prof-member-name">{member.firstName} {member.lastName}</p>
                        <p className="prof-member-email">{member.email}</p>
                        <p className="prof-member-since">Depuis {fmtDate(member.createdAt)}</p>
                        <span className="prof-member-badge">Actif</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Member detail modal ── */}
      {selectedMember && (
        <MemberModal
          userId={selectedMember}
          theme={theme}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
