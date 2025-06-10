import React, { useState, useEffect } from "react";
import {
  getUserArchivedMeetings,
  unarchiveMeeting,
  deleteMeeting,
} from "../firebase";
import { formatDate, formatISODate } from "../utils/dateHelpers";
import "../styles/ArchivedMeetings.css";

function ArchivedMeetings({ user, onBack, onViewMeeting }) {
  const [archivedMeetings, setArchivedMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

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

  const handleDelete = async (meeting) => {
    if (!user) return;

    if (
      !window.confirm(
        "Tem certeza que deseja excluir permanentemente esta reunião? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    setActionInProgress(meeting.id);

    try {
      await deleteMeeting(meeting.id, user.uid);
      // Remover da lista local
      setArchivedMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
      // Remover da lista principal de reuniões do usuário (opcional)
      // await remove(ref(database, `users/${userId}/meetings/${meetingId}`));
    } catch (error) {
      setError("Erro ao excluir a reunião");
      console.error(error);
    } finally {
      setActionInProgress(null);
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

  return (
    <div className="archived-meetings-container">
      <div className="archived-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>
        <h2>Reuniões Arquivadas</h2>
        <button className="refresh-button" onClick={loadArchivedMeetings}>
          Atualizar
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
                  <div
                    className="archived-meeting-info"
                    onClick={() => onViewMeeting(meeting)}
                  >
                    <h3>{meeting.name}</h3>
                    <p className="meeting-date">
                      {formatDate(meeting.startDate, meeting.startTime)}
                    </p>
                    {meeting.description && (
                      <p className="meeting-description">
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  <div className="archived-actions">
                    <button
                      className="unarchive-btn"
                      onClick={() => handleUnarchive(meeting)}
                      disabled={actionInProgress === meeting.id}
                    >
                      {actionInProgress === meeting.id
                        ? "Processando..."
                        : "Desarquivar"}
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(meeting)}
                      disabled={actionInProgress === meeting.id}
                    >
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
    </div>
  );
}

export default ArchivedMeetings;
