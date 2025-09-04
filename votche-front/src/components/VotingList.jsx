import React, { useState } from "react";
import {
  FaCheck,
  FaHourglassHalf,
  FaCheckCircle,
  FaChartBar,
  FaArrowRight,
  FaPlus,
  FaInfoCircle,
} from "react-icons/fa";
import VotingItem from "./VotingItem";
import "../styles/VotingList.css";

const VotingList = ({
  votings,
  isOwner,
  onVote,
  onEndVoting,
  onCreateVoting,
}) => {
  const [selectedOptions, setSelectedOptions] = useState({});

  const handleVote = (votingId, option) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [votingId]: option,
    }));
    onVote(votingId, option);
  };

  const calculatePercentage = (votes, total) => {
    if (!total) return 0;
    return Math.round((votes / total) * 100);
  };

  const getTotalVotes = (options) => {
    return Object.values(options).reduce((sum, votes) => sum + votes, 0);
  };

  return (
    <div className="votings-container">
      <div className="votings-header">
       
        {isOwner && (
          <button className="new-vote-btn" onClick={onCreateVoting}>
            <FaPlus /> Nova Votação
          </button>
        )}
      </div>


      {votings.length === 0 ? (
        <div className="empty-state">
          <FaInfoCircle />
          <p>Nenhuma votação criada nesta reunião</p>
        </div>
      ) : (
        <div className="voting-list">
          {votings.map((voting) => {
            const isActive = voting.active;
            const totalVotes = getTotalVotes(voting.options);
            const userVoted =
              voting.votes &&
              Object.values(voting.votes).includes(selectedOptions[voting.id]);

            return (
              <VotingItem
                key={voting.id}
                title={voting.title}
                isActive={isActive}
                onEndVoting={() => onEndVoting(voting.id)}
                onViewDetails={() =>
                  console.log(`Ver detalhes: ${voting.title}`)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VotingList;
