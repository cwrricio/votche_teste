import React from "react";
import "../styles/MeetingDetails.css";

function MeetingDetails({ meeting, user, onClose, onJoin, onLeave }) {
  // Formatar data para exibição
  const formatFullDateTime = (date, time) => {
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(`${date}T${time}`).toLocaleString("pt-BR", options);
  };

  // Determinar status atual da reunião
  const getMeetingStatus = (meeting) => {
    const now = new Date();
    const startDateTime = new Date(`${meeting.startDate}T${meeting.startTime}`);
    let endDateTime = null;

    if (meeting.hasEndTime) {
      endDateTime = new Date(`${meeting.endDate}T${meeting.endTime}`);
    }

    if (!meeting.active) {
      return { text: "Encerrada", class: "status-ended" };
    }

    if (startDateTime > now) {
      return { text: "Agendada", class: "status-scheduled" };
    }

    if (endDateTime && endDateTime < now) {
      return { text: "Finalizada", class: "status-ended" };
    }

    return { text: "Em andamento", class: "status-active" };
  };

  const meetingStatus = getMeetingStatus(meeting);

  return (
    <div className="meeting-details">
      <div className="meeting-details-header">
        <h2>Detalhes da Reunião</h2>
        {meeting.active && user && user.uid === meeting.createdBy && (
          <div className="meeting-password-container">
            <p className="meeting-password-label">Senha da reunião:</p>
            <p className="meeting-password">{meeting.password}</p>
            <p className="meeting-password-info">
              Compartilhe esta senha apenas com os participantes desejados
            </p>
          </div>
        )}
      </div>

      <div className="meeting-info-section">
        <p>
          <strong>Nome:</strong> {meeting.name}
        </p>
        {meeting.description && (
          <p>
            <strong>Descrição:</strong> {meeting.description}
          </p>
        )}
        <p>
          <strong>Data de Início:</strong>{" "}
          {formatFullDateTime(meeting.startDate, meeting.startTime)}
        </p>
        {meeting.hasEndTime ? (
          <p>
            <strong>Término previsto:</strong>{" "}
            {formatFullDateTime(meeting.endDate, meeting.endTime)}
          </p>
        ) : (
          <p>
            <strong>Duração:</strong> Sem tempo limite definido
          </p>
        )}
      </div>

      <div className={`meeting-status-badge ${meetingStatus.class}`}>
        {meetingStatus.text}
      </div>

      <div className="meeting-actions">
        <button onClick={onClose} className="btn-secondary">
          Fechar
        </button>
        {user && (
          <>
            {onJoin && (
              <button onClick={onJoin} className="btn-primary">
                Participar
              </button>
            )}
            {onLeave && (
              <button onClick={onLeave} className="btn-danger">
                Sair da reunião
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MeetingDetails;
