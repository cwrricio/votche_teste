import React, { useRef } from "react";
import "./styles/Topbar.css";

export default function Topbar({
  user,
  showDropdown,
  setShowDropdown,
  handleLogout,
  handleBackToHome,
  handleGoogleLogin,
}) {
  const dropdownRef = useRef(null);

  // Função para formatar nome
  const formatUserName = (fullName) => {
    if (!fullName) return "";
    const firstName = fullName.split(" ")[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  return (
    <div className="topbar">
      <div className="topbar-spacer" /> {/* Espaço para centralizar ou futuro logo */}
      {user ? (
        <div className="user-profile" ref={dropdownRef}>
          <div
            className="profile-container"
            onClick={() => setShowDropdown(!showDropdown)}
            tabIndex={0}
            role="button"
            aria-haspopup="true"
            aria-expanded={showDropdown}
          >
            <img
              src={user.photoURL}
              alt="Foto de perfil"
              className="profile-photo"
            />
            <span className="user-name">{formatUserName(user.displayName)}</span>
          </div>
          {showDropdown && (
            <div className="profile-dropdown">
              <button onClick={handleBackToHome} className="dropdown-item">
                Minhas Reuniões
              </button>
              <button onClick={handleLogout} className="dropdown-item">
                Sair
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="login-button" onClick={handleGoogleLogin}>
          <span className="user-icon">👤</span>
          <span>Login</span>
        </div>
      )}
    </div>
  );
}