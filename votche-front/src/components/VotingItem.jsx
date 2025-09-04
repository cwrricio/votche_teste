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
  isAnonymous = false, // Nova propriedade para indicar se a votação é anônima
  onEndVoting,
  totalVotes = 0,
  onVote,
}) {
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
          {isActive ? "Ativa" : "Encerrada"}
        </span>
      </div>

      <div className="voting-body">
        <div className="voting-options">
          <button
            className={`vote-option-btn ${
              tempSelectedOption === "concordo" ? "temp-selected" : ""
            } ${selectedOption === "concordo" ? "selected" : ""}`}
            onClick={() => handleSelectOption("concordo")}
            disabled={voted}
          >
            Concordo
          </button>

          <button
            className={`vote-option-btn ${
              tempSelectedOption === "discordo" ? "temp-selected" : ""
            } ${selectedOption === "discordo" ? "selected" : ""}`}
            onClick={() => handleSelectOption("discordo")}
            disabled={voted}
          >
            Discordo
          </button>

          <button
            className={`vote-option-btn ${
              tempSelectedOption === "abstenho" ? "temp-selected" : ""
            } ${selectedOption === "abstenho" ? "selected" : ""}`}
            onClick={() => handleSelectOption("abstenho")}
            disabled={voted}
          >
            Me abstenho
          </button>

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
