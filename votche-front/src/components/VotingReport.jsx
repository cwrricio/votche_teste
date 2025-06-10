import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { jsPDF } from "jspdf";
import VotingReportPDF from "./VotingReportPDF";
import "./styles/VotingReport.css";

const VotingReport = ({ meetingId, votings, onClose }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [expandedVoting, setExpandedVoting] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("pie");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  const colors = [
    "rgba(75, 192, 192, 0.7)",
    "rgba(54, 162, 235, 0.7)",
    "rgba(153, 102, 255, 0.7)",
    "rgba(255, 159, 64, 0.7)",
    "rgba(255, 99, 132, 0.7)",
    "rgba(255, 205, 86, 0.7)",
    "rgba(201, 203, 207, 0.7)",
    "rgba(110, 220, 159, 0.7)",
  ];

  useEffect(() => {
    if (!votings || votings.length === 0) {
      setLoading(false);
      return;
    }

    const processVotings = async () => {
      try {
        setLoading(true);

        // Coletar todos os IDs de usuários que votaram
        const userIds = new Set();

        // Garantir que temos dados de participantes
        votings.forEach((voting) => {
          // Verificar em todas as possíveis fontes de participação
          if (voting.voters) {
            Object.keys(voting.voters).forEach((userId) => userIds.add(userId));
          }

          if (voting.votes) {
            Object.keys(voting.votes).forEach((userId) => userIds.add(userId));
          }

          // Verificar também na lista de participantes
          if (voting.participants) {
            Object.keys(voting.participants).forEach((userId) =>
              userIds.add(userId)
            );
          }
        });

        // Adicionar participantes da reunião se estiverem disponíveis no objeto meetingData
        if (votings.length > 0 && votings[0].meetingParticipants) {
          Object.keys(votings[0].meetingParticipants).forEach((userId) =>
            userIds.add(userId)
          );
        }

        console.log("IDs de usuários encontrados:", Array.from(userIds));

        // Se ainda não encontramos usuários, adicionar alguns dados de exemplo para debug
        if (userIds.size === 0 && votings.length > 0) {
          userIds.add("user-debug-1");
          userIds.add("user-debug-2");
          console.log("Adicionados usuários de exemplo para debug");
        }

        // Simular perfis de usuário básicos para cada usuário
        const userProfiles = {};
        Array.from(userIds).forEach((userId) => {
          userProfiles[userId] = {
            displayName: `Usuário ${userId.substring(0, 5)}...`,
            uid: userId,
          };
        });

        console.log(
          "Perfis de usuários processados:",
          Object.keys(userProfiles).length
        );
        setUserProfiles(userProfiles);

        // Processar dados de votação
        const processedData = votings.map((voting) => {
          console.log("Processando votação:", voting);

          // Extrair opções e votos das votações
          const options = [];
          const optionCounts = {};
          const votersByOption = {};

          // Verificar se temos as opções no formato objeto (como armazenado no Firebase)
          if (
            voting.options &&
            typeof voting.options === "object" &&
            !Array.isArray(voting.options)
          ) {
            Object.keys(voting.options).forEach((option) => {
              options.push({
                label: option,
                value: voting.options[option] || 0,
              });
              optionCounts[option] = voting.options[option] || 0;
              votersByOption[option] = [];
            });
          }

          // Processar votos (mapear usuários que votaram em cada opção)
          const votes = voting.votes || {};
          let totalVotes = 0;

          // Se tivermos campo de votos específico
          if (Object.keys(votes).length > 0) {
            Object.entries(votes).forEach(([userId, option]) => {
              if (!votersByOption[option]) {
                votersByOption[option] = [];
              }

              votersByOption[option].push({
                id: userId,
                profile: userProfiles[userId] || {
                  displayName: `Usuário ${userId.substring(0, 5)}...`,
                  uid: userId,
                },
                timestamp:
                  voting.voteTimestamps?.[userId] || new Date().getTime(),
              });
              totalVotes++;
            });
          }
          // Caso contrário, usamos o contador de options direto
          else {
            totalVotes = Object.values(optionCounts).reduce(
              (sum, count) => sum + count,
              0
            );
          }

          // Calcular opção vencedora
          let winningOption = options.length > 0 ? options[0].label : "Nenhuma";
          let maxVotes =
            options.length > 0 ? optionCounts[options[0].label] : 0;

          Object.entries(optionCounts).forEach(([option, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              winningOption = option;
            }
          });

          return {
            ...voting,
            options,
            processedData: {
              optionCounts,
              totalVotes,
              votersByOption,
              winningOption,
              maxVotes,
            },
          };
        });

        setReportData(processedData);
      } catch (err) {
        console.error("Erro ao processar dados do relatório:", err);
        setError("Falha ao carregar dados detalhados do relatório");
      } finally {
        setLoading(false);
      }
    };

    processVotings();
  }, [votings]);

  // Formatar data para exibição amigável
  const formatDate = (timestamp) => {
    if (!timestamp) return "Data indisponível";

    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Formatar apenas hora e minuto para exibição do horário de voto
  const formatTime = (timestamp) => {
    if (!timestamp) return "Horário desconhecido";

    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  // Função para exportar o relatório como PDF
  const exportReportAsPDF = async () => {
    try {
      setExporting(true);

      // Criar documento PDF
      const pdf = new jsPDF();

      // Cabeçalho
      pdf.setFontSize(18);
      pdf.text("Relatório de Votações", 105, 20, { align: "center" });

      const dataAtual = new Date().toLocaleDateString("pt-BR");
      pdf.setFontSize(12);
      pdf.text(`Gerado em: ${dataAtual}`, 105, 30, { align: "center" });

      // Linha separadora
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 35, 190, 35);

      // Estatísticas gerais
      pdf.setFontSize(16);
      pdf.text("Resumo Geral", 20, 45);

      pdf.setFontSize(12);
      let y = 55;
      pdf.text(`Total de votações: ${reportData.length}`, 25, y);
      y += 8;

      const totalVotos = reportData.reduce(
        (total, voting) => total + (voting.processedData?.totalVotes || 0),
        0
      );
      pdf.text(`Total de votos: ${totalVotos}`, 25, y);
      y += 8;

      pdf.text(`Participantes: ${Object.keys(userProfiles).length}`, 25, y);
      y += 8;

      const votacoesEncerradas = reportData.filter((v) => !v.active).length;
      pdf.text(`Votações encerradas: ${votacoesEncerradas}`, 25, y);
      y += 15;

      // Tabela de resultados por votação
      pdf.setFontSize(16);
      pdf.text("Resultados por Votação", 20, y);
      y += 10;

      // Cabeçalho da tabela
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, y, 170, 10, "F");

      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Pergunta", 25, y + 7);
      pdf.text("Status", 95, y + 7);
      pdf.text("Votos", 120, y + 7);
      pdf.text("Opção Vencedora", 140, y + 7);
      y += 15;

      // Linha separadora
      pdf.line(20, y - 5, 190, y - 5);

      // Linha alternada para a tabela
      let alternado = false;

      // Dados da tabela
      reportData.forEach((voting, index) => {
        // Verificar se precisa de nova página
        if (y > 260) {
          pdf.addPage();
          y = 20;

          // Cabeçalho da tabela na nova página
          pdf.setFillColor(240, 240, 240);
          pdf.rect(20, y, 170, 10, "F");

          pdf.setFontSize(11);
          pdf.setTextColor(80, 80, 80);
          pdf.text("Pergunta", 25, y + 7);
          pdf.text("Status", 95, y + 7);
          pdf.text("Votos", 120, y + 7);
          pdf.text("Opção Vencedora", 140, y + 7);
          y += 15;

          // Linha separadora
          pdf.line(20, y - 5, 190, y - 5);
        }

        // Fundo alternado
        if (alternado) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(20, y - 5, 170, 10, "F");
        }
        alternado = !alternado;

        // Extrair os dados de forma segura
        const processedData = voting.processedData || {};

        // Limitar o tamanho do texto para as colunas
        let pergunta = voting.title || voting.question || "Sem título";
        if (pergunta.length > 30) {
          pergunta = pergunta.substring(0, 27) + "...";
        }

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(pergunta, 25, y);

        // Status com cor
        pdf.setTextColor(
          voting.active ? 46 : 183,
          voting.active ? 125 : 28,
          voting.active ? 50 : 28
        );
        pdf.text(voting.active ? "Ativa" : "Encerrada", 95, y);

        // Total de votos e opção vencedora
        pdf.setTextColor(0, 0, 0);
        const totalVotes = processedData.totalVotes || 0;
        pdf.text(`${totalVotes}`, 120, y);

        let opcaoVencedora = "Sem votos";
        if (totalVotes > 0) {
          const vencedora = processedData.winningOption || "";
          const numVotos = processedData.maxVotes || 0;

          let textoVencedor = vencedora;
          if (textoVencedor.length > 15) {
            textoVencedor = textoVencedor.substring(0, 12) + "...";
          }

          opcaoVencedora = `${textoVencedor} (${numVotos})`;
        }

        pdf.text(opcaoVencedora, 140, y);

        y += 10;
      });

      // Adicionar rodapé com paginação
      const totalPaginas = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${totalPaginas} | Gerado pelo Votche`,
          105,
          285,
          { align: "center" }
        );
      }

      // Salvar o PDF
      pdf.save(
        `relatorio-votacao-${new Date().toISOString().split("T")[0]}.pdf`
      );

      setExporting(false);
      alert("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      setExporting(false);
      alert(`Ocorreu um erro ao gerar o PDF: ${error.message}`);
    }
  };

  // Renderizar tabs de navegação
  const renderTabs = () => (
    <div className="report-tabs">
      <div className="report-tab-group">
        <button
          className={`report-tab ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          Resumo
        </button>
        <button
          className={`report-tab ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Detalhes
        </button>
        <button
          className={`report-tab ${
            activeTab === "participation" ? "active" : ""
          }`}
          onClick={() => setActiveTab("participation")}
        >
          Participação
        </button>
      </div>

      <div className="export-button-container">
        <button
          className="export-report-btn"
          onClick={exportReportAsPDF}
          disabled={exporting}
        >
          {exporting ? "Gerando PDF..." : "Exportar como PDF"}
        </button>
      </div>
    </div>
  );

  // Renderizar sumário com resultados por votação
  const renderSummary = () => (
    <div className="report-summary">
      <div className="summary-header">
        <h3>Resumo das Votações</h3>
        <p>Total de {reportData.length} votações realizadas nesta reunião</p>
      </div>

      <div className="report-stats">
        <div className="stat-card">
          <div className="stat-value">{reportData.length}</div>
          <div className="stat-label">Votações</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {reportData.reduce(
              (total, voting) =>
                total + (voting.processedData?.totalVotes || 0),
              0
            )}
          </div>
          <div className="stat-label">Votos Totais</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{Object.keys(userProfiles).length}</div>
          <div className="stat-label">Participantes</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {reportData.filter((v) => !v.active).length}
          </div>
          <div className="stat-label">Encerradas</div>
        </div>
      </div>

      <div className="summary-list">
        <h4>Resultados por Votação</h4>
        <div className="summary-table-container">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Pergunta</th>
                <th>Status</th>
                <th>Total</th>
                <th>Opção Vencedora</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((voting) => {
                const { processedData } = voting;
                return (
                  <tr key={voting.id} onClick={() => setExpandedVoting(voting)}>
                    <td>{voting.title || voting.question || "Sem título"}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          voting.active ? "active" : "ended"
                        }`}
                      >
                        {voting.active ? "Ativa" : "Encerrada"}
                      </span>
                    </td>
                    <td>{processedData.totalVotes}</td>
                    <td>
                      {processedData.totalVotes > 0 ? (
                        <div className="winning-option">
                          <span>{processedData.winningOption}</span>
                          <span className="vote-count">
                            ({processedData.maxVotes} votos)
                          </span>
                        </div>
                      ) : (
                        <span className="no-votes">Sem votos</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Renderizar detalhes de votações específicas
  const renderDetails = () => (
    <div className="report-details">
      <div className="accordion-container">
        {reportData.map((voting) => {
          const isExpanded = expandedVoting && expandedVoting.id === voting.id;
          const { processedData } = voting;

          return (
            <div
              key={voting.id}
              className={`voting-accordion ${isExpanded ? "expanded" : ""}`}
            >
              <div
                className="accordion-header"
                onClick={() => setExpandedVoting(isExpanded ? null : voting)}
              >
                <div className="accordion-title">
                  <h4>{voting.question || "Pergunta sem título"}</h4>
                  <span
                    className={`status-badge ${
                      voting.active ? "active" : "ended"
                    }`}
                  >
                    {voting.active ? "Ativa" : "Encerrada"}
                  </span>
                </div>
                <div className="accordion-summary">
                  <span>{processedData.totalVotes} votos</span>
                  <span className="accordion-icon">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="accordion-content">
                  <div className="voting-details">
                    <div className="voting-chart">
                      {/* Defina chartComponent antes de usá-lo */}
                      {chartType === "pie" ? (
                        <div className="pie-chart">
                          <p>Dados de Votação</p>
                          {/* Adicione aqui o componente de gráfico real se disponível */}
                        </div>
                      ) : (
                        <div className="bar-chart">
                          <p>Dados de Votação</p>
                          {/* Adicione aqui o componente de gráfico real se disponível */}
                        </div>
                      )}
                    </div>

                    {/* Tabela de resultados da opção */}
                    <div className="voting-results">
                      <table className="voting-results-table">
                        <thead>
                          <tr>
                            <th>Opção</th>
                            <th>Votos</th>
                            <th>Percentual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedData.options.map((option) => (
                            <tr key={option.label}>
                              <td>{option.label}</td>
                              <td>{option.value}</td>
                              <td>
                                {processedData.totalVotes > 0
                                  ? `${Math.round(
                                      (option.value /
                                        processedData.totalVotes) *
                                        100
                                    )}%`
                                  : "0%"}
                              </td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td>Total</td>
                            <td>{processedData.totalVotes}</td>
                            <td>100%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Nova seção: Detalhes dos votos individuais */}
                    <div className="voting-details-voters">
                      <h4>Detalhes dos Votos</h4>
                      {processedData.totalVotes > 0 ? (
                        <div className="voters-by-option">
                          {processedData.options.map((option) => {
                            // Encontrar todos os usuários que votaram nesta opção
                            const votersForOption = Object.entries(
                              voting.votes || {}
                            )
                              .filter(([_, vote]) => vote === option.label)
                              .map(([userId]) => userProfiles[userId]);

                            return (
                              <div key={option.label} className="option-voters">
                                <h5>
                                  Opção:{" "}
                                  <span className="option-label">
                                    {option.label}
                                  </span>
                                  <span className="option-count">
                                    {votersForOption.length} votos
                                  </span>
                                </h5>

                                {votersForOption.length > 0 ? (
                                  <div className="voters-list">
                                    {votersForOption.map((voter, index) => (
                                      <div key={index} className="voter-item">
                                        <div className="voter-avatar">
                                          {voter.displayName.charAt(0)}
                                        </div>
                                        <div className="voter-info">
                                          <div className="voter-name">
                                            {voter.displayName}
                                          </div>
                                          <div className="voter-time">
                                            {voting.voteTimestamps &&
                                            voting.voteTimestamps[voter.uid]
                                              ? formatTime(
                                                  new Date(
                                                    voting.voteTimestamps[
                                                      voter.uid
                                                    ]
                                                  )
                                                )
                                              : "Horário desconhecido"}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="no-voters">
                                    Nenhum voto para esta opção
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="no-votes-message">
                          Nenhum voto registrado para esta votação
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Renderizar análise de participação com detalhes de votos por usuário
  const renderParticipation = () => {
    return (
      <div className="participation-analysis">
        <h3>Análise de Participação</h3>
        <p>Detalhes de participação por usuário</p>

        <div className="users-participation">
          {Object.entries(userProfiles).map(([userId, profile]) => {
            // Contar em quantas votações este usuário participou
            let votingCount = 0;
            const userVotings = [];

            reportData.forEach((voting) => {
              if (voting.votes && voting.votes[userId]) {
                votingCount++;
                userVotings.push({
                  id: voting.id,
                  question: voting.question || voting.title || "Sem título",
                  option: voting.votes[userId],
                  timestamp: voting.voteTimestamps?.[userId] || null,
                });
              }
            });

            const participationRate =
              reportData.length > 0
                ? Math.round((votingCount / reportData.length) * 100)
                : 0;

            return (
              <div key={userId} className="user-participation-card">
                <div className="user-header">
                  <div className="user-avatar-placeholder">
                    {profile.displayName.charAt(0)}
                  </div>
                  <div className="user-details">
                    <h4>{profile.displayName}</h4>
                    <div className="participation-stats">
                      <div className="participation-bar-container">
                        <div
                          className="participation-bar"
                          style={{ width: `${participationRate}%` }}
                        ></div>
                      </div>
                      <span className="participation-rate">
                        {participationRate}% ({votingCount} de{" "}
                        {reportData.length})
                      </span>
                    </div>
                  </div>
                </div>

                {userVotings.length > 0 ? (
                  <div className="user-votings">
                    <h5>Votos do Usuário</h5>
                    <table className="user-votes-table">
                      <thead>
                        <tr>
                          <th>Pergunta</th>
                          <th>Opção escolhida</th>
                          <th>Horário do voto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userVotings.map((voting) => (
                          <tr key={voting.id}>
                            <td>{voting.question}</td>
                            <td>
                              <span className="user-vote-option">
                                {voting.option}
                              </span>
                            </td>
                            <td>
                              {voting.timestamp
                                ? formatTime(new Date(voting.timestamp))
                                : "N/D"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-participation">
                    Este usuário não participou de nenhuma votação
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar conteúdo principal baseado na tab ativa
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          Carregando dados do relatório...
        </div>
      );
    }

    if (error) {
      return <div className="error-container">{error}</div>;
    }

    if (reportData.length === 0) {
      return (
        <div className="empty-state">
          Não há dados de votação para exibir no relatório
        </div>
      );
    }

    switch (activeTab) {
      case "details":
        return renderDetails();
      case "participation":
        return renderParticipation();
      case "summary":
      default:
        return renderSummary();
    }
  };

  return (
    <div className="voting-report-overlay">
      <div ref={reportRef} className="voting-report-container">
        <div className="report-header">
          <div className="title-section">
            <h2>Relatório Completo de Votações</h2>
            <p>Análise detalhada de todas as votações desta reunião</p>
          </div>
          <button className="close-report-btn" onClick={onClose}>
            Fechar
          </button>
        </div>

        {renderTabs()}

        <div className="report-content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default VotingReport;
