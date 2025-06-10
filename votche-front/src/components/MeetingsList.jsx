import { useState, useEffect } from "react";
import { getAllActiveMeetings } from "../firebase";
import "../styles/MeetingsList.css";

function MeetingsList({
  user,
  meetings,
  isLoading,
  error,
  onSelectMeeting,
  onCreateNewMeeting,
  onEnterMeeting,
  onArchiveMeeting,
  onViewArchivedMeetings,
  onBackToRegular,
  viewingArchived,
  onLogin, // Adicione esta prop
}) {
  // Estado para controlar a tab ativa
  const [activeTab, setActiveTab] = useState(
    user ? "created" : "participating"
  );

  // Remover estado relacionado a reuniões públicas
  // const [publicMeetings, setPublicMeetings] = useState([]);
  // const [isPublicLoading, setIsPublicLoading] = useState(true);

  // Função auxiliar para formatar data
  const formatDate = (dateStr, timeStr) => {
    try {
      const date = new Date(dateStr + "T" + timeStr);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  // Verificar status da reunião
  const getMeetingStatus = (meeting) => {
    if (!meeting.active) {
      return { text: "Encerrada", class: "status-ended" };
    }

    const now = new Date();
    const meetingDate = new Date(meeting.date + "T" + meeting.time);

    if (meetingDate > now) {
      return { text: "Agendada", class: "status-scheduled" };
    } else {
      return { text: "Em andamento", class: "status-active" };
    }
  };

  // Manipulador para ações que requerem login
  const handleRequiresLogin = (callback, ...args) => {
    if (user) {
      callback(...args);
    } else {
      onLogin();
    }
  };

  // Função para lidar com clique no botão dentro do card sem propagar para o card
  const handleButtonClick = (e, action) => {
    e.stopPropagation(); // Impedir que o clique propague para o card
    handleRequiresLogin(action);
  };

  // Função para renderizar o rodapé dos cards de forma consistente
  const renderMeetingFooter = (meeting, status, isOwner, callback) => {
    return (
      <div className="meeting-footer">
        {/* 1. Senha (apenas se o usuário for o dono) */}
        {isOwner && (
          <div className="meeting-password meeting-footer-item">
            Senha: {meeting.password}
          </div>
        )}

        {/* 2. Status da reunião */}
        <div className={`meeting-status ${status.class} meeting-footer-item`}>
          {status.text}
        </div>

        {/* 3. Botão de acesso (se a reunião estiver ativa) */}
        {meeting.active && (
          <button
            className="meeting-enter-btn"
            onClick={(e) => {
              e.stopPropagation();
              callback(e);
            }}
          >
            {user ? "Acessar" : "Entrar"}
          </button>
        )}
      </div>
    );
  };

  // Modifique o cabeçalho para mostrar botão diferente quando estiver no modo arquivado
  return (
    <div className="meetings-list-container">
      <div className="meetings-header">
        <h2>{viewingArchived ? "Reuniões Arquivadas" : "Reuniões"}</h2>
        <div className="header-actions">
          {user && !viewingArchived && (
            <button className="create-meeting-btn" onClick={onCreateNewMeeting}>
              + Nova Reunião
            </button>
          )}
          {!viewingArchived ? (
            <button
              className="archive-view-btn"
              onClick={() => handleRequiresLogin(onViewArchivedMeetings)}
            >
              <span className="icon">📁</span> Arquivadas
            </button>
          ) : (
            <button className="archive-view-btn" onClick={onBackToRegular}>
              <span className="icon">↩</span> Voltar
            </button>
          )}
          <button
            className="archive-view-btn"
            onClick={() => handleRequiresLogin(onEnterMeeting)}
          >
            <span className="icon">🔑</span> Entrar com Senha
          </button>
        </div>
      </div>

      {!user && (
        <div className="login-section">
          <p className="login-message">
            Faça login para criar reuniões ou participar com seu perfil
          </p>
          <button className="login-btn" onClick={onLogin}>
            Entrar com Google
          </button>
        </div>
      )}

      {user && (
        <div className="meetings-tabs">
          <button
            className={`tab-btn ${activeTab === "created" ? "active" : ""}`}
            onClick={() => setActiveTab("created")}
          >
            Minhas Reuniões
          </button>
          <button
            className={`tab-btn ${
              activeTab === "participating" ? "active" : ""
            }`}
            onClick={() => setActiveTab("participating")}
          >
            Participando
          </button>
          {/* Remover a tab para reuniões públicas */}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="meetings-grid">
        {isLoading ? (
          <div className="loading-state">Carregando reuniões...</div>
        ) : (
          <div>
            {/* Estados vazios para as abas */}
            {user &&
              activeTab === "created" &&
              meetings.created.length === 0 && (
                <div className="empty-state">
                  <p>Você ainda não criou nenhuma reunião</p>
                  <button
                    className="create-meeting-btn"
                    onClick={onCreateNewMeeting}
                  >
                    Criar minha primeira reunião
                  </button>
                </div>
              )}

            {user &&
              activeTab === "participating" &&
              meetings.participating.length === 0 && (
                <div className="empty-state">
                  <p>Você ainda não está participando de nenhuma reunião</p>
                  <p className="empty-state-subtitle">
                    Entre em uma reunião usando a senha
                  </p>
                </div>
              )}

            {/* Remover a seção de reuniões públicas */}

            {/* Exibir reuniões criadas pelo usuário */}
            {user &&
              activeTab === "created" &&
              meetings.created.map((meeting) => {
                const status = getMeetingStatus(meeting);
                const isOwner = user && meeting.createdBy === user.uid;

                return (
                  <div
                    key={meeting.id}
                    className={`meeting-card ${
                      !meeting.active ? "inactive" : ""
                    } ${viewingArchived ? "archived" : ""}`}
                    onClick={() => onSelectMeeting(meeting)}
                  >
                    {isOwner && (
                      <button
                        className="archive-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveMeeting(meeting);
                        }}
                        title="Arquivar reunião"
                      >
                        <span className="archive-icon">📁</span>
                      </button>
                    )}

                    <div className="meeting-card-content">
                      <div className="meeting-card-header">
                        <h3 className="meeting-name">{meeting.name}</h3>
                      </div>
                      <p className="meeting-date">
                        {formatDate(meeting.date, meeting.time)}
                      </p>
                      {meeting.description && (
                        <div className="meeting-description-container">
                          <p className="meeting-description">
                            {meeting.description}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Para reuniões criadas pelo usuário */}
                    {renderMeetingFooter(meeting, status, isOwner, (e) =>
                      onSelectMeeting(meeting)
                    )}
                  </div>
                );
              })}

            {/* Exibir reuniões que o usuário participa */}
            {user &&
              activeTab === "participating" &&
              meetings.participating.map((meeting) => {
                const status = getMeetingStatus(meeting);
                const isOwner = user && meeting.createdBy === user.uid;

                return (
                  <div
                    key={meeting.id}
                    className={`meeting-card ${
                      !meeting.active ? "inactive" : ""
                    }`}
                    onClick={() => onSelectMeeting(meeting)}
                  >
                    <div className="meeting-card-content">
                      <div className="meeting-card-header">
                        <h3 className="meeting-name">{meeting.name}</h3>
                      </div>
                      <p className="meeting-date">
                        {formatDate(meeting.date, meeting.time)}
                      </p>
                      {meeting.description && (
                        <div className="meeting-description-container">
                          <p className="meeting-description">
                            {meeting.description}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Para reuniões em que participa */}
                    {renderMeetingFooter(meeting, status, isOwner, (e) =>
                      onSelectMeeting(meeting)
                    )}
                  </div>
                );
              })}

            {/* Remover a seção que exibe reuniões públicas */}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingsList;
