/**
 * CineScene.jsx
 *
 * Full-page cinematic background wrapper for all auth pages.
 * - Slow-zoom city-at-night image
 * - Film grain + vignette overlay
 * - Shared context exposing navigateTo() for smooth page transitions
 *
 * Router usage:
 *   <Route path="/login"           element={<CineScene page="login"><Login /></CineScene>} />
 *   <Route path="/signup"          element={<CineScene page="signup"><Signup /></CineScene>} />
 *   <Route path="/forgot-password" element={<CineScene page="forgot"><ForgetPassword /></CineScene>} />
 *   <Route path="/reset-password/:token" element={<CineScene page="reset"><ResetPassword /></CineScene>} />
 *
 * To use your own background image, change BG_IMAGE below.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Auth.css';
import bgImage from '../../assets/login_background.jpg';

// ── Swap this URL for your own city/night image ───────────────
const BG_IMAGE = bgImage

const PILL_LABELS = {
  login:  'CRM Platform',
  signup: 'New Account',
  forgot: 'Password Reset',
  reset:  'Set New Password',
};

export const CineSceneContext = createContext(null);
export function useCineScene() { return useContext(CineSceneContext); }

let _isTransitioning = false;

export default function CineScene({ page = 'login', children }) {
  const navigate = useNavigate();

  const navigateTo = (path) => {
    if (_isTransitioning) return;
    _isTransitioning = true;

    const inner = document.getElementById('cine-page-inner');
    if (inner) {
      inner.classList.remove('auth-page-enter');
      inner.classList.add('auth-page-exit');
    }

    setTimeout(() => {
      _isTransitioning = false;
      navigate(path);
    }, 240);
  };

  const ctx = { navigateTo, currentPage: page, pillLabel: PILL_LABELS[page] };

  return (
    <CineSceneContext.Provider value={ctx}>
      {/* ── Cinematic background ── */}
      <div className="cine-scene">
        <div
          className="cine-bg"
          style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        />
        <div className="cine-overlay" />
        <div className="cine-grain"  />
      </div>

      {/* ── Ambient tagline ── */}
      <p className="cine-tagline">Your CRM Platform &nbsp;·&nbsp; Est. 2024</p>

      {/* ── Centred card ── */}
      <div className="cine-stage">
        <div className="auth-box">
          <div id="cine-page-inner" key={page} className="auth-page-enter">
            {children}
          </div>
        </div>
      </div>
    </CineSceneContext.Provider>
  );
}