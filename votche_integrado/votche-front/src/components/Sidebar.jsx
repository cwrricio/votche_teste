import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Sidebar.css";
import votcheLogo from "../assets/votche.png";
import { FaHome, FaArchive, FaKey, FaChartBar } from "react-icons/fa";

export default function Sidebar({ isOpen = true, toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <nav className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Sidebar">
      <div className="sidebar-header">
        <img
          src={votcheLogo}
          alt="Votchê"
          className="sidebar-logo"
          onClick={handleLogoClick}
          style={{ cursor: "pointer" }}
        />
      </div>

      <ul className="sidebar-menu">
        <li className="sidebar-menu-item">
          <button
            className={`sidebar-link ${
              location.pathname === "/home" ? "active" : ""
            }`}
            onClick={() => navigate("/home")}
          >
            <span className="sidebar-icon">
              <FaHome />
            </span>
            <span>Home</span>
          </button>
        </li>

        <li className="sidebar-menu-item">
          <button
            className={`sidebar-link ${
              location.pathname === "/archived-meetings" ? "active" : ""
            }`}
            onClick={() => navigate("/archived-meetings")}
          >
            <span className="sidebar-icon">
              <FaArchive />
            </span>
            <span>Reuniões Arquivadas</span>
          </button>
        </li>

        <li className="sidebar-menu-item">
          <button
            className={`sidebar-link ${
              location.pathname === "/enter-meeting" ? "active" : ""
            }`}
            onClick={() => navigate("/enter-meeting")}
          >
            <span className="sidebar-icon">
              <FaKey />
            </span>
            <span>Entrar com Senha</span>
          </button>
        </li>

        <li className="sidebar-menu-item">
          <button
            className={`sidebar-link ${
              location.pathname === "/reports" ? "active" : ""
            }`}
            onClick={() => navigate("/reports")}
          >
            <span className="sidebar-icon">
              <FaChartBar />
            </span>
            <span>Relatórios</span>
          </button>
        </li>

      
      </ul>
    </nav>
  );
}
