import React from "react";

function UserMenu({ user, onLogout, onViewArchivedMeetings }) {
  return (
    <div className="user-menu">
      <div className="user-info">
        <img src={user.photoURL} alt="Foto do perfil" className="user-avatar" />
        <span className="user-name">{user.displayName}</span>
      </div>

      <div className="menu-options">
        <button className="menu-option" onClick={onViewArchivedMeetings}>
          <span className="option-icon">📁</span>
          Reuniões Arquivadas
        </button>

        <button className="menu-option logout" onClick={onLogout}>
          <span className="option-icon">🚪</span>
          Sair
        </button>
      </div>
    </div>
  );
}

export default UserMenu;
