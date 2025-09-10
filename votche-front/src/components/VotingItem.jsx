// Componente de votação aprimorado
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaVoteYea,
  FaChartBar,
  FaStop,
  FaCheck,
  FaUserSecret,
} from "react-icons/fa";
import "../styles/VotingItem.css";

function VotingItem({
  id,
  meetingId,
  title,
  isActive,
  isAnonymous = false,
  endTime,
  onEndVoting,
  totalVotes = 0,
  onVote,
  isOwner = false,
  options = {}, // agora é objeto { chave: { text, count } }
  votingType = "single",
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
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const navigate = useNavigate();
  // Para single: string, para multi: array
  const [tempSelectedOption, setTempSelectedOption] = useState(votingType === "multi" ? [] : null);
  const [selectedOption, setSelectedOption] = useState(votingType === "multi" ? [] : null);
  // Extrair lista de chaves
  const optionKeys = Object.keys(options);
  const [voted, setVoted] = useState(false);

  const handleSelectOption = (option) => {
    if (voted) return;
    if (votingType === "multi") {
      setTempSelectedOption((prev) => {
        if (prev.includes(option)) {
          return prev.filter((o) => o !== option);
        } else {
          return [...prev, option];
        }
      });
    } else {
      setTempSelectedOption(option);
    }
  };

  const handleConfirmVote = () => {
    if (voted) return;
    if (votingType === "multi") {
      if (tempSelectedOption.length === 0) return;
      setSelectedOption(tempSelectedOption);
      setVoted(true);
      if (onVote) onVote(tempSelectedOption);
    } else {
      if (!tempSelectedOption) return;
      setSelectedOption(tempSelectedOption);
      setVoted(true);
      if (onVote) onVote(tempSelectedOption);
    }
  };

  const handleViewReport = () => {
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
                Ativa —{" "}
                <span className="voting-timer">{formatTime(timeLeft)}</span>
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
          {votingType === "multi"
            ? optionKeys.map((key) => (
              <label key={key} className={`vote-checkbox-label ${tempSelectedOption.includes(key) ? "temp-selected" : ""} ${selectedOption && selectedOption.includes(key) ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={tempSelectedOption.includes(key)}
                  onChange={() => handleSelectOption(key)}
                  disabled={voted}
                />{' '}
                {options[key]?.text || key}
              </label>
            ))
            : optionKeys.map((key) => (
              <button
                key={key}
                className={`vote-option-btn ${tempSelectedOption === key ? "temp-selected" : ""} ${selectedOption === key ? "selected" : ""}`}
                onClick={() => handleSelectOption(key)}
                disabled={voted}
              >
                {options[key]?.text || key}
              </button>
            ))}

          {((votingType === "multi" && tempSelectedOption.length > 0) || (votingType !== "multi" && tempSelectedOption)) && !voted && (
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
          {isOwner && isActive && (
            <button
              className="action-btn btn-danger"
              onClick={() => onEndVoting(id)}
            >
              <FaStop /> Encerrar Votação
            </button>
          )}

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
        endTime={Date.now() + 60000} // 1 minuto
        onEndVoting={() => console.log("Encerrar votação")}
        onViewDetails={() => console.log("Ver detalhes")}
        options={["Concordo", "Discordo", "Me abstenho"]}
      />

      <VotingItem
        title="o ema é lindo"
        isActive={true}
        endTime={Date.now() + 120000} // 2 minutos
        onEndVoting={() => console.log("Encerrar votação")}
        onViewDetails={() => console.log("Ver detalhes")}
        options={["Sim", "Não", "Talvez"]}
      />
    </div>
  );
}

export default VotingItem;
