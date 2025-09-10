// Componente de votação aprimorado
import React, { useState } from "react";
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
  onEndVoting,
  totalVotes = 0,
  onVote,
  isOwner = false,
  options = [], // Adicionar esta prop
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
          {/* Renderizar as opções dinamicamente */}
          {options.map((option) => (
            <button
              key={option}
              className={`vote-option-btn ${
                tempSelectedOption === option ? "temp-selected" : ""
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
        onEndVoting={() => console.log("Encerrar votação")}
        onViewDetails={() => console.log("Ver detalhes")}
        options={["Concordo", "Discordo", "Me abstenho"]} // Passar as opções aqui
      />

      <VotingItem
        title="o ema é lindo"
        isActive={true}
        onEndVoting={() => console.log("Encerrar votação")}
        onViewDetails={() => console.log("Ver detalhes")}
        options={["Sim", "Não", "Talvez"]} // Exemplo de outras opções
      />
    </div>
  );
}

// Exportar o componente para uso em outros arquivos
export default VotingItem;

// No componente de votação, quando um usuário vota:

const submitVote = async (option) => {
  try {
    // Código existente para registrar o voto

    // Adicionar registro de participação para relatórios
    const userReportsRef = ref(
      database,
      `users/${currentUser.uid}/reportAccess/${meetingId}`
    );
    await set(userReportsRef, {
      accessGranted: true,
      votedAt: serverTimestamp(),
      meetingName: meetingData.name,
    });

    // Continuar com o restante do código existente
  } catch (error) {
    console.error("Erro ao registrar voto:", error);
    setError("Não foi possível registrar seu voto. Tente novamente.");
  }
};
