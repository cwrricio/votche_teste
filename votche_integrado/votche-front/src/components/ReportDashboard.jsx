import { apiFetch } from "../utils/api";
import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaFileDownload,
  FaAngleDown,
  FaAngleUp,
  FaCheckCircle,
  FaChartPie,
  FaDownload,
  FaClock,
  FaUser,
  FaSearch,
} from "react-icons/fa";
import "../styles/ReportDashboard.css";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie } from "react-chartjs-2";

// Registre os componentes necessários
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const ReportDashboard = ({ user }) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const focusMeetingId = queryParams.get("meetingId");
  const focusVotingId = queryParams.get("votingId");

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [meetingVotings] = useState({});
  const [chartType] = useState("pie");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Carregar reuniões do usuário
  useEffect(() => {
    const loadUserMeetings = async () => {
      try {
        setLoading(true);
        const userMeetings = await apiFetch(`/meetings?userId=${user._id}`, { credentials: "include" });
        setMeetings(userMeetings);
        if (focusMeetingId) {
          const targetMeeting = userMeetings.find(
            (m) => m.id === focusMeetingId
          );
          if (targetMeeting) {
            setExpandedMeeting(targetMeeting);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar reuniões:", err);
        setError("Não foi possível carregar as reuniões. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      loadUserMeetings();
    }
  }, [user, focusMeetingId]);

  // Carregar votações para uma reunião expandida
  useEffect(() => {
    if (!expandedMeeting) return;

  // Removido listenToVotingsInMeeting e lógica associada
  }, [expandedMeeting, focusVotingId]);

  // Alternar expansão de uma reunião
  const toggleMeetingExpansion = (meeting) => {
    if (expandedMeeting && expandedMeeting.id === meeting.id) {
      setExpandedMeeting(null);
    } else {
      setExpandedMeeting(meeting);
    }
  };

  // Filtrar reuniões por termo de busca
  const filteredMeetings = meetings.filter(
    (meeting) =>
      meeting.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meeting.description &&
        meeting.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Renderizar gráficos com Chart.js
  const renderChart = useCallback((stats, type = "pie", height = 200) => {
    if (
      !stats ||
      !stats.options ||
      stats.options.length === 0 ||
      stats.total === 0
    ) {
      return (
        <div className="no-data-chart">
          <p>Sem dados para exibir</p>
        </div>
      );
    }

    const colors = [
      "#3498db",
      "#2ecc71",
      "#e74c3c",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
      "#d35400",
      "#34495e",
      "#16a085",
      "#c0392b",
    ];

    const chartData = {
      labels: stats.options.map((option) => option.label),
      datasets: [
        {
          data: stats.options.map((option) => option.votes),
          backgroundColor: stats.options.map(
            (_, i) => colors[i % colors.length]
          ),
          borderWidth: 1,
          borderColor: "#fff",
        },
      ],
    };

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type === "pie",
          position: "bottom",
          labels: {
            boxWidth: 12,
            padding: 10,
            font: {
              size: 11,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw;
              const percentage =
                stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;
              return `${context.label}: ${value} votos (${percentage}%)`;
            },
          },
        },
      },
    };

    const barOptions = {
      ...commonOptions,
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        y: {
          grid: {
            display: false,
          },
        },
      },
    };

    return (
      <div style={{ height: `${height}px`, width: "100%" }}>
        {type === "pie" ? (
          <Pie data={chartData} options={commonOptions} />
        ) : (
          <Bar data={chartData} options={barOptions} />
        )}
      </div>
    );
  }, []);

  // Formatar data para exibição
  const formatDate = (dateStr, timeStr) => {
    try {
      const date = new Date(`${dateStr}T${timeStr}`);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return `${dateStr} ${timeStr}`;
    }
  };

  // Calcular estatísticas para uma votação
  const calculateVotingStats = (voting) => {
    if (!voting) return { options: [], total: 0, winner: null, maxVotes: 0 };

    // Verificar se é uma votação anônima
    const isAnonymous = voting.anonymous === true;

    // Extrair opções e votos
    const options = [];
    let totalVotes = 0;
    let winner = null;
    let maxVotes = 0;

    // Processar opções da votação
    if (voting.options && typeof voting.options === "object") {
      Object.entries(voting.options).forEach(([option, votes]) => {
        const voteCount = votes || 0;
        totalVotes += voteCount;
        options.push({ label: option, votes: voteCount });

        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          winner = option;
        }
      });
    }

    return { options, total: totalVotes, winner, maxVotes, isAnonymous };
  };

  // Baixar relatório em PDF
  const downloadPDF = async (meeting) => {
    try {
      setGeneratingPDF(true);
      const votings = meetingVotings[meeting.id] || [];

      // Criar documento PDF
      const pdf = new jsPDF();

      // Configurar cabeçalho
      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`Relatório: ${meeting.name}`, 105, 20, { align: "center" });

      pdf.setFontSize(12);
      pdf.setTextColor(80, 80, 80);
      pdf.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
        105,
        30,
        { align: "center" }
      );

      // Informações da reunião
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.text("Informações da Reunião", 20, 45);

      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);
      pdf.text(
        `Data de início: ${formatDate(meeting.startDate, meeting.startTime)}`,
        20,
        55
      );

      if (meeting.hasEndTime) {
        pdf.text(
          `Data de término: ${formatDate(meeting.endDate, meeting.endTime)}`,
          20,
          65
        );
      }

      // Status da reunião
      pdf.text(`Status: ${meeting.active ? "Ativa" : "Encerrada"}`, 20, 75);

      // Dados das votações
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`Votações (${votings.length})`, 20, 90);

      let y = 100;

      votings.forEach((voting, index) => {
        // Verificar se precisa de nova página
        if (y > 250) {
          pdf.addPage();
          y = 20;
        }

        // Calcular estatísticas
        const stats = calculateVotingStats(voting);

        // Título da votação
        pdf.setFontSize(13);
        pdf.setTextColor(40, 40, 40);
        pdf.text(`${index + 1}. ${voting.title || "Sem título"}`, 20, y);
        y += 10;

        // Status e total de votos
        pdf.setFontSize(11);
        pdf.setTextColor(80, 80, 80);
        pdf.text(
          `Status: ${voting.active ? "Ativa" : "Encerrada"} - Total de votos: ${stats.total
          }`,
          20,
          y
        );
        y += 8;

        // Opção vencedora
        if (stats.winner) {
          pdf.text(
            `Opção mais votada: ${stats.winner} (${stats.maxVotes} votos)`,
            20,
            y
          );
          y += 8;
        }

        // Tabela de resultados
        pdf.setFontSize(10);
        pdf.setDrawColor(200, 200, 200);

        // Cabeçalho da tabela
        pdf.setFillColor(240, 240, 240);
        pdf.rect(20, y, 170, 7, "F");
        pdf.setTextColor(60, 60, 60);
        pdf.text("Opção", 22, y + 5);
        pdf.text("Votos", 100, y + 5);
        pdf.text("Percentual", 130, y + 5);
        y += 7;

        // Linhas da tabela
        stats.options.forEach((option, idx) => {
          const percentage =
            stats.total > 0
              ? Math.round((option.votes / stats.total) * 100)
              : 0;

          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(20, y, 170, 7, "F");
          }

          pdf.setTextColor(60, 60, 60);
          pdf.text(option.label, 22, y + 5);
          pdf.text(option.votes.toString(), 100, y + 5);
          pdf.text(`${percentage}%`, 130, y + 5);
          y += 7;
        });

        y += 15;
      });

      // Salvar o PDF
      pdf.save(`relatorio-${meeting.name.replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Verificar status de reunião
  const getMeetingStatus = (meeting) => {
    if (!meeting.active) {
      return { text: "Encerrada", class: "status-ended" };
    }

    const now = new Date();
    const meetingDate = new Date(`${meeting.startDate}T${meeting.startTime}`);

    if (meetingDate > now) {
      return { text: "Agendada", class: "status-scheduled" };
    } else {
      return { text: "Em andamento", class: "status-active" };
    }
  };

  return (
    <div className="report-dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard de Relatórios</h2>
        <p>
          Visualize e exporte relatórios completos de suas reuniões e votações
        </p>

        <div className="dashboard-search">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar reuniões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Carregando reuniões...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="meetings-carousel">
            {filteredMeetings.length === 0 ? (
              <div className="no-meetings-message">
                <FaChartBar className="no-data-icon" />
                <p>
                  {searchTerm
                    ? "Nenhuma reunião encontrada para sua busca"
                    : "Você ainda não tem reuniões para gerar relatórios"}
                </p>
              </div>
            ) : (
              <>
                <p className="section-title">
                  Suas Reuniões <span>({filteredMeetings.length})</span>
                </p>

                <div className="meetings-list">
                  {filteredMeetings.map((meeting) => {
                    const status = getMeetingStatus(meeting);
                    const isExpanded =
                      expandedMeeting && expandedMeeting.id === meeting.id;
                    const votings = meetingVotings[meeting.id] || [];

                    return (
                      <div
                        key={meeting.id}
                        className={`meeting-report-card ${isExpanded ? "expanded" : ""
                          }`}
                      >
                        <div
                          className="meeting-card-header"
                          onClick={() => toggleMeetingExpansion(meeting)}
                        >
                          <div className="meeting-card-info">
                            <h3>{meeting.name}</h3>
                            <div className="meeting-meta-info">
                              <span
                                className={`meeting-status ${status.class}`}
                              >
                                <FaClock /> {status.text}
                              </span>
                              <span className="meeting-date">
                                <FaCalendarAlt />{" "}
                                {formatDate(
                                  meeting.startDate,
                                  meeting.startTime
                                )}
                              </span>
                              <span className="meeting-votings-count">
                                <FaChartBar /> {votings.length} votação(ões)
                              </span>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="meeting-details-panel">
                            <div className="meeting-stats">
                              {/* Estatísticas melhoradas */}
                              <div className="stat-card">
                                <FaUsers className="stat-icon" />
                                <div className="stat-content">
                                  <span className="stat-value">
                                    {meeting.participants
                                      ? Object.keys(meeting.participants).length
                                      : 0}
                                  </span>
                                  <span className="stat-label">
                                    Participantes
                                  </span>
                                </div>
                              </div>

                              <div className="stat-card">
                                <FaChartBar className="stat-icon" />
                                <div className="stat-content">
                                  <span className="stat-value">
                                    {votings.length}
                                  </span>
                                  <span className="stat-label">Votações</span>
                                </div>
                              </div>

                              <div className="stat-card">
                                <FaCheckCircle className="stat-icon" />
                                <div className="stat-content">
                                  <span className="stat-value">
                                    {votings.filter((v) => !v.active).length}
                                  </span>
                                  <span className="stat-label">Concluídas</span>
                                </div>
                              </div>

                              <div className="stat-card">
                                <FaDownload className="stat-icon" />
                                <div className="stat-content">
                                  <button
                                    className="download-report-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadPDF(meeting);
                                    }}
                                    disabled={generatingPDF}
                                  >
                                    {generatingPDF
                                      ? "Gerando..."
                                      : "Baixar PDF"}
                                  </button>
                                </div>
                              </div>
                            </div>




                            {/* Lista de votações melhorada */}
                            <div className="votings-list">
                              {votings.length === 0 ? (
                                <div className="no-votings-message">
                                  <p>
                                    Nenhuma votação encontrada para esta reunião
                                  </p>
                                </div>
                              ) : (
                                votings.map((voting) => {
                                  const stats = calculateVotingStats(voting);
                                  const isHighlighted =
                                    voting.id === focusVotingId;

                                  return (
                                    <div
                                      key={voting.id}
                                      id={`voting-${voting.id}`}
                                      className={`voting-report-item ${isHighlighted ? "highlight-voting" : ""
                                        }`}
                                    >
                                      <div className="voting-header">
                                        <h4>
                                          {voting.title || "Votação sem título"}
                                        </h4>
                                        <div className="voting-meta">
                                          <span
                                            className={`voting-status ${voting.active ? "active" : "ended"
                                              }`}
                                          >
                                            {voting.active
                                              ? "Ativa"
                                              : "Encerrada"}
                                          </span>
                                          <span className="voting-votes">
                                            {stats.total} voto(s)
                                          </span>
                                        </div>
                                      </div>

                                      <div className="voting-results">
                                        {/* Gráfico usando a função renderChart */}
                                        <div className="voting-chart">
                                          {renderChart(stats, chartType)}
                                        </div>

                                        {/* Tabela de resultados melhorada */}
                                        <div className="voting-options-table">
                                          <table>
                                            <thead>
                                              <tr>
                                                <th>Opção</th>
                                                <th>Votos</th>
                                                <th>%</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {stats.options.map(
                                                (option, idx) => {
                                                  const percentage =
                                                    stats.total > 0
                                                      ? Math.round(
                                                        (option.votes /
                                                          stats.total) *
                                                        100
                                                      )
                                                      : 0;

                                                  return (
                                                    <tr
                                                      key={idx}
                                                      className={
                                                        option.label ===
                                                          stats.winner
                                                          ? "winner"
                                                          : ""
                                                      }
                                                    >
                                                      <td>{option.label}</td>
                                                      <td>{option.votes}</td>
                                                      <td>{percentage}%</td>
                                                    </tr>
                                                  );
                                                }
                                              )}
                                            </tbody>
                                            {stats.total > 0 && (
                                              <tfoot>
                                                <tr>
                                                  <td>Total</td>
                                                  <td>{stats.total}</td>
                                                  <td>100%</td>
                                                </tr>
                                              </tfoot>
                                            )}
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportDashboard;
