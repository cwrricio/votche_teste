// Componente de votação aprimorado
import React, { useState } from "react";
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
  onEndVoting,
  totalVotes = 0,
  onVote,
  options = { Concordo: 0, Discordo: 0, "Me abstenho": 0 },
}) {
  const navigate = useNavigate();
  const [tempSelectedOption, setTempSelectedOption] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [voted, setVoted] = useState(false);

  const optionKeys = Object.keys(options);

  const handleSelectOption = (option) => {
    if (!voted) {
      setTempSelectedOption(option);
    }
  };

  const handleConfirmVote = () => {
    if (!voted && tempSelectedOption) {
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
          {isActive ? "Ativa" : "Encerrada"}
        </span>
      </div>


      <div className="voting-body">
        <div className="voting-options">
          {optionKeys.map((option) => (
            <button
              key={option}
              className={`vote-option-btn ${tempSelectedOption === option ? "temp-selected" : ""
                } ${selectedOption === option ? "selected" : ""}`}
              onClick={() => handleSelectOption(option)}
              disabled={voted}
            >
              {option}
            </button>
          ))}
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
          {isActive && onEndVoting && (
            <button className="action-btn btn-danger" onClick={onEndVoting}>
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

export default VotingItem;
