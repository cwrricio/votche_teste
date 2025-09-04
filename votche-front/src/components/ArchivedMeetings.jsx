import React, { useState, useEffect } from "react";
import {
  FaArchive,
  FaTrash,
  FaUndo,
  FaCalendarAlt,
  FaSyncAlt,
  FaClock,
} from "react-icons/fa";
import {
  getUserArchivedMeetings,
  unarchiveMeeting,
  deleteMeeting,
} from "../firebase";
import { formatDate } from "../utils/dateHelpers";
import "../styles/ArchivedMeetings.css";
import ConfirmModal from "./ConfirmModal";

function ArchivedMeetings({ user, onBack, onViewMeeting }) {
  const [archivedMeetings, setArchivedMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    loadArchivedMeetings();
  }, [user]);

  const loadArchivedMeetings = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const meetings = await getUserArchivedMeetings(user.uid);
      setArchivedMeetings(meetings);
    } catch (error) {
      setError("Erro ao carregar reuniões arquivadas");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchive = async (meeting) => {
    if (!user) return;

    setActionInProgress(meeting.id);

    try {
      await unarchiveMeeting(meeting.id, user.uid);
      // Remover da lista local
      setArchivedMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
    } catch (error) {
      setError("Erro ao desarquivar a reunião");
      console.error(error);
    } finally {
      setActionInProgress(null);
    }
  };

  // Abrir modal de confirmação antes de deletar
  const handleDelete = (meeting) => {
    if (!user) return;
    setConfirmTarget(meeting);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget || !user) {
      setConfirmOpen(false);
      return;
    }

    setConfirmLoading(true);
    setActionInProgress(confirmTarget.id);

    try {
      await deleteMeeting(confirmTarget.id, user.uid);
      setArchivedMeetings((prev) =>
        prev.filter((m) => m.id !== confirmTarget.id)
      );
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (error) {
      setError("Erro ao excluir a reunião");
      console.error(error);
    } finally {
      setConfirmLoading(false);
      setActionInProgress(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  // Verificar status da reunião
  const getMeetingStatus = (meeting) => {
    if (!meeting.active) {
      return { text: "Encerrada", class: "status-ended" };
    }

    const now = new Date();
    const meetingDate = new Date(meeting.startDate + "T" + meeting.startTime);

    if (meetingDate > now) {
      return { text: "Agendada", class: "status-scheduled" };
    } else {
      return { text: "Em andamento", class: "status-active" };
    }
  };

  // Formatar data para exibição legível
  const formatDisplayDate = (dateStr, timeStr) => {
    try {
      const date = new Date(`${dateStr}T${timeStr}`);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  return (
    <div className="archived-meetings-container">
      <div className="archived-header">
        <button className="back-button" onClick={onBack}>
          <FaUndo /> Voltar
        </button>
        <h2>Reuniões Arquivadas</h2>
        <button className="refresh-button" onClick={loadArchivedMeetings}>
          <FaSyncAlt /> Atualizar
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {isLoading ? (
        <div className="loading-state">Carregando reuniões arquivadas...</div>
      ) : (
        <div className="archived-meetings-list">
          {archivedMeetings.length === 0 ? (
            <div className="empty-state">
              <p>Você não possui reuniões arquivadas</p>
            </div>
          ) : (
            archivedMeetings.map((meeting) => {
              const status = getMeetingStatus(meeting);

              return (
                <div className="archived-meeting-card" key={meeting.id}>
                  <div className="archived-meeting-info">
                    <h3>{meeting.name}</h3>

                    <div className="meeting-meta">
                      <span className={`meeting-status ${status.class}`}>
                        <FaClock /> {status.text}
                      </span>
                      <span className="meeting-date">
                        <FaCalendarAlt />
                        {formatDisplayDate(
                          meeting.startDate,
                          meeting.startTime
                        )}
                      </span>
                    </div>

                    {meeting.description && (
                      <p className="meeting-description">
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  <div className="archived-meeting-actions">
                    <button
                      className="unarchive-btn"
                      onClick={() => handleUnarchive(meeting)}
                      disabled={actionInProgress === meeting.id}
                      title="Desarquivar reunião"
                    >
                      <FaUndo />
                      {actionInProgress === meeting.id
                        ? "Processando..."
                        : "Desarquivar"}
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(meeting)}
                      disabled={actionInProgress === meeting.id}
                      title="Excluir permanentemente"
                    >
                      <FaTrash />
                      {actionInProgress === meeting.id
                        ? "Processando..."
                        : "Excluir"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal de confirmação aprimorado */}
      <ConfirmModal
        open={confirmOpen}
        title="Excluir reunião"
        message={
          confirmTarget
            ? `Tem certeza que deseja excluir permanentemente a reunião "${confirmTarget.name}"? Esta ação não pode ser desfeita.`
            : "Tem certeza que deseja excluir esta reunião?"
        }
        confirmLabel="Excluir permanentemente"
        cancelLabel="Cancelar"
        loading={confirmLoading}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default ArchivedMeetings;
