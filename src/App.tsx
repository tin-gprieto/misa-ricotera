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
          · Indio Solari &amp; Los Redonditos de Ricota · Desarrollado por
          Martín González Prieto
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
