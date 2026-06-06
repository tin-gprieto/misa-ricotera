import { Link } from "react-router-dom";
import heroLogoSrc from "../assets/logo.png";

export default function Home() {
  return (
    <div className="hero">
      <img src={heroLogoSrc} alt="Misa Ricotera" className="hero-logo" />
      <div className="hero-actions">
        <Link to="/discografia" className="hero-btn">
          Ver Discografía
        </Link>
        <Link to="/ultima-misa" className="hero-btn hero-btn--misa">
          La última misa
        </Link>
      </div>
    </div>
  );
}
