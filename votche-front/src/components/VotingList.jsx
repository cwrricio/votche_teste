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
  participants = {},
}) => {
  const [selectedOptions, setSelectedOptions] = useState({});

  const handleVote = (votingId, option) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [votingId]: option,
    }));
    onVote(votingId, option);
  };

  const getTotalVotes = (options) => {
    return Object.values(options || {}).reduce((sum, votes) => sum + votes, 0);
  };

  return (
    <div className="votings-container">
      <div className="votings-header">
        <h3>Votações</h3>
        {isOwner && (
          <button className="create-voting-btn" onClick={onCreateVoting}>
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
            const votingOptions = voting.options
              ? Object.keys(voting.options)
              : [];
            const votingType = voting.votingType || "single";

            return (
              <VotingItem
                key={voting.id}
                id={voting.id}
                meetingId={voting.meetingId}
                title={voting.title}
                isActive={isActive}
                isAnonymous={voting.anonymous}
                endTime={voting.endTime}
                onEndVoting={onEndVoting}
                totalVotes={totalVotes}
                onVote={(option) => handleVote(voting.id, option)}
                isOwner={isOwner}
                options={votingOptions}
                votingType={votingType}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VotingList;
