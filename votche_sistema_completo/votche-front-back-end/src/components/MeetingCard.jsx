import React from "react";
import { FaCalendarAlt, FaInfoCircle } from "react-icons/fa";

function MeetingCard({ meeting, isOwner, onSelect, onArchive }) {
  // Determinar o status da reunião
  const getStatus = () => {
    if (!meeting.active) {
      return { text: "Encerra em", class: "status-ended" };
    }

    const now = new Date();
    const startDateTime = new Date(`${meeting.startDate}T${meeting.startTime}`);

    if (startDateTime > now) {
      return { text: "Agendada", class: "status-scheduled" };
    } else {
      return { text: "Em andamento", class: "status-active" };
    }
  };

  const status = getStatus();

  return (
    <div className="meeting-card" onClick={() => onSelect(meeting)}>
      <h3 className="meeting-name">{meeting.name}</h3>

      <p className="meeting-date">
        <FaCalendarAlt /> {`${meeting.startDate} às ${meeting.startTime}`}
      </p>

      {meeting.description && (
        <p className="meeting-description">
          <FaInfoCircle /> {meeting.description}
        </p>
      )}

      <div className="meeting-footer">
        <span className={`meeting-status ${status.class}`}>{status.text}</span>
        {isOwner && (
          <button
            className="meeting-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(meeting);
            }}
          >
            Arquivar
          </button>
        )}
      </div>
    </div>
  );
}

export default MeetingCard;
