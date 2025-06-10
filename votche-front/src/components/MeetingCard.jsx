import React from "react";
import { formatDateTime } from "../utils/dateHelpers";

function MeetingCard({ meeting, isOwner, onSelect, onArchive }) {
  // Determinar o status da reunião
  const getStatus = () => {
    if (!meeting.active) {
      return { text: "Encerrada", class: "ended" };
    }

    const now = new Date();
    const startDateTime = new Date(`${meeting.startDate}T${meeting.startTime}`);

    if (startDateTime > now) {
      return { text: "Agendada", class: "scheduled" };
    } else {
      return { text: "Em andamento", class: "active" };
    }
  };

  const status = getStatus();

  // Handler para clique no botão de arquivar
  const handleArchive = (e) => {
    e.stopPropagation(); // Impedir propagação para o card
    onArchive(meeting);
  };

  return (
    <div className="meeting-card" onClick={() => onSelect(meeting)}>
      {isOwner && (
        <button
          className="archive-btn"
          onClick={handleArchive}
          title="Arquivar reunião"
        >
          <span className="archive-icon">📁</span>
        </button>
      )}

      <h3 className="meeting-title">{meeting.name}</h3>

      <p className="meeting-date">
        {formatDateTime(meeting.startDate, meeting.startTime)}
      </p>

      {meeting.description && (
        <p className="meeting-description">{meeting.description}</p>
      )}

      <div className={`meeting-status ${status.class}`}>{status.text}</div>
    </div>
  );
}

export default MeetingCard;
