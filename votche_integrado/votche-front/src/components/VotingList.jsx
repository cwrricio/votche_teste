
import React from "react";
import { FaPlus, FaInfoCircle } from "react-icons/fa";
import VotingItem from "./VotingItem";
import "../styles/VotingList.css";


const VotingList = ({ votings, isOwner, onVote, onEndVoting, onCreateVoting }) => {


  return (
    <div className="votings-container">
      <div className="votings-header">
        {isOwner && (
          <button className="new-vote-btn" onClick={onCreateVoting}>
            <FaPlus /> Nova Votação
          </button>
        )}
      </div>

      {(!votings || votings.length === 0) ? (
        <div className="empty-state">
          <FaInfoCircle />
          <p>Nenhuma votação criada nesta reunião</p>
        </div>
      ) : (
        <div className="voting-list">
          {votings.map((voting) => (
            <VotingItem
              key={voting._id || voting.id}
              id={voting._id || voting.id}
              meetingId={voting.meetingId}
              title={voting.title}
              isActive={voting.active}
              totalVotes={voting.options ? Object.values(voting.options).reduce((sum, v) => sum + v, 0) : 0}
              onEndVoting={() => onEndVoting(voting._id || voting.id)}
              onVote={onVote ? (option) => onVote(voting._id || voting.id, option) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VotingList;
