import { BrowserRouter, Routes, Route, Outlet, Link, useLocation } from "react-router-dom";
import navbarLogoSrc from "./assets/navbar-logo.png";
import Home from "./pages/Home";
import Discography from "./pages/Discography";
import UltimaMisa from "./pages/UltimaMisa";
import "./App.css";

function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="logo">
            <img src={navbarLogoSrc} alt="Misa Ricotera" className="logo-img" />
          </Link>
          <nav className="nav-links">
            <Link to="/" className={`nav-link${pathname === "/" ? " nav-link--active" : ""}`}>Inicio</Link>
            <Link to="/discografia" className={`nav-link${pathname.startsWith("/discografia") ? " nav-link--active" : ""}`}>Discografía</Link>
            <Link to="/ultima-misa" className={`nav-link${pathname.startsWith("/ultima-misa") ? " nav-link--active" : ""}`}>La última misa</Link>
          </nav>
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
