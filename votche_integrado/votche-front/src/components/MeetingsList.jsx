import React, { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaArchive,
  FaSignInAlt,
  FaFolderOpen,
  FaPlus,
  FaKey,
} from "react-icons/fa";
import "../styles/MeetingsList.css";

function MeetingsList({
  user,
  meetings,
  isLoading,
  error,
  onSelectMeeting,
  onCreateNewMeeting,
  onEnterMeeting,
  onViewArchivedMeetings,
  onBackToRegular,
  viewingArchived,
  onLogin,
}) {
  const [activeTab, setActiveTab] = useState(user ? "created" : "participating");

  useEffect(() => {
    // Efeito vazio por enquanto
  }, [user]);

  // formatDateTime removido pois não é utilizado

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
    } catch {
      return `${dateStr} ${timeStr}`;
    }
  };

  const getMeetingStatus = (meeting) => {
    // completed: reunião encerrada
    if (meeting.status === "completed") {
      return { text: "Encerrada", class: "status-ended", icon: <FaClock /> };
    }
    // scheduled: reunião agendada para o futuro
    if (meeting.status === "scheduled") {
      return {
        text: "Agendada",
        class: "status-scheduled",
        icon: <FaCalendarAlt />,
      };
    }
    // active: reunião em andamento
    if (meeting.status === "active") {
      return { text: "Ativa", class: "status-active", icon: <FaClock /> };
    }
    // fallback
    return { text: "Desconhecido", class: "status-unknown", icon: <FaClock /> };
  };

  const renderMeetingFooter = (meeting, status) => {
    return (
      <div className="meeting-footer">
        <div className={`meeting-status ${status.class}`}>
          {status.icon}
          <span className="status-text">{status.text}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="meetings-list-container">
      <div className="meetings-header">
        <h2>{viewingArchived ? "Reuniões Arquivadas" : "Reuniões"}</h2>

        <div className="header-actions">
          {user && !viewingArchived && (
            <button className="create-meeting-btn" onClick={onCreateNewMeeting}>
              <FaPlus /> Nova Reunião
            </button>
          )}

          {user && (
            <button
              className="archive-btn"
              onClick={
                viewingArchived ? onBackToRegular : onViewArchivedMeetings
              }
            >
              {viewingArchived ? (
                <>
                  <FaFolderOpen /> Voltar
                </>
              ) : (
                <>
                  <FaArchive /> Arquivadas
                </>
              )}
            </button>
          )}

          {!user && (
            <button className="enter-meeting-btn" onClick={onEnterMeeting}>
              <FaKey /> Entrar em Reunião
            </button>
          )}
        </div>
      </div>

      {!user && (
        <div className="login-section">
          <p className="login-message">
            Faça login para acessar suas reuniões
          </p>
          <button className="login-btn" onClick={onLogin}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
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
            Criadas por mim ({meetings.created?.length || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === "participating" ? "active" : ""}`}
            onClick={() => setActiveTab("participating")}
          >
            Participando ({meetings.participating?.length || 0})
          </button>
        </div>
      )}

      <div className="meetings-content">
        {isLoading && <div className="loading">Carregando reuniões...</div>}

        {error && <div className="error-message">{error}</div>}

        {!isLoading && !error && user && (
          <div className="meetings-grid">
            {activeTab === "created" &&
              meetings.created?.map((meeting) => {
                const status = getMeetingStatus(meeting);
                return (
                  <div
                    key={meeting._id}
                    className="meeting-card"
                    onClick={() => onSelectMeeting(meeting)}
                  >
                    <div className="meeting-header">
                      <h3 className="meeting-title">{meeting.title}</h3>
                      <p className="meeting-description">
                        {meeting.description}
                      </p>
                    </div>

                    <div className="meeting-details">
                      <div className="meeting-date">
                        <FaCalendarAlt />
                        <span>
                          {formatDate(meeting.startDate, meeting.startTime)}
                        </span>
                      </div>
                      <div className="meeting-participants">
                        <span>
                          {meeting.participants?.length || 0} participantes
                        </span>
                      </div>
                    </div>

                    {renderMeetingFooter(meeting, status, true)}
                  </div>
                );
              })}

            {activeTab === "participating" &&
              meetings.participating?.map((meeting) => {
                const status = getMeetingStatus(meeting);
                return (
                  <div
                    key={meeting._id}
                    className="meeting-card"
                    onClick={() => onSelectMeeting(meeting)}
                  >
                    <div className="meeting-header">
                      <h3 className="meeting-title">{meeting.title}</h3>
                      <p className="meeting-description">
                        {meeting.description}
                      </p>
                    </div>

                    <div className="meeting-details">
                      <div className="meeting-date">
                        <FaCalendarAlt />
                        <span>
                          {formatDate(meeting.startDate, meeting.startTime)}
                        </span>
                      </div>
                      <div className="meeting-participants">
                        <span>
                          {meeting.participants?.length || 0} participantes
                        </span>
                      </div>
                    </div>

                    {renderMeetingFooter(meeting, status, false)}
                  </div>
                );
              })}

            {((activeTab === "created" && !meetings.created?.length) ||
              (activeTab === "participating" &&
                !meetings.participating?.length)) && (
                <div className="no-meetings">
                  <p>
                    {activeTab === "created"
                      ? "Você ainda não criou nenhuma reunião."
                      : "Você não está participando de nenhuma reunião."}
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingsList;

