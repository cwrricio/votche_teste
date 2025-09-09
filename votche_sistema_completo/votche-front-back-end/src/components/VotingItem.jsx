// Componente de votação aprimorado
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaVoteYea,
  FaChartBar,
  FaStop,
  FaCheck,
  FaLock,
  FaUserSecret,
} from "react-icons/fa";
import "../styles/VotingItem.css"; // CSS específico para o componente

function VotingItem({
  id,
  meetingId,
  title,
  isActive,
  isAnonymous = false,
  endTime,
  options,
  onEndVoting,
  totalVotes = 0,
  onVote,
}) {
  // Timer de contagem regressiva
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!isActive || !endTime) {
      setTimeLeft(null);
      return;
    }
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isActive, endTime]);

  // Função para formatar segundos em mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const navigate = useNavigate();
  const [tempSelectedOption, setTempSelectedOption] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [voted, setVoted] = useState(false);

  const handleSelectOption = (option) => {
    if (!voted) {
      setTempSelectedOption(option);
    }
  };

  const handleConfirmVote = () => {
    if (!voted && tempSelectedOption) {
      setSelectedOption(tempSelectedOption);
      setVoted(true);
      // Chamar a função para registrar o voto
      if (onVote) onVote(tempSelectedOption);
    }
  };

  const handleViewReport = () => {
    // Navegar para o dashboard de relatórios com o ID da votação específica
    navigate(`/reports?meetingId=${meetingId}&votingId=${id}`);
  };

  return (
    <div className="voting-container">
      <div className="voting-header">
        <div className="voting-title-container">
          <h3 className="voting-title">{title}</h3>
          {isAnonymous && (
            <span className="voting-anonymous-badge">
              <FaUserSecret /> Anônima
            </span>
          )}
        </div>
        <span className={`voting-status ${isActive ? "active" : ""}`}>
          {isActive ? (
            timeLeft !== null ? (
              <>
                Ativa — <span className="voting-timer">{formatTime(timeLeft)}</span>
              </>
            ) : (
              "Ativa"
            )
          ) : (
            "Encerrada"
          )}
        </span>
      </div>

      <div className="voting-body">
        <div className="voting-options">
          {/* Renderização dinâmica das opções de votação com contagem de votos */}
          {Array.isArray(options)
            ? options.map((option) => (
              <button
                key={option}
                className={`vote-option-btn ${tempSelectedOption === option ? "temp-selected" : ""} ${selectedOption === option ? "selected" : ""}`}
                onClick={() => handleSelectOption(option)}
                disabled={voted}
              >
                {option}
                {typeof options === 'object' && options[option] !== undefined && (
                  <span className="vote-count"> ({options[option]})</span>
                )}
              </button>
            ))
            : options && typeof options === 'object'
              ? Object.keys(options).map((option) => (
                <button
                  key={option}
                  className={`vote-option-btn ${tempSelectedOption === option ? "temp-selected" : ""} ${selectedOption === option ? "selected" : ""}`}
                  onClick={() => handleSelectOption(option)}
                  disabled={voted}
                >
                  {option}
                  <span className="vote-count"> ({options[option] || 0})</span>
                </button>
              ))
              : null}

          {tempSelectedOption && !voted && (
            <button className="confirm-vote-btn" onClick={handleConfirmVote}>
              <FaCheck /> Confirmar Voto
            </button>
          )}
        </div>
      </div>

      <div className="voting-footer">
        <div className="total-votes">
          <FaVoteYea className="vote-count-icon" />
          Total: {totalVotes} votos
        </div>

        <div className="action-buttons">
          <button className="action-btn btn-danger" onClick={onEndVoting}>
            <FaStop /> Encerrar Votação
          </button>

          <button className="action-btn btn-success" onClick={handleViewReport}>
            <FaChartBar /> Ver Relatório
          </button>
        </div>
      </div>
    </div>
  );
}

// Uso do componente
function VotingsList() {
  return (
    <div>
      <h2 className="votacoes-title">Votações</h2>

      <VotingItem
        title="votando"
        isActive={true}
        onEndVoting={() => console.log("Encerrar votação")}
        onViewDetails={() => console.log("Ver detalhes")}
      />

      <VotingItem
        title="o ema é lindo"
        isActive={true}
        onEndVoting={() => console.log("Encerrar votação")}
        onViewDetails={() => console.log("Ver detalhes")}
      />
    </div>
  );
}

// Exportar o componente para uso em outros arquivos
export default VotingItem;
