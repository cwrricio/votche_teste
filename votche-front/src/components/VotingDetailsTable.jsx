import React, { useState } from "react";
import { FaChevronDown, FaChevronUp, FaClock } from "react-icons/fa";
import "../styles/VotingDetailsTable.css";

const VotingDetailsTable = ({ voting, participants }) => {
  const [showDetails, setShowDetails] = useState(true);

  // Se não houver votos, não exibir nada
  if (!voting || !voting.votes || Object.keys(voting.votes).length === 0) {
    return null;
  }

  // Verificar se é um tipo de votação padrão (concordo, discordo, me abstenho)
  const isStandardVoting = () => {
    if (!voting.options) return false;
    const optionKeys = Object.keys(voting.options || {}).map((opt) =>
      opt.toLowerCase()
    );

    // Verifica se contém as opções padrão
    const hasStandardOptions =
      optionKeys.includes("concordo") &&
      optionKeys.includes("discordo") &&
      optionKeys.includes("me abstenho");

    return hasStandardOptions;
  };

  // Organizar votos por opção
  const getVotesByOption = () => {
    const votesByOption = {};

    // Inicializar todas as opções do objeto options (mesmo as sem votos)
    if (voting.options) {
      Object.keys(voting.options).forEach((option) => {
        votesByOption[option] = [];
      });
    }

    // Processar os votos existentes
    Object.entries(voting.votes || {}).forEach(([userId, option]) => {
      if (!votesByOption[option]) {
        votesByOption[option] = [];
      }

      // Obter informações do usuário
      const user = participants[userId] || {};
      const timestamp = voting.voteTimestamps?.[userId] || null;

      votesByOption[option].push({
        id: userId,
        name:
          user.name ||
          user.displayName ||
          `Usuário ${userId.substring(0, 6)}...`,
        email: user.email || "-",
        timestamp,
        option: option,
      });
    });

    return votesByOption;
  };

  // Formatar data para exibição
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";

    const date = new Date(timestamp);
    return `${date.toLocaleDateString("pt-BR")}, ${date.toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  };

  // Gerar classe CSS para opção
  const getOptionClass = (option) => {
    const normalized = option.toLowerCase().replace(/\s+/g, "-");

    // Para opções padrão
    if (normalized === "concordo") return "concordo";
    if (normalized === "discordo") return "discordo";
    if (normalized === "me-abstenho") return "me-abstenho";

    // Para opções personalizadas
    if (option.toLowerCase() === "sim") return "positivo";
    if (option.toLowerCase() === "não" || option.toLowerCase() === "nao")
      return "negativo";

    // Outras opções personalizadas
    return "outro";
  };

  // Gerar iniciais para avatar
  const getInitials = (name) => {
    if (!name || name.includes("Usuário")) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const votesByOption = getVotesByOption();
  const isStandard = isStandardVoting();

  return (
    <div className="voting-details-container">
      <div className="details-title">
        <div>Detalhes dos Votantes</div>
        <button
          className={`toggle-details-btn ${showDetails ? "expanded" : ""}`}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? (
            <>
              <span>Ocultar detalhes</span>
              <FaChevronUp />
            </>
          ) : (
            <>
              <span>Mostrar detalhes</span>
              <FaChevronDown />
            </>
          )}
        </button>
      </div>

      {showDetails && (
        <div className="voting-details-data">
          {Object.entries(votesByOption).map(([option, voters]) => (
            <div key={option} className="option-section">
              <div className={`option-header ${getOptionClass(option)}`}>
                <span className="option-label">{option}</span>
                <span className="vote-count">
                  {voters.length} voto{voters.length !== 1 ? "s" : ""}
                </span>
              </div>
              {voters.length > 0 ? (
                <table className="voters-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Data e hora</th>
                      {/* Mostrar coluna de opção apenas para votações padrão */}
                      {isStandard && <th>Opção</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {voters.map((voter) => (
                      <tr key={voter.id} className="voter-row">
                        <td>
                          <div className="voter-info">
                            <div className="voter-avatar">
                              {getInitials(voter.name)}
                            </div>
                            <span className="voter-name">{voter.name}</span>
                          </div>
                        </td>
                        <td>{voter.email}</td>
                        <td>
                          <div className="voter-time">
                            <FaClock
                              style={{ marginRight: "5px", fontSize: "0.8rem" }}
                            />
                            {formatDate(voter.timestamp)}
                          </div>
                        </td>
                        {/* Mostrar tipo de voto apenas para votações padrão */}
                        {isStandard && (
                          <td>
                            <span
                              className={`vote-type ${getOptionClass(option)}`}
                            >
                              {option}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-voters">Nenhum voto para esta opção</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VotingDetailsTable;
