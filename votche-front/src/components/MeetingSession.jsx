import { useState, useEffect } from "react";
import {
  listenToMeeting,
  listenToVotingsInMeeting,
  endMeeting,
  createVotingInMeeting,
  registerVoteInMeeting,
  endVoting,
} from "../firebase";
import "../styles/MeetingSession.css";
import VotingReport from "./VotingReport";

function MeetingSession({ meetingId, user, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [votings, setVotings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateVoting, setShowCreateVoting] = useState(false);
  const [showVotingReport, setShowVotingReport] = useState(false);

  // Estados para criação de votação
  const [votingTitle, setVotingTitle] = useState("");
  const [votingOptions, setVotingOptions] = useState(["", ""]);
  const [votingDuration, setVotingDuration] = useState(5);
  const [isCreatingVoting, setIsCreatingVoting] = useState(false);

  // Estado para controlar qual votação está expandida
  const [expandedVotingId, setExpandedVotingId] = useState(null);

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
  const handleEndMeeting = async () => {
    if (!confirm("Tem certeza que deseja encerrar esta reunião?")) {
      return;
    }

    try {
      await endMeeting(meetingId, user.uid);
    } catch (error) {
      setError(error.message || "Erro ao encerrar reunião");
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
  const handleEndVoting = async (votingId) => {
    if (!confirm("Tem certeza que deseja encerrar esta votação?")) {
      return;
    }

    try {
      await endVoting(meetingId, votingId, user.uid);
    } catch (error) {
      setError(error.message || "Erro ao encerrar votação");
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

  const handleCreateVoting = async (e) => {
    e.preventDefault();
    setError("");

    // Validações
    if (!votingTitle.trim()) {
      setError("Informe um título para a votação");
      return;
    }

    const validOptions = votingOptions.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) {
      setError("Informe pelo menos 2 opções válidas");
      return;
    }

    if (votingDuration < 1) {
      setError("A duração mínima é de 1 minuto");
      return;
    }

    try {
      setIsCreatingVoting(true);
      await createVotingInMeeting(
        meetingId,
        votingTitle.trim(),
        validOptions,
        votingDuration,
        user.uid
      );

      // Resetar formulário
      setVotingTitle("");
      setVotingOptions(["", ""]);
      setVotingDuration(5);
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

  const isCreator = meeting.createdBy === user.uid;

  return (
    <div className="meeting-session">
      <div className="meeting-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>

        {isCreator && meeting.active && (
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

        {isCreator && (
          <div className="meeting-password-info">
            <p>
              Senha desta reunião: <strong>{meeting.password}</strong>
            </p>
            <p>Compartilhe esta senha com os participantes</p>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="meeting-content">
        <div className="votings-section">
          <div className="section-header">
            <h3>Votações</h3>
            {isCreator && meeting.active && (
              <button
                className="create-voting-btn"
                onClick={() => setShowCreateVoting(!showCreateVoting)}
              >
                {showCreateVoting ? "Cancelar" : "+ Nova Votação"}
              </button>
            )}
          </div>

          {showCreateVoting && (
            <div className="create-voting-form">
              <h4>Criar Nova Votação</h4>
              <form onSubmit={handleCreateVoting}>
                <div className="form-group">
                  <label htmlFor="votingTitle">Pergunta da Votação</label>
                  <input
                    type="text"
                    id="votingTitle"
                    value={votingTitle}
                    onChange={(e) => setVotingTitle(e.target.value)}
                    placeholder="Ex: Qual o melhor dia para a próxima reunião?"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Opções de Resposta</label>
                  {votingOptions.map((option, index) => (
                    <div key={index} className="option-input">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(index, e.target.value)
                        }
                        placeholder={`Opção ${index + 1}`}
                        required
                      />
                      <button
                        type="button"
                        className="remove-option"
                        onClick={() => handleRemoveOption(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-option-btn"
                    onClick={handleAddOption}
                  >
                    + Adicionar Opção
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="votingDuration">Duração (minutos)</label>
                  <input
                    type="number"
                    id="votingDuration"
                    value={votingDuration}
                    onChange={(e) =>
                      setVotingDuration(parseInt(e.target.value) || 0)
                    }
                    min="1"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isCreatingVoting}
                >
                  {isCreatingVoting ? "Criando..." : "Criar Votação"}
                </button>
              </form>
            </div>
          )}

          {votings.length === 0 ? (
            <div className="empty-votings">
              <p>Nenhuma votação criada nesta reunião</p>
              {isCreator && meeting.active && !showCreateVoting && (
                <button
                  className="create-voting-btn"
                  onClick={() => setShowCreateVoting(true)}
                >
                  Criar Primeira Votação
                </button>
              )}
            </div>
          ) : (
            <div className="votings-list">
              {votings.map((voting) => (
                <div key={voting.id} className="voting-card">
                  <div
                    className="voting-card-header"
                    onClick={() =>
                      setExpandedVotingId(
                        expandedVotingId === voting.id ? null : voting.id
                      )
                    }
                  >
                    <h4>{voting.title}</h4>
                    <div className="voting-status">
                      {voting.active ? (
                        voting.endTime > Date.now() ? (
                          <span className="status-active">Ativa</span>
                        ) : (
                          <span className="status-ended">Encerrada</span>
                        )
                      ) : (
                        <span className="status-ended">Encerrada</span>
                      )}
                      <span className="expand-icon">
                        {expandedVotingId === voting.id ? "▼" : "▶"}
                      </span>
                    </div>
                  </div>

                  {expandedVotingId === voting.id && (
                    <div className="voting-card-content">
                      {hasVoted(voting) && (
                        <div className="voted-badge">
                          Você já votou nesta votação
                        </div>
                      )}

                      <div className="voting-options">
                        {Object.entries(voting.options).map(
                          ([option, count]) => {
                            const totalVotes = Object.values(
                              voting.options
                            ).reduce((a, b) => a + b, 0);
                            const percentage =
                              totalVotes > 0
                                ? Math.round((count / totalVotes) * 100)
                                : 0;

                            return (
                              <div key={option} className="voting-option">
                                <div className="option-header">
                                  <span className="option-text">{option}</span>
                                  <span className="vote-count">
                                    {count} voto{count !== 1 ? "s" : ""} (
                                    {percentage}%)
                                  </span>
                                </div>

                                <div className="progress-bar-container">
                                  <div
                                    className="progress-bar"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>

                                {isVotingActive(voting) &&
                                  !hasVoted(voting) && (
                                    <button
                                      className="vote-button"
                                      onClick={() =>
                                        handleVote(voting.id, option)
                                      }
                                    >
                                      Votar
                                    </button>
                                  )}
                              </div>
                            );
                          }
                        )}
                      </div>

                      {isCreator && voting.active && (
                        <button
                          className="end-voting-btn"
                          onClick={() => handleEndVoting(voting.id)}
                        >
                          Encerrar Votação
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {votings.length > 0 && (
          <div className="report-button-container">
            <button
              className="view-report-btn"
              onClick={() => setShowVotingReport(true)}
            >
              Ver Relatório Completo
            </button>
          </div>
        )}

        {showVotingReport && (
          <VotingReport
            meetingId={meetingId}
            votings={votings}
            onClose={() => setShowVotingReport(false)}
          />
        )}
      </div>
    </div>
  );
}

export default MeetingSession;
