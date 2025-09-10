import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { toast } from "react-toastify"; // Adicione esta linha
import {
  getUserMeetings,
  listenToVotingsInMeeting,
  getMeetingDetails,
  getMeetingVotings,
  checkReportAccess,
  registerMinervaVote, // Adicione esta linha
  getUserParticipatingMeetings,
} from "../firebase";
import { useAuth } from "../context/AuthContext";
import VotingResultChart from "./VotingResultChart";
import VotingResult from "./VotingResult";
import "../styles/ReportDashboard.css";
import VotingDetailsTable from "./VotingDetailsTable";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import {
  FaSearch,
  FaChartBar,
  FaClock,
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaDownload,
  FaArrowLeft,
  FaFileDownload,
} from "react-icons/fa";
import { Button, Typography, Paper, Box, Chip, Divider } from "@mui/material";
import { jsPDF } from "jspdf";

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
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [votings, setVotings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [meetingVotings, setMeetingVotings] = useState({});
  const [chartType, setChartType] = useState("pie");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadUserMeetings = async () => {
      try {
        setLoading(true);

        const createdMeetings = await getUserMeetings(user.uid);
        const participatingMeetings = await getUserParticipatingMeetings(
          user.uid
        );

        const allMeetings = [...createdMeetings];

        for (const meeting of participatingMeetings) {
          if (!allMeetings.some((m) => m.id === meeting.id)) {
            allMeetings.push(meeting);
          }
        }

        setMeetings(allMeetings);

        if (focusMeetingId) {
          const targetMeeting = allMeetings.find(
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

  useEffect(() => {
    if (!expandedMeeting) return;

    const loadMeetingVotings = () => {
      const unsubscribe = listenToVotingsInMeeting(
        expandedMeeting.id,
        (votings) => {
          setMeetingVotings((prev) => ({
            ...prev,
            [expandedMeeting.id]: votings,
          }));

          if (focusVotingId && votings.some((v) => v.id === focusVotingId)) {
            const votingElement = document.getElementById(
              `voting-${focusVotingId}`
            );
            if (votingElement) {
              votingElement.scrollIntoView({ behavior: "smooth" });
              votingElement.classList.add("highlight-voting");
              setTimeout(() => {
                votingElement.classList.remove("highlight-voting");
              }, 2000);
            }
          }
        }
      );

      return unsubscribe;
    };

    const unsubscribe = loadMeetingVotings();
    return () => unsubscribe && unsubscribe();
  }, [expandedMeeting, focusVotingId]);

  const toggleMeetingExpansion = (meeting) => {
    if (expandedMeeting && expandedMeeting.id === meeting.id) {
      setExpandedMeeting(null);
    } else {
      setExpandedMeeting(meeting);
    }
  };

  const filteredMeetings = meetings.filter(
    (meeting) =>
      meeting.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meeting.description &&
        meeting.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  const calculateVotingStats = (voting) => {
    if (!voting)
      return {
        options: [],
        total: 0,
        winner: null,
        maxVotes: 0,
        isTie: false,
        winners: [],
      };

    const isAnonymous = voting.anonymous === true;

    const options = [];
    let totalVotes = 0;
    let winner = null;
    let maxVotes = 0;
    let winners = [];

    if (voting.options && typeof voting.options === "object") {
      Object.entries(voting.options).forEach(([option, votes]) => {
        const voteCount = votes || 0;
        totalVotes += voteCount;
        options.push({ label: option, votes: voteCount });

        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          winner = option;
          winners = [option];
        } else if (voteCount === maxVotes && voteCount > 0) {
          winners.push(option);
        }
      });
    }

    const isTie = winners.length > 1;

    return {
      options,
      total: totalVotes,
      winner,
      maxVotes,
      isAnonymous,
      isTie, // Esta propriedade é essencial
      winners, // Esta propriedade também é necessária para o modal de desempate
    };
  };

  const downloadPDF = async (meeting) => {
    try {
      setGeneratingPDF(true);
      const votings = meetingVotings[meeting.id] || [];

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const colors = {
        primary: [30, 163, 74],
        secondary: [52, 73, 94],
        accent: [241, 196, 15],
        light: [236, 240, 241],
        text: [44, 62, 80],
        textLight: [127, 140, 141],
      };

      let y = 30;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const logoImg = new Image();
      logoImg.src = "/src/assets/votche.png";

      const addPageHeader = () => {
        pdf.setFillColor(...colors.primary);
        pdf.rect(0, 0, pageWidth, 20, "F");

        try {
          pdf.addImage(logoImg, "PNG", pageWidth - 50, 2, 40, 16);
        } catch (e) {
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text("VOTCHE", pageWidth - 20, 13, { align: "right" });
          console.error("Erro ao carregar logo:", e);
        }
      };

      const addNewPage = () => {
        pdf.addPage();
        y = 30;
        addPageHeader();
        return y;
      };

      const addReportHeader = (title) => {
        addPageHeader();

        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${title}`, 14, 13);

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.textLight);
        const dateStr = new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const timeStr = new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        pdf.text(`Gerado em ${dateStr} às ${timeStr}`, 14, 24);
      };

      const addFooter = () => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.textLight);
          pdf.text(
            `Relatório gerado pelo sistema Votche - Página ${i} de ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
          );
        }
      };

      const addDivider = () => {
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.5);
        pdf.line(14, y, pageWidth - 14, y);
        y += 5;
      };

      const addSection = (title) => {
        if (y > pageHeight - 40) y = addNewPage();

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.primary);
        pdf.text(title, 14, y);

        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(14, y + 2, 14 + pdf.getTextWidth(title) + 10, y + 2);

        y += 8;
      };

      const addInfoItem = (label, value, indent = 0) => {
        if (y > pageHeight - 20) y = addNewPage();

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.secondary);
        pdf.text(label, 14 + indent, y);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.text);
        pdf.text(value, 14 + indent + 50, y);

        y += 6;
      };

      const createOptionHeader = (text, voteCount, headerY) => {
        const headerHeight = 12;

        pdf.setFillColor(240, 240, 240);
        pdf.rect(14, headerY, pageWidth - 28, headerHeight, "F");

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.secondary);

        const textY = headerY + headerHeight / 2 + 1;
        pdf.text(`Opção: ${text}`, 20, textY);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.textLight);
        pdf.text(
          `(${voteCount} ${voteCount === 1 ? "voto" : "votos"})`,
          pageWidth - 20,
          textY,
          { align: "right" }
        );

        return headerY + headerHeight + 3;
      };

      const createTable = (headers, data, widths, startY) => {
        const tableTop = startY || y;
        let currentY = tableTop;
        const rowHeight = 10;

        pdf.setFillColor(240, 240, 240);
        pdf.rect(14, currentY - 5, pageWidth - 28, rowHeight + 2, "F");

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.secondary);

        let xPos = 14;
        headers.forEach((header, i) => {
          pdf.text(header, xPos + 4, currentY + rowHeight / 2 - 1);
          xPos += widths[i];
        });

        currentY += rowHeight + 2;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.text);

        let isAlternate = false;

        data.forEach((row, rowIndex) => {
          if (currentY > pageHeight - 20) {
            pdf.addPage();
            addPageHeader();
            currentY = 40;

            pdf.setFillColor(240, 240, 240);
            pdf.rect(14, currentY - 5, pageWidth - 28, rowHeight + 2, "F");

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...colors.secondary);

            let xHeaderPos = 14;
            headers.forEach((header, i) => {
              pdf.text(header, xHeaderPos + 4, currentY + rowHeight / 2 - 1);
              xHeaderPos += widths[i];
            });

            currentY += rowHeight + 2;
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...colors.text);
          }

          if (isAlternate) {
            pdf.setFillColor(248, 248, 248);
            pdf.rect(14, currentY - 5, pageWidth - 28, rowHeight, "F");
          }
          isAlternate = !isAlternate;

          let xRowPos = 14;
          row.forEach((cell, i) => {
            pdf.text(String(cell), xRowPos + 4, currentY + rowHeight / 2 - 1);
            xRowPos += widths[i];
          });

          currentY += rowHeight;
        });

        return currentY + 5;
      };

      const chartToImage = async (stats, width = 120, height = 100) => {
        return new Promise((resolve) => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext("2d");

            if (stats.options && stats.options.length > 0) {
              const total = stats.total || 1;
              const options = stats.options || [];

              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const radius = Math.min(centerX, centerY) - 20;

              const chartColors = [
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

              let startAngle = 0;
              options.forEach((option, index) => {
                const sliceAngle = (2 * Math.PI * option.votes) / total;

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(
                  centerX,
                  centerY,
                  radius,
                  startAngle,
                  startAngle + sliceAngle
                );
                ctx.closePath();

                ctx.fillStyle = chartColors[index % chartColors.length];
                ctx.fill();

                startAngle += sliceAngle;
              });

              let legendY = centerY + radius + 30;
              options.forEach((option, index) => {
                const color = chartColors[index % chartColors.length];
                ctx.fillStyle = color;
                ctx.fillRect(20, legendY - 8, 16, 16);

                ctx.fillStyle = "#000";
                ctx.font = "14px Arial";
                ctx.textAlign = "left";
                const percentage = Math.round((option.votes / total) * 100);
                const legendText = `${option.label}: ${option.votes} (${percentage}%)`;
                ctx.fillText(legendText, 40, legendY);

                legendY += 20;
              });
            } else {
              ctx.fillStyle = "#f8f9fa";
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              ctx.fillStyle = "#6c757d";
              ctx.font = "16px Arial";
              ctx.textAlign = "center";
              ctx.fillText(
                "Sem dados para exibir",
                canvas.width / 2,
                canvas.height / 2
              );
            }

            resolve(canvas.toDataURL("image/png"));
          } catch (error) {
            console.error("Erro ao gerar gráfico:", error);
            resolve(null);
          }
        });
      };

      addReportHeader(`Relatório: ${meeting.name}`);

      addSection("Informações da Reunião");
      addInfoItem(
        "Data de início:",
        formatDate(meeting.startDate, meeting.startTime)
      );

      if (meeting.hasEndTime) {
        addInfoItem(
          "Data de término:",
          formatDate(meeting.endDate, meeting.endTime)
        );
      }

      addInfoItem("Status:", meeting.active ? "Ativa" : "Encerrada");
      addInfoItem(
        "Participantes:",
        meeting.participants
          ? Object.keys(meeting.participants).length.toString()
          : "0"
      );
      addInfoItem("Total de votações:", votings.length.toString());
      addInfoItem(
        "Votações concluídas:",
        votings.filter((v) => !v.active).length.toString()
      );

      y += 5;
      addDivider();

      if (votings.length > 0) {
        addSection("Resumo das Votações");

        const headers = ["Votação", "Status", "Total Votos", "Opção Vencedora"];
        const widths = [80, 30, 30, 45];

        const tableData = votings.map((voting) => {
          const stats = calculateVotingStats(voting);
          let winnerText = "Sem votos";

          if (stats.maxVotes > 0) {
            const percentage = Math.round((stats.maxVotes / stats.total) * 100);
            winnerText = `${stats.winner} (${percentage}%)`;
          }

          return [
            voting.title || "Sem título",
            voting.active ? "Ativa" : "Concluída",
            stats.total.toString(),
            winnerText,
          ];
        });

        y = createTable(headers, tableData, widths);
        y += 10;
      }

      if (votings.length > 0) {
        addSection("Detalhes das Votações");

        for (let i = 0; i < votings.length; i++) {
          const voting = votings[i];
          const stats = calculateVotingStats(voting);

          if (y > pageHeight - 100) y = addNewPage();

          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...colors.secondary);
          pdf.text(`${i + 1}. ${voting.title || "Sem título"}`, 14, y);
          y += 7;

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...colors.textLight);
          pdf.text(`Status: ${voting.active ? "Ativa" : "Concluída"}`, 20, y);
          y += 6;

          pdf.text(`Total de votos: ${stats.total}`, 20, y);
          y += 6;

          if (stats.maxVotes > 0) {
            pdf.setTextColor(...colors.primary);
            pdf.setFont("helvetica", "bold");
            pdf.text(
              `Opção mais votada: ${stats.winner} (${stats.maxVotes} votos)`,
              20,
              y
            );
            y += 10;
          } else {
            pdf.text("Ainda não há votos nesta votação", 20, y);
            y += 10;
          }

          if (stats.total > 0) {
            try {
              const chartImage = await chartToImage(stats, 150, 100);
              if (chartImage) {
                pdf.addImage(chartImage, "PNG", 14, y, 80, 60);
                y += 65;
              }
            } catch (err) {
              console.error("Erro ao adicionar gráfico:", err);
            }
          }

          if (stats.options.length > 0) {
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...colors.secondary);
            pdf.text("Resultados por opção:", 14, y);
            y += 7;

            const optionHeaders = ["Opção", "Votos", "Percentual"];
            const optionWidths = [100, 30, 50];

            const optionData = stats.options.map((option) => {
              const percentage =
                stats.total > 0
                  ? Math.round((option.votes / stats.total) * 100)
                  : 0;

              return [option.label, option.votes.toString(), `${percentage}%`];
            });

            optionData.push(["Total", stats.total.toString(), "100%"]);

            y = createTable(optionHeaders, optionData, optionWidths, y);
            y += 10;
          }

          if (!stats.isAnonymous && voting.votes) {
            if (y > pageHeight - 40) y = addNewPage();

            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...colors.secondary);
            pdf.text("Detalhes dos Votantes:", 14, y);
            y += 7;

            const votesByOption = {};

            stats.options.forEach((option) => {
              votesByOption[option.label] = [];
            });

            Object.entries(voting.votes || {}).forEach(([userId, option]) => {
              if (!votesByOption[option]) {
                votesByOption[option] = [];
              }

              const participant = meeting.participants?.[userId] || {};
              const timestamp = voting.voteTimestamps?.[userId] || null;
              const formattedDate = timestamp
                ? new Date(timestamp).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Data não disponível";

              votesByOption[option].push({
                name:
                  participant.displayName ||
                  `Usuário ${userId.substring(0, 6)}...`,
                email: participant.email || "-",
                timestamp: formattedDate,
              });
            });

            Object.entries(votesByOption).forEach(([option, voters]) => {
              if (voters.length > 0) {
                if (y > pageHeight - 20) y = addNewPage();

                pdf.setFillColor(240, 240, 240);
                pdf.rect(14, y - 5, pageWidth - 28, 10, "F");

                pdf.setFontSize(10);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...colors.secondary);
                pdf.text(`Opção: ${option} (${voters.length} votos)`, 20, y);
                y += 8;

                if (voters.length > 0) {
                  const voterHeaders = ["Nome", "Email", "Data e hora"];
                  const voterWidths = [80, 70, 40];

                  const voterData = voters.map((voter) => [
                    voter.name,
                    voter.email,
                    voter.timestamp,
                  ]);

                  y = createTable(voterHeaders, voterData, voterWidths, y);
                  y += 5;
                } else {
                  pdf.setFontSize(10);
                  pdf.setFont("helvetica", "italic");
                  pdf.setTextColor(...colors.textLight);
                  pdf.text("Nenhum voto para esta opção", 20, y);
                  y += 10;
                }
              }
            });
          }

          y += 5;
          if (i < votings.length - 1) {
            addDivider();
            y += 5;
          }
        }
      } else {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(...colors.textLight);
        pdf.text("Não há votações registradas nesta reunião", 14, y);
      }

      addFooter();

      const filename = `relatório-${meeting.name.replace(/\s+/g, "-")}.pdf`;
      pdf.save(filename);

      console.log(`PDF gerado com sucesso: ${filename}`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setGeneratingPDF(false);
    }
  };

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

  useEffect(() => {
    const loadReportData = async () => {
      if (!currentUser || !reportId) return;

      try {
        setLoading(true);

        const userReportsRef = ref(
          database,
          `users/${currentUser.uid}/reportAccess/${reportId}`
        );
        const accessSnapshot = await get(userReportsRef);

        if (!accessSnapshot.exists()) {
          setError("Você não tem acesso a este relatório");
          setLoading(false);
          return;
        }

        const meetingData = await getMeetingDetails(reportId);
        setMeeting(meetingData);

        const votingsData = await getMeetingVotings(reportId);
        setVotings(votingsData);
      } catch (err) {
        console.error("Erro ao carregar relatório:", err);
        setError(
          "Não foi possível carregar o relatório. Tente novamente mais tarde."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [currentUser, reportId]);

  useEffect(() => {
    const verifyAccess = async () => {
      if (reportId && currentUser) {
        const hasAccess = await checkReportAccess(currentUser.uid, reportId);
        if (!hasAccess) {
          setError("Você não tem permissão para acessar este relatório");
          navigate("/home");
        }
      }
    };

    verifyAccess();
  }, [reportId, currentUser, navigate]);

  const handleMinervaVote = async (meetingId, votingId, selectedOption) => {
    try {
      // Garantir que temos o currentUser ou usar o user.uid do props
      const userId = currentUser?.uid || user?.uid;

      console.log("Dados recebidos em handleMinervaVote:", {
        meetingId,
        votingId,
        selectedOption,
        userId,
        currentUser: currentUser ? { uid: currentUser.uid } : null,
        user: user ? { uid: user.uid } : null,
      });

      if (!meetingId || !votingId || !userId) {
        console.error("Dados ausentes:", {
          meetingId: Boolean(meetingId),
          votingId: Boolean(votingId),
          userId: Boolean(userId),
        });
        setError("Informações insuficientes para aplicar o voto de minerva");
        return;
      }

      setLoading(true);

      await registerMinervaVote(
        meetingId,
        votingId,
        selectedOption,
        userId // Use o userId em vez de currentUser.uid
      );

      // Atualizar o estado local
      setMeetingVotings((prev) => {
        const updatedVotings = prev[meetingId].map((voting) =>
          voting.id === votingId
            ? {
                ...voting,
                hasMinervaVote: true,
                minervaVotedBy: userId,
                minervaVotedAt: new Date().toISOString(),
                minervaOption: selectedOption,
                officialResult: selectedOption, // Importante para o dashboard
              }
            : voting
        );

        return {
          ...prev,
          [meetingId]: updatedVotings,
        };
      });

      toast.success("Voto de minerva aplicado com sucesso!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Erro ao aplicar voto de minerva:", error);
      setError(error.message || "Erro ao aplicar voto de minerva");

      toast.error(error.message || "Erro ao aplicar voto de minerva", {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando relatórios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button
          className="retry-button"
          onClick={() => {
            setError(null);
            setLoading(true);
            loadUserMeetings();
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="empty-state">
        <h3>Nenhum relatório disponível</h3>
        <p>Você ainda não participou de nenhuma reunião com votações.</p>
      </div>
    );
  }

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
                    className={`meeting-report-card ${
                      isExpanded ? "expanded" : ""
                    }`}
                  >
                    <div
                      className="meeting-card-header"
                      onClick={() => toggleMeetingExpansion(meeting)}
                    >
                      <div className="meeting-card-info">
                        <h3>{meeting.name}</h3>
                        <div className="meeting-meta-info">
                          <span className={`meeting-status ${status.class}`}>
                            <FaClock /> {status.text}
                          </span>
                          <span className="meeting-date">
                            <FaCalendarAlt />{" "}
                            {formatDate(meeting.startDate, meeting.startTime)}
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
                          <div className="stat-card">
                            <FaUsers className="stat-icon" />
                            <div className="stat-content">
                              <span className="stat-value">
                                {meeting.participants
                                  ? Object.keys(meeting.participants).length
                                  : 0}
                              </span>
                              <span className="stat-label">Participantes</span>
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
                                {generatingPDF ? "Gerando..." : "Baixar PDF"}
                              </button>
                            </div>
                          </div>
                        </div>

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
                              const isHighlighted = voting.id === focusVotingId;

                              return (
                                <div
                                  key={voting.id}
                                  id={`voting-${voting.id}`}
                                  className={`voting-report-item ${
                                    isHighlighted ? "highlight-voting" : ""
                                  }`}
                                >
                                  <div className="voting-header">
                                    <h4>
                                      {voting.title || "Votação sem título"}
                                    </h4>
                                    <div className="voting-meta">
                                      <span
                                        className={`voting-status ${
                                          voting.active ? "active" : "ended"
                                        }`}
                                      >
                                        {voting.active ? "Ativa" : "Encerrada"}
                                      </span>
                                      <span className="voting-votes">
                                        {stats.total} voto(s)
                                      </span>
                                    </div>
                                  </div>

                                  <div className="voting-results">
                                    <div className="voting-chart">
                                      {renderChart(stats, chartType)}
                                    </div>

                                    <div className="voting-options-table">
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Opção</th>
                                            <th>Votos</th>
                                            <th>Percentual</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {stats.options.map((option) => {
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
                                                key={option.label}
                                                className={
                                                  option.label === stats.winner
                                                    ? "winner"
                                                    : ""
                                                }
                                              >
                                                <td>{option.label}</td>
                                                <td>{option.votes}</td>
                                                <td>{percentage}%</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>

                                    {!voting.active && stats.total > 0 && (
                                      <VotingResult
                                        stats={stats}
                                        voting={voting}
                                        isOwner={true} // Forçado como true para teste
                                        votingId={voting.id}
                                        onMinervaVote={handleMinervaVote}
                                        meetingId={expandedMeeting.id}
                                      />
                                    )}

                                    <VotingDetailsTable
                                      voting={voting}
                                      participants={meeting.participants || {}}
                                      meeting={meeting}
                                      currentUser={currentUser}
                                    />
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

      {reportId && (
        <div className="report-details-container">
          <div className="report-header">
            <Button
              startIcon={<FaArrowLeft />}
              onClick={() => navigate("/dashboard/reports")}
              sx={{ mb: 2 }}
            >
              Voltar
            </Button>
            <Typography variant="h4" fontWeight="600">
              Relatório: {meeting.name}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FaFileDownload />}
              sx={{ ml: "auto" }}
            >
              Exportar PDF
            </Button>
          </div>

          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="body1">
                <strong>Data da reunião:</strong>{" "}
                {new Date(meeting.createdAt).toLocaleDateString("pt-BR")}
              </Typography>
              <Chip
                label={meeting.active ? "Reunião Ativa" : "Reunião Encerrada"}
                color={meeting.active ? "success" : "default"}
              />
            </Box>

            {meeting.description && (
              <Typography variant="body2" paragraph>
                {meeting.description}
              </Typography>
            )}
          </Paper>

          <Typography variant="h5" gutterBottom fontWeight="600">
            Resultados das Votações
          </Typography>

          {votings.length === 0 ? (
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: 2,
                mb: 4,
              }}
            >
              <Typography variant="body1">
                Esta reunião não possui votações registradas.
              </Typography>
            </Paper>
          ) : (
            votings.map((voting, index) => (
              <Paper
                key={voting.id}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: 1,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ mb: 2 }}
                >
                  {index + 1}. {voting.question}
                </Typography>

                <Box sx={{ my: 3 }}>
                  <VotingResultChart voting={voting} />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Total de votos:{" "}
                    <strong>{Object.values(voting.votes || {}).length}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Criada em:{" "}
                    {new Date(voting.createdAt).toLocaleString("pt-BR")}
                  </Typography>
                </Box>

                {voting.hasMinervaVote && (
                  <Box
                    sx={{ mt: 2, p: 2, bgcolor: "#e3f2fd", borderRadius: 1 }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color="primary"
                    >
                      Resultado após voto de minerva:
                    </Typography>
                    <Typography variant="body2">
                      Opção vencedora:{" "}
                      <strong>
                        {voting.minervaOption || voting.officialResult}
                      </strong>
                    </Typography>
                    {voting.minervaVotedBy &&
                      meeting.participants?.[voting.minervaVotedBy] && (
                        <Typography
                          variant="body2"
                          sx={{ fontStyle: "italic", mt: 1 }}
                        >
                          Voto de minerva dado por:{" "}
                          {meeting.participants[voting.minervaVotedBy]
                            .displayName || "Usuário"}
                        </Typography>
                      )}
                  </Box>
                )}
              </Paper>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ReportDashboard;
