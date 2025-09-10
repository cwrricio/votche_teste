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
import { getUserMeetings, listenToVotingsInMeeting } from "../firebase";
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
  const [meetingVotings, setMeetingVotings] = useState({});
  const [chartType, setChartType] = useState("pie");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Carregar reuniões do usuário
  useEffect(() => {
    const loadUserMeetings = async () => {
      try {
        setLoading(true);
        const userMeetings = await getUserMeetings(user.uid);
        setMeetings(userMeetings);

        // Expandir automaticamente a reunião se indicado na URL
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

    const loadMeetingVotings = () => {
      const unsubscribe = listenToVotingsInMeeting(
        expandedMeeting.id,
        (votings) => {
          setMeetingVotings((prev) => ({
            ...prev,
            [expandedMeeting.id]: votings,
          }));

          // Se há um ID de votação específico para destacar
          if (focusVotingId && votings.some((v) => v.id === focusVotingId)) {
            // Implementar lógica para destacar a votação específica
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
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  // Calcular estatísticas para uma votação
  const calculateVotingStats = (voting) => {
    // Log temporário para debug do formato de options
    if (voting && voting.anonymous === true) {
      // eslint-disable-next-line no-console
      console.log('DEBUG voting.options:', voting.options);
    }
    if (!voting) return { options: [], total: 0, winner: null, maxVotes: 0, isAnonymous: false };

    // Verificar se é uma votação anônima
    const isAnonymous = voting.anonymous === true;

    const options = [];
    let totalVotes = 0;
    let winner = null;
    let maxVotes = 0;

    if (isAnonymous) {
      // Votação anônima: pode ser objeto {opcao: {count, text}} ou array [{label, count}]
      if (Array.isArray(voting.options)) {
        voting.options.forEach((opt) => {
          const label = opt.label || opt.text || opt.opcao || "Opção";
          const voteCount = typeof opt.count === "number" ? opt.count : 0;
          totalVotes += voteCount;
          options.push({ label, votes: voteCount });
          if (voteCount > maxVotes) {
            maxVotes = voteCount;
            winner = label;
          }
        });
      } else if (voting.options && typeof voting.options === "object") {
        Object.entries(voting.options).forEach(([option, value]) => {
          // value pode ser {count, text}
          const voteCount = value && typeof value.count === "number" ? value.count : 0;
          const label = value && value.text ? value.text : option;
          totalVotes += voteCount;
          options.push({ label, votes: voteCount });
          if (voteCount > maxVotes) {
            maxVotes = voteCount;
            winner = label;
          }
        });
      }
    } else {
      // Votação não anônima: contar votos normalmente
      const optionCounts = {};
      if (voting.options && typeof voting.options === "object") {
        Object.keys(voting.options).forEach((option) => {
          optionCounts[option] = 0;
        });
      }
      if (voting.votes && typeof voting.votes === "object") {
        Object.values(voting.votes).forEach((vote) => {
          if (Array.isArray(vote)) {
            vote.forEach((opt) => {
              if (Object.prototype.hasOwnProperty.call(optionCounts, opt)) {
                optionCounts[opt] += 1;
              }
            });
          } else {
            if (Object.prototype.hasOwnProperty.call(optionCounts, vote)) {
              optionCounts[vote] += 1;
            }
          }
        });
      }
      if (voting.options && typeof voting.options === "object") {
        Object.keys(voting.options).forEach((option) => {
          const voteCount = optionCounts[option] || 0;
          totalVotes += voteCount;
          options.push({ label: option, votes: voteCount });
          if (voteCount > maxVotes) {
            maxVotes = voteCount;
            winner = option;
          }
        });
      }
    }

    return { options, total: totalVotes, winner, maxVotes, isAnonymous };
  };

  // Baixar relatório em PDF
  const downloadPDF = async (meeting) => {
    try {
      setGeneratingPDF(true);
      const votings = meetingVotings[meeting.id] || [];

      // Criar documento PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // Definir cores e estilos padrão
      const colors = {
        primary: [30, 163, 74], // Verde primário
        secondary: [52, 73, 94], // Azul escuro
        accent: [241, 196, 15], // Amarelo
        light: [236, 240, 241], // Cinza claro
        text: [44, 62, 80], // Cor texto
        textLight: [127, 140, 141], // Cinza para texto secundário
      };

      // Variáveis de controle de posição
      let y = 30; // Começar mais abaixo para acomodar o header
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Carregar a logo do Votche
      const logoImg = new Image();
      logoImg.src = "/src/assets/votche.png";

      // Função para adicionar cabeçalho em cada página
      const addPageHeader = () => {
        // Retângulo verde no topo
        pdf.setFillColor(...colors.primary);
        pdf.rect(0, 0, pageWidth, 20, "F");

        // Adicionar a logo no canto superior direito
        try {
          pdf.addImage(logoImg, "PNG", pageWidth - 50, 2, 40, 16);
        } catch (e) {
          // Fallback se a imagem não carregar
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text("VOTCHE", pageWidth - 20, 13, { align: "right" });
          console.error("Erro ao carregar logo:", e);
        }
      };

      // Função para adicionar nova página
      const addNewPage = () => {
        pdf.addPage();
        y = 30; // Começar abaixo do cabeçalho
        addPageHeader();
        return y;
      };

      // Adicionar cabeçalho com título
      const addReportHeader = (title) => {
        // Adicionar header verde com logo
        addPageHeader();

        // Título do relatório
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${title}`, 14, 13);

        // Data do relatório abaixo do header
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

      // Adicionar rodapé com paginação
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

      // Função para desenhar uma linha divisória
      const addDivider = () => {
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.5);
        pdf.line(14, y, pageWidth - 14, y);
        y += 5;
      };

      // Função para adicionar seção com título
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

      // Adicionar informação com rótulo e valor
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

      // Função para criar cabeçalho de opção com texto centralizado verticalmente
      const createOptionHeader = (text, voteCount, headerY) => {
        const headerHeight = 12; // Altura aumentada para mais espaço

        // Retângulo de fundo cinza claro
        pdf.setFillColor(240, 240, 240);
        pdf.rect(14, headerY, pageWidth - 28, headerHeight, "F");

        // Texto principal centralizado verticalmente
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.secondary);

        // Calcular posição Y para texto centralizado (ajustado para melhor centralização)
        const textY = headerY + headerHeight / 2 + 1; // Ajuste fino para centralização vertical
        pdf.text(`Opção: ${text}`, 20, textY);

        // Contagem de votos à direita
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.textLight);
        pdf.text(
          `(${voteCount} ${voteCount === 1 ? "voto" : "votos"})`,
          pageWidth - 20,
          textY,
          { align: "right" }
        );

        return headerY + headerHeight + 3; // Retornar nova posição Y com espaço adicional
      };

      // Função para criar tabela
      const createTable = (headers, data, widths, startY) => {
        const tableTop = startY || y;
        let currentY = tableTop;
        const rowHeight = 10; // Altura de linha aumentada

        // Cabeçalho da tabela com melhor centralização
        pdf.setFillColor(240, 240, 240);
        pdf.rect(14, currentY - 5, pageWidth - 28, rowHeight + 2, "F");

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.secondary);

        // Centralizar verticalmente o texto do cabeçalho
        let xPos = 14;
        headers.forEach((header, i) => {
          pdf.text(header, xPos + 4, currentY + rowHeight / 2 - 1);
          xPos += widths[i];
        });

        currentY += rowHeight + 2;

        // Linhas da tabela
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.text);

        // Linhas alternadas
        let isAlternate = false;

        data.forEach((row, rowIndex) => {
          if (currentY > pageHeight - 20) {
            // Adicionar nova página se necessário
            pdf.addPage();
            addPageHeader();
            currentY = 40; // Começar abaixo do cabeçalho

            // Repetir cabeçalho na nova página
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

          // Fundo alternado
          if (isAlternate) {
            pdf.setFillColor(248, 248, 248);
            pdf.rect(14, currentY - 5, pageWidth - 28, rowHeight, "F");
          }
          isAlternate = !isAlternate;

          // Dados da linha com texto centralizado verticalmente
          let xRowPos = 14;
          row.forEach((cell, i) => {
            pdf.text(String(cell), xRowPos + 4, currentY + rowHeight / 2 - 1);
            xRowPos += widths[i];
          });

          currentY += rowHeight;
        });

        return currentY + 5;
      };

      // Converter um gráfico para imagem
      const chartToImage = async (stats, width = 120, height = 100) => {
        return new Promise((resolve) => {
          try {
            // Criar um canvas temporário
            const canvas = document.createElement("canvas");
            canvas.width = width * 2; // Multiplicar por 2 para melhor resolução
            canvas.height = height * 2;
            const ctx = canvas.getContext("2d");

            // Desenhar um gráfico de pizza
            if (stats.options && stats.options.length > 0) {
              const total = stats.total || 1;
              const options = stats.options || [];

              // Coordenadas do centro e raio
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const radius = Math.min(centerX, centerY) - 20;

              // Cores para o gráfico
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

              // Desenhar cada fatia
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

                // Preparar para próxima fatia
                startAngle += sliceAngle;
              });

              // Adicionar legenda
              let legendY = centerY + radius + 30;
              options.forEach((option, index) => {
                const color = chartColors[index % chartColors.length];
                ctx.fillStyle = color;
                ctx.fillRect(20, legendY - 8, 16, 16);

                ctx.fillStyle = "#000";
                ctx.font = "14px Arial";
                const percentage = Math.round((option.votes / total) * 100);
                const legendText = `${option.label}: ${option.votes} (${percentage}%)`;
                ctx.fillText(legendText, 40, legendY);

                legendY += 20;
              });
            } else {
              // Se não houver dados, mostrar mensagem
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

            // Converter para imagem
            resolve(canvas.toDataURL("image/png"));
          } catch (error) {
            console.error("Erro ao gerar gráfico:", error);
            resolve(null);
          }
        });
      };

      // ===== INÍCIO DA GERAÇÃO DO RELATÓRIO =====

      // 1. Cabeçalho e informações da reunião
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

      // 2. Resumo das votações
      if (votings.length > 0) {
        addSection("Resumo das Votações");

        // Tabela de resumo
        const headers = ["Votação", "Status", "Total Votos", "Opção Vencedora"];
        const widths = [80, 30, 30, 45]; // Ajuste de larguras

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

      // 3. Detalhes de cada votação
      if (votings.length > 0) {
        addSection("Detalhes das Votações");

        // Criar uma página para cada votação
        for (let i = 0; i < votings.length; i++) {
          const voting = votings[i];
          const stats = calculateVotingStats(voting);

          if (y > pageHeight - 100) y = addNewPage();

          // Título e informações da votação
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

          // Indicação visual de votação anônima
          if (stats.isAnonymous) {
            pdf.setTextColor(200, 0, 0);
            pdf.setFont("helvetica", "bold");
            pdf.text("VOTAÇÃO ANÔNIMA", pageWidth - 60, y - 6);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...colors.textLight);
          }

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

          // Adicionar gráfico
          if (stats.total > 0) {
            try {
              // Transformar gráfico em imagem
              const chartImage = await chartToImage(stats, 150, 100);
              if (chartImage) {
                pdf.addImage(chartImage, "PNG", 14, y, 80, 60);
                y += 65;
              }
            } catch (err) {
              console.error("Erro ao adicionar gráfico:", err);
            }
          }

          // Tabela de resultados
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

            // Adicionar linha de total
            optionData.push(["Total", stats.total.toString(), "100%"]);

            y = createTable(optionHeaders, optionData, optionWidths, y);
            y += 10;
          }

          // Adicionar detalhes dos votantes se não for anônimo
          if (!stats.isAnonymous && voting.votes) {
            if (y > pageHeight - 40) y = addNewPage();

            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...colors.secondary);
            pdf.text("Detalhes dos Votantes:", 14, y);
            y += 7;

            // Organizar votos por opção
            const votesByOption = {};

            // Inicializar opções
            stats.options.forEach((option) => {
              votesByOption[option.label] = [];
            });

            // Agrupar votantes por opção
            Object.entries(voting.votes || {}).forEach(([userId, option]) => {
              if (!votesByOption[option]) {
                votesByOption[option] = [];
              }

              // Obter detalhes do participante
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

            // Exibir votantes por opção
            Object.entries(votesByOption).forEach(([option, voters]) => {
              if (voters.length > 0) {
                if (y > pageHeight - 20) y = addNewPage();

                // Cabeçalho da opção
                pdf.setFillColor(240, 240, 240);
                pdf.rect(14, y - 5, pageWidth - 28, 10, "F");

                pdf.setFontSize(10);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...colors.secondary);
                pdf.text(`Opção: ${option} (${voters.length} votos)`, 20, y);
                y += 8;

                // Tabela de votantes
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
          } else if (stats.isAnonymous) {
            // Se votação anônima, mostrar mensagem explicativa
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "italic");
            pdf.setTextColor(...colors.textLight);
            pdf.text("Votação anônima: não é possível exibir detalhes dos votantes.", 14, y);
            y += 10;
          }

          // Separador entre votações
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

      // Adicionar rodapé com paginação
      addFooter();

      // Salvar o PDF com nome formatado
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

                                        {/* Resto dos elementos do relatório */}
                                        <div className="voting-report-container">
                                          {/* Usar o componente VotingDetailsTable sem título adicional */}
                                          <VotingDetailsTable
                                            voting={voting}
                                            participants={
                                              meeting?.participants || {}
                                            }
                                          />
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
