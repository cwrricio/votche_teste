import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch } from "../utils/api";
import VotingList from "./VotingList";
import CreateVotingForm from "./CreateVotingForm";

function MeetingSession({ meetingId, user, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [votings, setVotings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateVoting, setShowCreateVoting] = useState(false); // Used for creating voting
  const [copied, setCopied] = useState(false); // Used for copying meeting code



  useEffect(() => {
    if (!meetingId) {
      setError("ID da reunião não encontrado");
      setIsLoading(false);
      return;
    }
    async function fetchMeetingAndQuestions() {
      try {
        setIsLoading(true);
        const meetingData = await apiFetch(`/meetings/${meetingId}`, { credentials: "include" });
        setMeeting(meetingData);
        // As perguntas (questions) já vêm no objeto meetingData.questions
        setVotings(meetingData.questions || []);
      } catch {
        setError("Erro ao carregar dados da reunião ou perguntas");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMeetingAndQuestions();
  }, [meetingId]);

  // Função para encerrar a reunião via API
  const handleEndMeeting = async () => {
    if (!confirm("Tem certeza que deseja encerrar esta reunião?")) {
      return;
    }
    try {
      await apiFetch(`/meetings/${meetingId}/end`, {
        method: "POST",
        credentials: "include",
      });
      // Atualizar status localmente
      setMeeting((prev) => ({ ...prev, active: false }));
    } catch (error) {
      setError(error.message || "Erro ao encerrar reunião");
    }
  };

  // Função para registrar um voto via API
  const handleVote = async (votingId, option) => {
    try {
      await apiFetch(`/meetings/${meetingId}/votings/${votingId}/vote`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ userId: user._id, option }),
      });
      // Opcional: atualizar votações localmente
    } catch (error) {
      setError(error.message || "Erro ao registrar voto");
    }
  };

  // Função para encerrar uma votação via API
  const handleEndVoting = async (votingId) => {
    if (!confirm("Tem certeza que deseja encerrar esta votação?")) {
      return;
    }
    try {
      await apiFetch(`/meetings/${meetingId}/votings/${votingId}/end`, {
        method: "POST",
        credentials: "include",
      });
      // Opcional: atualizar votações localmente
    } catch (error) {
      setError(error.message || "Erro ao encerrar votação");
    }
  };

  // Funções para criação de votação


  // Novo handleCreateVoting para múltiplas perguntas
  const handleCreateVoting = async (questions) => {
    setError("");
    try {
      // Envia cada pergunta como uma nova questão (question) para o backend
      for (const q of questions) {
        await apiFetch(`/meetings/${meetingId}/questions`, {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            question: q.title,
            choices: q.options, // array de strings
            type: q.type,
            createdBy: user._id,
          }),
        });
      }
      setShowCreateVoting(false);
    } catch (error) {
      setError(error.message || "Erro ao criar votação");
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
    } catch {
      return `${dateStr} ${timeStr}`;
    }
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

  const isOwner = meeting.createdBy === user.uid;

  return (
    <div className="meeting-session">
      <div className="meeting-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>

        {isOwner && meeting.active && (
          <button className="end-meeting-btn" onClick={handleEndMeeting}>
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
            votings={votings.map(v => ({
              ...v,
              options: v.options || { Concordo: 0, Discordo: 0, "Me abstenho": 0 }
            }))}
            isOwner={isOwner}
            onVote={handleVote}
            onEndVoting={handleEndVoting}
            onCreateVoting={() => setShowCreateVoting(true)}
          />
        )}
      </div>
    </div>
  );
}

export default MeetingSession;
