import { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaArchive,
  FaSignInAlt,
  FaFolderOpen,
  FaPlus,
  FaKey,
  FaChartBar,
} from "react-icons/fa";
import { getAllActiveMeetings } from "../firebase";
import { useNavigate } from "react-router-dom";
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
  onLogin,
}) {
  const navigate = useNavigate();

  // Estado para controlar a tab ativa
  const [activeTab, setActiveTab] = useState(
    user ? "created" : "participating"
  );

  // Função auxiliar para formatar data/hora em vários formatos (string, ms, seconds, firebase Timestamp)
  const formatDateTime = (value) => {
    if (!value) return null;
    let date;
    try {
      // Firebase Timestamp object
      if (typeof value === "object" && value.seconds) {
        date = new Date(value.seconds * 1000);
      } else if (typeof value === "number") {
        // timestamp em ms ou s
        date = value > 1e12 ? new Date(value) : new Date(value * 1000); // heurística
      } else {
        // string ISO ou "YYYY-MM-DD" + etc.
        date = new Date(value);
      }
      if (isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return null;
    }
  };

  // Função auxiliar já existente para data de início (mantida)
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
      return { text: "Encerrada", class: "status-ended", icon: <FaClock /> };
    }

    const now = new Date();
    const meetingDate = new Date(meeting.startDate + "T" + meeting.startTime);

    if (meetingDate > now) {
      return {
        text: "Agendada",
        class: "status-scheduled",
        icon: <FaCalendarAlt />,
      };
    } else {
      return {
        text: "Em andamento",
        class: "status-active",
        icon: <FaClock />,
      };
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

  // Função para renderizar o rodapé dos cards de forma consistente
  const renderMeetingFooter = (meeting, status, isOwner) => {
    return (
      <div className="meeting-footer">
        <div className={`meeting-status ${status.class}`}>
          {status.icon}
          <span className="status-text">{status.text}</span>
        </div>

        {meeting.active && (
          <button
            className="meeting-enter-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMeeting(meeting);
            }}
          >
            <FaSignInAlt /> Acessar
          </button>
        )}
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

          {!viewingArchived ? (
            <button
              className="archive-view-btn"
              onClick={() => handleRequiresLogin(onViewArchivedMeetings)}
            >
              <FaFolderOpen /> Arquivadas
            </button>
          ) : (
            <button className="archive-view-btn" onClick={onBackToRegular}>
              <FaCalendarAlt /> Voltar às Ativas
            </button>
          )}

          <button
            className="archive-view-btn"
            onClick={() => handleRequiresLogin(onEnterMeeting)}
          >
            <FaKey /> Entrar com Senha
          </button>
        </div>
      </div>

      {!user && (
        <div className="login-section">
          <p className="login-message">
            Faça login para criar reuniões ou participar com seu perfil
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
        <div className="tabs-navigation">
          <button
            className={`tab-item ${activeTab === "created" ? "active" : ""}`}
            onClick={() => setActiveTab("created")}
            role="button"
            aria-selected={activeTab === "created"}
            tabIndex={0}
          >
            Minhas Reuniões
          </button>
          <button
            className={`tab-item ${
              activeTab === "participating" ? "active" : ""
            }`}
            onClick={() => setActiveTab("participating")}
            role="button"
            aria-selected={activeTab === "participating"}
            tabIndex={0}
          >
            Participando
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {isLoading ? (
        <div className="loading-state">Carregando reuniões...</div>
      ) : (
        <div>
          {/* Estados vazios para as abas */}
          {user && activeTab === "created" && meetings.created.length === 0 && (
            <div className="empty-state">
              <p>Você ainda não criou nenhuma reunião</p>
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

          <div className="meetings-grid">
            {/* Exibir reuniões criadas pelo usuário */}
            {user &&
              activeTab === "created" &&
              [...meetings.created]
                .sort((a, b) => {
                  // Garante que createdAt seja sempre timestamp numérico
                  const getTime = (m) => {
                    if (typeof m.createdAt === "number") return m.createdAt;
                    if (typeof m.createdAt === "string") {
                      const d = new Date(m.createdAt);
                      if (!isNaN(d.getTime())) return d.getTime();
                    }
                    return 0;
                  };
                  return getTime(b) - getTime(a);
                })
                .map((meeting) => {
                  const status = getMeetingStatus(meeting);
                  const isOwner = user && meeting.createdBy === user.uid;

                  // datas criadas/encerradas (fallbacks possíveis)
                  const createdAt =
                    meeting.createdAt ||
                    (meeting.createdDate && meeting.createdTime
                      ? `${meeting.createdDate}T${meeting.createdTime}`
                      : null);
                  const endedAt =
                    meeting.endedAt ||
                    (meeting.endDate && meeting.endTime
                      ? `${meeting.endDate}T${meeting.endTime}`
                      : null);

                  return (
                    <div
                      key={meeting.id}
                      className={`meeting-card ${
                        !meeting.active
                          ? "inactive"
                          : meeting.active
                          ? "active"
                          : ""
                      } ${viewingArchived ? "archived" : ""}`}
                      onClick={() => onSelectMeeting(meeting)}
                    >
                      {isOwner && (
                        <button
                          className="archive-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveMeeting(meeting.id); // Importante: passar meeting.id, não o meeting inteiro
                          }}
                          title="Arquivar reunião"
                        >
                          <FaArchive />
                        </button>
                      )}

                      <div className="meeting-card-content">
                        <h3 className="meeting-name">{meeting.name}</h3>

                        <div className="meeting-date">
                          <FaCalendarAlt />
                          <span>
                            {formatDate(meeting.startDate, meeting.startTime)}
                          </span>
                        </div>

                        {/* Metadados: criado / encerrado */}
                        <div className="meeting-meta">
                          {createdAt && (
                            <div className="meta-item created">
                              <small>Criado:</small>
                              <span>{formatDateTime(createdAt)}</span>
                            </div>
                          )}
                          {endedAt && (
                            <div className="meta-item ended">
                              <small>Encerra em:</small>
                              <span>{formatDateTime(endedAt)}</span>
                            </div>
                          )}
                        </div>

                        {meeting.description && (
                          <div className="meeting-description-container">
                            <p className="meeting-description">
                              {meeting.description}
                            </p>
                          </div>
                        )}

                        {isOwner && (
                          <div className="meeting-password">
                            <FaKey /> {meeting.password}
                          </div>
                        )}
                      </div>

                      {renderMeetingFooter(meeting, status, isOwner)}
                    </div>
                  );
                })}

            {/* Exibir reuniões que o usuário participa */}
            {user &&
              activeTab === "participating" &&
              meetings.participating.map((meeting) => {
                const status = getMeetingStatus(meeting);
                const isOwner = user && meeting.createdBy === user.uid;

                // Adicionar estas definições para evitar o erro
                const createdAt =
                  meeting.createdAt ||
                  (meeting.createdDate && meeting.createdTime
                    ? `${meeting.createdDate}T${meeting.createdTime}`
                    : null);
                const endedAt =
                  meeting.endedAt ||
                  (meeting.endDate && meeting.endTime
                    ? `${meeting.endDate}T${meeting.endTime}`
                    : null);

                return (
                  <div
                    key={meeting.id}
                    className={`meeting-card ${
                      !meeting.active
                        ? "inactive"
                        : meeting.active
                        ? "active"
                        : ""
                    }`}
                    onClick={() => onSelectMeeting(meeting)}
                  >
                    <div className="meeting-card-content">
                      <h3 className="meeting-name">
                        {meeting.name}
                        {!meeting.active && (
                          <span className="ended-badge">Encerrada</span>
                        )}
                      </h3>

                      <div className="meeting-date">
                        <FaCalendarAlt />
                        <span>
                          {formatDate(meeting.startDate, meeting.startTime)}
                        </span>
                      </div>

                      <div className="meeting-meta">
                        {createdAt && (
                          <div className="meta-item created">
                            <small>Criado:</small>
                            <span>{formatDateTime(createdAt)}</span>
                          </div>
                        )}
                        {endedAt && (
                          <div className="meta-item ended">
                            <small>Encerrado em:</small>
                            <span>{formatDateTime(endedAt)}</span>
                          </div>
                        )}
                      </div>

                      {meeting.description && (
                        <div className="meeting-description-container">
                          <p className="meeting-description">
                            {meeting.description}
                          </p>
                        </div>
                      )}

                      {/* Adicionar botão para visualização do relatório */}
                      {!meeting.active && (
                        <button
                          className="view-report-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/report?meetingId=${meeting.id}`);
                          }}
                        >
                          <FaChartBar /> Ver Relatório
                        </button>
                      )}
                    </div>

                    {renderMeetingFooter(meeting, status, isOwner)}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingsList;
