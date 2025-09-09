import React, { useState } from "react";
import { FaChevronDown, FaChevronUp, FaUser, FaClock } from "react-icons/fa";
import "../styles/VotingDetailsTable.css";

const VotingDetailsTable = ({ voting, participants }) => {
  const [showDetails, setShowDetails] = useState(true); // Inicia expandido por padrão

  // Se não houver votos, não exibir nada
  if (!voting || !voting.votes || Object.keys(voting.votes).length === 0) {
    return null;
  }

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
  const getOptionClass = (option, index) => {
    // Se for uma das opções padrão, manter o comportamento atual
    const normalized = option.toLowerCase().replace(/\s+/g, "-");
    if (normalized === "concordo") return "concordo";
    if (normalized === "discordo") return "discordo";
    if (normalized === "me-abstenho") return "me-abstenho";

    // Para opções personalizadas, usar cores predefinidas baseadas no índice
    const colorClasses = ["positivo", "negativo", "neutro", "alternativo"];
    return colorClasses[index % colorClasses.length] || "outro";
  };

  // Gerar iniciais para avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const votesByOption = getVotesByOption();

  return (
    <div
      className="voting-details-table"
      style={{ width: "200%", maxWidth: "200%" }}
    >
      <div
        className="details-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Detalhes dos Votantes</h3>
        <button
          className={`toggle-details-btn ${showDetails ? "expanded" : ""}`}
          onClick={() => setShowDetails(!showDetails)}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
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
        <div className="voting-details-data" style={{ width: "100%" }}>
          {Object.entries(votesByOption).map(([option, voters], index) => (
            <div
              key={option}
              className="option-section"
              style={{ marginBottom: "20px", width: "100%" }}
            >
              <div
                className={`option-header ${getOptionClass(option, index)}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "4px 4px 0 0",
                  width: "100%",
                }}
              >
                <span>{option}</span>
                <span className="vote-count">
                  {voters.length} voto{voters.length !== 1 ? "s" : ""}
                </span>
              </div>

              {voters.length > 0 ? (
                <table
                  className="voters-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Nome</th>
                      <th style={{ width: "40%" }}>Email</th>
                      <th style={{ width: "30%" }}>Data e hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voters.map((voter) => (
                      <tr key={voter.id} className="voter-row">
                        <td>
                          <div
                            className="voter-name"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              className="voter-avatar"
                              style={{
                                borderRadius: "50%",
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#e0e0e0",
                              }}
                            >
                              {getInitials(voter.name)}
                            </div>
                            {voter.name}
                          </div>
                        </td>
                        <td className="voter-email">{voter.email}</td>
                        <td className="vote-timestamp">
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <FaClock size={12} style={{ marginRight: "5px" }} />
                            {formatDate(voter.timestamp)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  className="no-voters"
                  style={{
                    padding: "15px",
                    backgroundColor: "#f8f8f8",
                    textAlign: "center",
                  }}
                >
                  Nenhum voto para esta opção
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VotingDetailsTable;
