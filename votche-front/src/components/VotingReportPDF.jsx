import React from "react";

const VotingReportPDF = ({ reportData, userProfiles }) => {
  // Função auxiliar para formatar data
  const formatDate = (timestamp) => {
    if (!timestamp) return "Data indisponível";
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="pdf-report">
      <div className="pdf-header">
        <h1>Relatório de Votações</h1>
        <p>Data de geração: {formatDate(new Date())}</p>
      </div>

      <div className="pdf-summary">
        <h2>Resumo das Votações</h2>
        <div className="pdf-stats">
          <div className="pdf-stat">
            <strong>Total de votações:</strong> {reportData?.length || 0}
          </div>
          <div className="pdf-stat">
            <strong>Votos totais:</strong>{" "}
            {(reportData || []).reduce(
              (total, voting) =>
                total + (voting.processedData?.totalVotes || 0),
              0
            )}
          </div>
          <div className="pdf-stat">
            <strong>Participantes:</strong>{" "}
            {Object.keys(userProfiles || {}).length}
          </div>
          <div className="pdf-stat">
            <strong>Votações encerradas:</strong>{" "}
            {(reportData || []).filter((v) => !v.active).length}
          </div>
        </div>
      </div>

      <div className="pdf-voting-list">
        <h2>Lista de Votações</h2>
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Pergunta</th>
              <th>Status</th>
              <th>Total de Votos</th>
              <th>Opção Vencedora</th>
            </tr>
          </thead>
          <tbody>
            {(reportData || []).map((voting) => {
              const processedData = voting.processedData || {};
              return (
                <tr key={voting.id}>
                  <td>{voting.title || voting.question || "Sem título"}</td>
                  <td>{voting.active ? "Ativa" : "Encerrada"}</td>
                  <td>{processedData.totalVotes || 0}</td>
                  <td>
                    {processedData.totalVotes > 0
                      ? `${processedData.winningOption || ""} (${
                          processedData.maxVotes || 0
                        } votos)`
                      : "Sem votos"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pdf-detailed-results">
        <h2>Resultados Detalhados</h2>
        {(reportData || []).map((voting) => {
          const processedData = voting.processedData || {};
          return (
            <div key={voting.id} className="pdf-voting-detail">
              <h3>{voting.title || voting.question || "Sem título"}</h3>
              <p>Status: {voting.active ? "Ativa" : "Encerrada"}</p>
              <p>Total de votos: {processedData.totalVotes || 0}</p>

              <table className="pdf-options-table">
                <thead>
                  <tr>
                    <th>Opção</th>
                    <th>Votos</th>
                    <th>Percentual</th>
                  </tr>
                </thead>
                <tbody>
                  {(processedData.options || []).map((option) => (
                    <tr key={option.label}>
                      <td>{option.label}</td>
                      <td>{option.value}</td>
                      <td>
                        {processedData.totalVotes > 0
                          ? `${Math.round(
                              (option.value / processedData.totalVotes) * 100
                            )}%`
                          : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotingReportPDF;
