import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FaChartBar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../styles/MeetingDetails.css";

function MeetingDetails({ meeting, user, onClose, onJoin, onLeave }) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

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

  // Função para copiar o código da reunião
  const handleCopyCode = () => {
    navigator.clipboard
      .writeText(meeting.password)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Erro ao copiar: ", err));
  };

  return (
    <div className="meeting-details-modal">
      <div className="meeting-details-header">
        <h2>Detalhes da Reunião</h2>
        {meeting.active && user && user.uid === meeting.createdBy && (
          <div className="meeting-password-container">
            <p className="meeting-password-label">Senha da reunião:</p>
            <div className="meeting-password-with-copy">
              <p className="meeting-password">{meeting.password}</p>
              <button
                className="copy-button"
                onClick={handleCopyCode}
                title="Copiar código"
              >
                {copied ? "✓" : "📋"}
              </button>
              <button
                className="qr-code-toggle"
                onClick={() => setShowQRCode(!showQRCode)}
                title={showQRCode ? "Ocultar QR Code" : "Mostrar QR Code"}
              >
                {showQRCode ? "🔼" : "🔽"}
              </button>
            </div>
            {showQRCode && (
              <div className="qr-code-container">
                <QRCodeSVG
                  value={meeting.password}
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"L"}
                  includeMargin={true}
                />
                <p className="qr-code-info">
                  Escaneie este QR Code para entrar na reunião
                </p>
              </div>
            )}
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

      {/* Adicionar seção de relatório para reuniões encerradas */}
      {!meeting.active && (
        <div className="meeting-report-section">
          <h4>Relatório de Votações</h4>
          <p>
            Esta reunião foi encerrada. Você pode visualizar o relatório
            completo das votações.
          </p>
          <button
            className="view-report-button"
            onClick={() => {
              onClose();
              navigate(`/report?meetingId=${meeting.id}`);
            }}
          >
            <FaChartBar /> Ver Relatório Completo
          </button>
        </div>
      )}
    </div>
  );
}

export default MeetingDetails;
