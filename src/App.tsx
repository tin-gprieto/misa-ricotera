import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, Link, useLocation } from "react-router-dom";
import navbarLogoSrc from "./assets/navbar-logo.png";
import Home from "./pages/Home";
import Discography from "./pages/Discography";
import UltimaMisa from "./pages/UltimaMisa";
import "./App.css";

function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const close = () => setMenuOpen(false);

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="logo" onClick={close}>
            <img src={navbarLogoSrc} alt="Misa Ricotera" className="logo-img" />
          </Link>

          <nav className={`nav-links${menuOpen ? " nav-links--open" : ""}`}>
            <Link to="/" className={`nav-link${pathname === "/" ? " nav-link--active" : ""}`} onClick={close}>Inicio</Link>
            <Link to="/discografia" className={`nav-link${pathname.startsWith("/discografia") ? " nav-link--active" : ""}`} onClick={close}>Discografía</Link>
            <Link to="/ultima-misa" className={`nav-link${pathname.startsWith("/ultima-misa") ? " nav-link--active" : ""}`} onClick={close}>La última misa</Link>
          </nav>

          <button
            className="hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="4" x2="18" y2="18" />
                <line x1="18" y1="4" x2="4" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="2" y1="6" x2="20" y2="6" />
                <line x1="2" y1="11" x2="20" y2="11" />
                <line x1="2" y1="16" x2="20" y2="16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>
          Datos de{" "}
          <a href="https://developer.spotify.com" target="_blank" rel="noreferrer">
            Spotify API
          </a>{" "}
          · Indio Solari &amp; Los Redonditos de Ricota
        </p>
        <p className="footer-copy">
          © {new Date().getFullYear()} Martín González Prieto
          <span className="footer-sep">·</span>
          <a href="https://github.com/tin-gprieto" target="_blank" rel="noreferrer" className="footer-social" aria-label="GitHub">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            tin-gprieto
          </a>
          <span className="footer-sep">·</span>
          <a href="https://linkedin.com/in/mgonpri" target="_blank" rel="noreferrer" className="footer-social" aria-label="LinkedIn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            mgonpri
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/discografia" element={<Discography />} />
          <Route path="/ultima-misa" element={<UltimaMisa />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
