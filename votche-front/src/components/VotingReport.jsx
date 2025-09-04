import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import VotingReportPDF from "./VotingReportPDF";
import "./styles/VotingReport.css";

// Registrar componentes necessários do Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const VotingReport = ({
  meetingId,
  votings,
  onClose,
  focusVotingId = null,
}) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [expandedVoting, setExpandedVoting] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  // Removida a opção de alternar entre tipos de gráficos, sempre será pizza
  // const [chartType, setChartType] = useState("pie");

  // Processar os dados do relatório
  useEffect(() => {
    if (!votings || votings.length === 0) {
      setLoading(false);
      return;
    }

    const processVotings = async () => {
      try {
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

        // Simular perfis de usuário básicos para cada usuário
        const userProfiles = {};
        Array.from(userIds).forEach((userId) => {
          userProfiles[userId] = {
            displayName: `Usuário ${userId.substring(0, 5)}...`,
            uid: userId,
          };
        });

        setUserProfiles(userProfiles);

        // Processar dados de votação
        const processedData = votings.map((voting) => {
          // Extrair opções e votos das votações
          const options = [];
          const optionCounts = {};
          const votersByOption = {};
          const isAnonymous = voting.anonymous === true; // Verificar se a votação é anônima

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

          // Se tivermos campo de votos específico e a votação não for anônima
          if (Object.keys(votes).length > 0 && !isAnonymous) {
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
            isAnonymous, // Adicionar flag para controlar exibição de detalhes dos votantes
            processedData: {
              options,
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

  // Focar na votação específica se o ID for fornecido
  useEffect(() => {
    if (focusVotingId && reportData.length > 0) {
      const focusedVoting = reportData.find((v) => v.id === focusVotingId);
      if (focusedVoting) {
        setActiveTab("details");
        setExpandedVoting(focusedVoting);
      }
    }
  }, [focusVotingId, reportData]);

  // Renderizar gráfico de pizza (único tipo agora)
  const renderCharts = (processedData) => {
    const options = processedData.options || [];

    // Cores para o gráfico
    const colors = [
      "#27ae60",
      "#2980b9",
      "#e74c3c",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
      "#d35400",
      "#34495e",
      "#16a085",
      "#c0392b",
    ];

    // Dados para gráfico
    const chartData = {
      labels: options.map((option) => option.label),
      datasets: [
        {
          data: options.map((option) => option.value),
          backgroundColor: colors.slice(0, options.length),
          borderWidth: 1,
          borderColor: "#2a2a2a",
        },
      ],
    };

    // Opções do gráfico de pizza
    const pieOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#ddd",
            boxWidth: 12,
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage =
                total > 0 ? Math.round((value / total) * 100) : 0;
              return `${context.label}: ${value} votos (${percentage}%)`;
            },
          },
        },
      },
    };

    return (
      <div className="chart-container">
        <Pie data={chartData} options={pieOptions} height={250} />
      </div>
    );
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

  // Renderizar interface do relatório
  const renderHeader = () => (
    <div className="report-header">
      <div className="title-section">
        <h2>Relatório de Votações</h2>
        <p>Visualize os resultados de todas as votações desta reunião</p>
      </div>
      <button className="close-report-btn" onClick={onClose}>
        Fechar
      </button>
    </div>
  );

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
          const isAnonymous = voting.isAnonymous;

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
                  <h4>
                    {voting.title || voting.question || "Pergunta sem título"}
                  </h4>
                  <span
                    className={`status-badge ${
                      voting.active ? "active" : "ended"
                    }`}
                  >
                    {voting.active ? "Ativa" : "Encerrada"}
                  </span>
                  {isAnonymous && (
                    <span className="anonymous-badge">Anônima</span>
                  )}
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
                    <div className="voting-results-container">
                      {/* Renderizar o gráfico de pizza */}
                      {processedData.totalVotes > 0 ? (
                        renderCharts(processedData)
                      ) : (
                        <div className="no-data-chart">
                          <p>Sem votos para exibir no gráfico</p>
                        </div>
                      )}

                      {/* Tabela de resultados */}
                      <div className="voting-results-table-container">
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
                    </div>

                    {/* Exibir lista de votantes somente se não for anônima */}
                    {!isAnonymous && processedData.totalVotes > 0 && (
                      <div className="voters-by-option">
                        <h5>Detalhes dos Votantes</h5>
                        <div className="options-grid">
                          {processedData.options
                            .filter((option) => option.value > 0)
                            .map((option) => {
                              const votersForOption =
                                processedData.votersByOption[option.label] ||
                                [];
                              const percentage =
                                (option.value / processedData.totalVotes) * 100;

                              return (
                                <div
                                  key={option.label}
                                  className="option-voters"
                                >
                                  <div className="option-header">
                                    <div className="option-header-content">
                                      <span className="option-label">
                                        {option.label}
                                      </span>
                                      <span className="voters-percentage">
                                        {Math.round(percentage)}%
                                      </span>
                                    </div>
                                    <span className="option-count">
                                      {option.value} voto(s)
                                    </span>
                                  </div>

                                  <div className="voters-list">
                                    {votersForOption.length > 0 ? (
                                      votersForOption.map((voter) => (
                                        <div
                                          key={voter.id}
                                          className="voter-item"
                                        >
                                          <div className="voter-info">
                                            <div className="voter-avatar-placeholder">
                                              {voter.profile.displayName.charAt(
                                                0
                                              )}
                                            </div>
                                            <span className="voter-name">
                                              {voter.profile.displayName}
                                            </span>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="no-voters">
                                        Sem informações de votantes disponíveis
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Interface principal do relatório
  if (loading) {
    return (
      <div className="voting-report-container">
        {renderHeader()}
        <div className="loading-container">Carregando relatório...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="voting-report-container">
        {renderHeader()}
        <div className="error-container">{error}</div>
      </div>
    );
  }

  if (reportData.length === 0) {
    return (
      <div className="voting-report-container">
        {renderHeader()}
        <div className="empty-state">
          Não há votações disponíveis para gerar relatório
        </div>
      </div>
    );
  }

  return (
    <div className="voting-report-container">
      {renderHeader()}
      {renderTabs()}
      <div className="report-content">
        {activeTab === "summary" && renderSummary()}
        {activeTab === "details" && renderDetails()}
        {activeTab === "participation" && (
          <div>Conteúdo de participação detalhada...</div>
        )}
      </div>
    </div>
  );
};

export default VotingReport;
