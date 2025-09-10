import React, { useState } from "react";
import { FaUserTie } from "react-icons/fa";
import MinervaVoteModal from "./MinervaVoteModal";
import "../styles/VotingResult.css";

const VotingResult = ({ stats, voting, isOwner, votingId, onMinervaVote }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Se não há votos, não mostrar nada
  if (stats.total === 0) {
    return (
      <div className="no-votes-message">
        Esta votação ainda não recebeu votos.
      </div>
    );
  }

  // Verificar se já houve voto de minerva
  const hasMinervaVote = voting?.hasMinervaVote === true;
  const minervaOption = voting?.minervaOption;

  return (
    <div className="voting-result-container">
      {/* Modal do voto de minerva */}
      <MinervaVoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        options={stats.winners || []}
        onConfirm={(selectedOption) => onMinervaVote(votingId, selectedOption)}
      />

      {/* Exibir resultado final após voto de minerva */}
      {hasMinervaVote ? (
        <div className="voting-minerva-result">
          <div className="minerva-header">
            <h4>Resultado após voto de minerva:</h4>
          </div>
          <div className="minerva-winner-option">
            <strong>{minervaOption}</strong>
            <span className="minerva-badge">
              <FaUserTie /> Voto de Minerva
            </span>
          </div>
        </div>
      ) : stats.isTie ? (
        <div className="voting-tie-result">
          <div className="tie-header">
            <h4>Empate técnico entre:</h4>
          </div>
          <ul className="winning-options">
            {stats.winners.map((option) => (
              <li key={option}>
                <strong>{option}</strong>
                <span>
                  {stats.maxVotes} votos (
                  {Math.round((stats.maxVotes / stats.total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>

          {/* Substituir o accordion por um botão simples "Desempatar" */}
          {isOwner && (
            <div className="minerva-action">
              <button
                className="minerva-vote-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <FaUserTie className="minerva-btn-icon" />
                Desempatar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="voting-winner-result">
          <div className="winner-header">
            <h4>A opção mais votada foi:</h4>
          </div>
          <div className="winner-option">
            <strong>{stats.winner}</strong>
            <span>
              {stats.maxVotes} votos (
              {Math.round((stats.maxVotes / stats.total) * 100)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingResult;
