import { Link } from "react-router-dom";
import heroLogoSrc from "../assets/logo.png";

export default function Home() {
  return (
    <div className="hero">
      <img src={heroLogoSrc} alt="Misa Ricotera" className="hero-logo" />
      <Link to="/discografia" className="hero-btn">
        Ver Discografía
      </Link>
    </div>
  );
}
