import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  listenToMeeting,
  listenToVotingsInMeeting,
  endMeeting,
  registerVoteInMeeting,
  endVoting,
  createVotingInMeeting,
} from "../firebase";
import CreateVotingForm from "./CreateVotingForm";
import "../styles/MeetingSession.css";
import VotingList from "./VotingList";
import { FaCopy, FaCheck } from "react-icons/fa";
// Importe o componente ConfirmModal
import ConfirmModal from "./ConfirmModal";

function MeetingSession({ meetingId, user, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [votings, setVotings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateVoting, setShowCreateVoting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados para criação de votação
  const [votingTitle, setVotingTitle] = useState("");
  const [votingOptions, setVotingOptions] = useState(["", ""]);
  const [votingDuration, setVotingDuration] = useState(5);
  const [isCreatingVoting, setIsCreatingVoting] = useState(false);

  // Estado para controlar qual votação está expandida
  const [expandedVotingId, setExpandedVotingId] = useState(null);

  // Adicionar estados para controlar os modais de confirmação
  const [showEndMeetingConfirm, setShowEndMeetingConfirm] = useState(false);
  const [showEndVotingConfirm, setShowEndVotingConfirm] = useState(false);
  const [votingToEnd, setVotingToEnd] = useState(null);

  useEffect(() => {
    // Verificar se temos um meetingId
    if (!meetingId) {
      setError("ID da reunião não encontrado");
      setIsLoading(false);
      return;
    }

    console.log(`Carregando reunião com ID: ${meetingId}`);

    // Escutar atualizações da reunião
    const unsubscribeMeeting = listenToMeeting(meetingId, (data) => {
      if (data) {
        console.log("Dados da reunião recebidos:", data);
        setMeeting(data);
      } else {
        console.error("Reunião não encontrada");
        setError("Reunião não encontrada. Verifique o PIN e tente novamente.");
      }
      setIsLoading(false);
    });

    // Escutar atualizações das votações
    const unsubscribeVotings = listenToVotingsInMeeting(meetingId, (data) => {
      console.log("Votações recebidas:", data);
      setVotings(data);
    });

    return () => {
      unsubscribeMeeting();
      unsubscribeVotings();
    };
  }, [meetingId]);

  // Função para encerrar a reunião
  const handleEndMeetingClick = () => {
    setShowEndMeetingConfirm(true);
  };

  const confirmEndMeeting = async () => {
    try {
      await endMeeting(meetingId, user.uid);
      setShowEndMeetingConfirm(false);
    } catch (error) {
      setError(error.message || "Erro ao encerrar reunião");
      setShowEndMeetingConfirm(false);
    }
  };

  // Função para registrar um voto
  const handleVote = async (votingId, option) => {
    try {
      await registerVoteInMeeting(meetingId, votingId, option, user.uid);
    } catch (error) {
      setError(error.message || "Erro ao registrar voto");
    }
  };

  // Função para encerrar uma votação
  const handleEndVotingClick = (votingId) => {
    setVotingToEnd(votingId);
    setShowEndVotingConfirm(true);
  };

  const confirmEndVoting = async () => {
    try {
      await endVoting(meetingId, votingToEnd, user.uid);
      setShowEndVotingConfirm(false);
      setVotingToEnd(null);
    } catch (error) {
      setError(error.message || "Erro ao encerrar votação");
      setShowEndVotingConfirm(false);
    }
  };

  // Funções para criação de votação
  const handleAddOption = () => {
    setVotingOptions([...votingOptions, ""]);
  };

  const handleRemoveOption = (index) => {
    if (votingOptions.length <= 2) {
      setError("Uma votação precisa ter pelo menos 2 opções");
      return;
    }
    const newOptions = [...votingOptions];
    newOptions.splice(index, 1);
    setVotingOptions(newOptions);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...votingOptions];
    newOptions[index] = value;
    setVotingOptions(newOptions);
  };

  // Modificar a função handleCreateVoting para receber dados ao invés de evento
  const handleCreateVoting = async (formData) => {
    setError("");

    try {
      setIsCreatingVoting(true);
      await createVotingInMeeting(
        meetingId,
        formData.title.trim(),
        Object.keys(formData.options),
        15, // Duração padrão em minutos (pode ser ajustada conforme necessidade)
        user.uid
      );

      // Resetar formulário
      setShowCreateVoting(false);
    } catch (error) {
      setError(error.message || "Erro ao criar votação");
    } finally {
      setIsCreatingVoting(false);
    }
  };

  // Função auxiliar para formatar data/hora
  const formatDateTime = (dateStr, timeStr) => {
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

  // Verificar se o usuário já votou em uma votação específica
  const hasVoted = (voting) => {
    return voting.voters && voting.voters[user.uid];
  };

  // Verificar se uma votação está ativa
  const isVotingActive = (voting) => {
    return voting.active && voting.endTime > Date.now();
  };

  // Função para copiar o código da reunião
  const handleCopyCode = () => {
    if (!meeting || !meeting.password) return;

    navigator.clipboard
      .writeText(meeting.password)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Erro ao copiar: ", err));
  };

  // Adicionar esta nova função dentro do componente MeetingSession
  const handleUseDefaultOptions = () => {
    setVotingOptions(["Concordo", "Discordo", "Me abstenho"]);
  };

  if (isLoading) {
    return <div className="loading">Carregando reunião...</div>;
  }

  if (!meeting) {
    return (
      <div className="error-state">
        <h3>Erro</h3>
        <p>{error || "Reunião não encontrada"}</p>
        <button className="back-button" onClick={onBack}>
          Voltar
        </button>
      </div>
    );
  }

  const isOwner = meeting && user && meeting.createdBy === user.uid;

  return (
    <div className="meeting-session">
      <div className="meeting-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>

        {isOwner && meeting.active && (
          <button className="end-meeting-btn" onClick={handleEndMeetingClick}>
            Encerrar Reunião
          </button>
        )}
      </div>

      <div className="meeting-info">
        <h2>{meeting.name}</h2>
        <p className="meeting-datetime">
          {formatDateTime(meeting.startDate, meeting.startTime)}
        </p>
        {meeting.description && (
          <p className="meeting-description">{meeting.description}</p>
        )}

        {/* Seção com senha e QR Code sempre visível */}
        {isOwner && (
          <div className="meeting-password-container">
            <div className="password-info-column">
              <p className="password-label">Senha da reunião:</p>
              <div className="password-display-row">
                <strong className="meeting-password">{meeting.password}</strong>
                <button
                  className={`copy-button ${copied ? "copied" : ""}`}
                  onClick={handleCopyCode}
                  title="Copiar senha"
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                </button>
              </div>
              <p className="password-sharing-tip">
                Compartilhe esta senha com os participantes que você deseja
                convidar para a reunião.
              </p>
            </div>

            <div className="qr-code-container">
              <QRCodeSVG
                value={meeting.password}
                size={180}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"M"}
                includeMargin={true}
              />
              <p className="qr-code-info">
                Participantes podem escanear este QR Code para entrar na reunião
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Após a div meeting-info */}
      {isOwner && meeting.active && (
        <div className="owner-actions-banner">
          <div className="owner-icon">👑</div>
          <div className="owner-message">
            <strong>Você é o organizador desta reunião.</strong>
            <p>Use o botão "+ Nova Votação" abaixo para iniciar votações.</p>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="meeting-content">
        {/* Componente de votação aprimorado */}
        {showCreateVoting ? (
          <CreateVotingForm
            onSubmit={handleCreateVoting}
            onCancel={() => setShowCreateVoting(false)}
          />
        ) : (
          <VotingList
            votings={votings}
            isOwner={isOwner}
            onVote={handleVote}
            onEndVoting={handleEndVotingClick}
            onCreateVoting={() => setShowCreateVoting(true)}
            participants={meeting?.participants || {}}
          />
        )}
      </div>

      {/* Adicionar os modais de confirmação */}
      <ConfirmModal
        open={showEndMeetingConfirm}
        title="Encerrar Reunião"
        message="Tem certeza que deseja encerrar esta reunião? Todas as votações ativas também serão encerradas."
        confirmLabel="Encerrar Reunião"
        cancelLabel="Cancelar"
        onConfirm={confirmEndMeeting}
        onCancel={() => setShowEndMeetingConfirm(false)}
      />

      <ConfirmModal
        open={showEndVotingConfirm}
        title="Encerrar Votação"
        message="Tem certeza que deseja encerrar esta votação? Os participantes não poderão mais votar."
        confirmLabel="Encerrar Votação"
        cancelLabel="Cancelar"
        onConfirm={confirmEndVoting}
        onCancel={() => setShowEndVotingConfirm(false)}
      />
    </div>
  );
}

export default MeetingSession;
