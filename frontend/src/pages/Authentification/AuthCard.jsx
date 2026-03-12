import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * AuthCard — wraps all auth pages in a single 3-D flip card.
 *
 * Face mapping:
 *   front  →  /login
 *   back-a →  /signup
 *   back-b →  /forgot-password
 *
 * The card flips on route change.  Children receive helpers via
 * the AuthCardContext so they can trigger navigation + flip.
 */

export const AuthCardContext = React.createContext(null);

/* Which routes live on the "back" of the card */
const BACK_ROUTES = ['/signup', '/forgot-password'];

const isBack = (pathname) =>
  BACK_ROUTES.some((r) => pathname.startsWith(r));

export default function AuthCard({ loginContent, signupContent, forgotContent }) {
  const location = useLocation();
  const navigate = useNavigate();

  // 'front' | 'back'
  const [face, setFace]         = useState(isBack(location.pathname) ? 'back' : 'front');
  const [flipping, setFlipping] = useState(false);
  // which back panel to show
  const [backView, setBackView] = useState(
    location.pathname.startsWith('/signup') ? 'signup' : 'forgot'
  );

  /* ── Navigate + flip ───────────────────────────────────────────────── */
  const flipTo = (path) => {
    if (flipping) return;
    setFlipping(true);

    const targetFace = isBack(path) ? 'back' : 'front';

    if (targetFace === 'back') {
      setBackView(path.startsWith('/signup') ? 'signup' : 'forgot');
    }

    // Start the flip; swap face halfway through (200 ms)
    setTimeout(() => {
      setFace(targetFace);
      navigate(path);
    }, 200);

    // Unlock after animation completes (400 ms total)
    setTimeout(() => setFlipping(false), 420);
  };

  /* ── Sync on direct URL visit ──────────────────────────────────────── */
  useEffect(() => {
    const target = isBack(location.pathname) ? 'back' : 'front';
    if (target !== face) setFace(target);
    if (location.pathname.startsWith('/signup')) setBackView('signup');
    if (location.pathname.startsWith('/forgot')) setBackView('forgot');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const ctx = { flipTo, flipping, currentFace: face };

  return (
    <AuthCardContext.Provider value={ctx}>
      <div className="auth-scene">
        {/* Ambient glow blobs */}
        <div className="auth-scene__blob auth-scene__blob--a" />
        <div className="auth-scene__blob auth-scene__blob--b" />

        <div className={`auth-flipper ${face === 'back' ? 'auth-flipper--flipped' : ''}`}>

          {/* ── FRONT: Login ─────────────────────────────────────── */}
          <div className="auth-flipper__face auth-flipper__face--front">
            <div className="auth-box">
              {loginContent}
            </div>
          </div>

          {/* ── BACK: Signup / ForgotPassword ────────────────────── */}
          <div className="auth-flipper__face auth-flipper__face--back">
            <div className="auth-box">
              {backView === 'signup' ? signupContent : forgotContent}
            </div>
          </div>
        </div>
      </div>
    </AuthCardContext.Provider>
  );
}
