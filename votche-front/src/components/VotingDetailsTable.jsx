import React, { useState } from "react";
import { FaChevronDown, FaChevronUp, FaClock } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../styles/VotingDetailsTable.css";
import VotingResult from "./VotingResult";

const VotingDetailsTable = ({
  voting,
  participants,
  meeting,
  setGeneratingPDF,
  currentUser,
}) => {
  const [showDetails, setShowDetails] = useState(true);

  // Se não houver votos, não exibir nada
  if (!voting || !voting.votes || Object.keys(voting.votes).length === 0) {
    return null;
  }

  // Função para lidar com o voto de minerva
  const handleMinervaVote = (votingId, selectedOption) => {
    console.log(`Voto de Minerva na votação ${votingId}: ${selectedOption}`);
    // A implementação completa será adicionada mais tarde
    // Poderia ser integrada com uma chamada Firebase aqui
  };

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

      // Função para criar logo do Votche (simples)
      const createLogo = () => {
        // Fundo verde arredondado
        pdf.setFillColor(...colors.primary);
        pdf.roundedRect(14, 10, 40, 14, 3, 3, "F");

        // Texto "Votche" em branco
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("VOTCHE", 23, 19.5);
      };

      // Função para adicionar cabeçalho em cada página
      const addPageHeader = () => {
        createLogo();

        // Linha divisória
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.5);
        pdf.line(14, 28, pageWidth - 14, 28);
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
        // Adicionar logo primeiro
        addPageHeader();

        // Título do relatório à direita
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.secondary);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${title}`, pageWidth - 14, 19, { align: "right" });

        // Data do relatório
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
        pdf.text(`Gerado em ${dateStr} às ${timeStr}`, pageWidth - 14, 24, {
          align: "right",
        });
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
        const headerHeight = 10;

        // Retângulo de fundo cinza claro
        pdf.setFillColor(245, 245, 245);
        pdf.rect(14, headerY, pageWidth - 28, headerHeight, "F");

        // Texto principal centralizado verticalmente
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.secondary);

        // Calcular posição Y para texto centralizado
        const textY = headerY + headerHeight / 2 + 1.5; // Ajuste fino para centralização vertical
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

        return headerY + headerHeight + 2;
      };

      // Função para criar tabela
      const createTable = (headers, data, widths, startY) => {
        const tableTop = startY || y;
        let currentY = tableTop;
        const rowHeight = 8;

        // Cabeçalho da tabela
        pdf.setFillColor(240, 240, 240);
        pdf.rect(14, currentY - 5, pageWidth - 28, rowHeight + 2, "F");

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.secondary);

        // Centralizar verticalmente o texto do cabeçalho
        let xPos = 14;
        headers.forEach((header, i) => {
          pdf.text(header, xPos + 4, currentY + rowHeight / 2 - 1.5);
          xPos += widths[i];
        });

        currentY += rowHeight;

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
              pdf.text(header, xHeaderPos + 4, currentY + rowHeight / 2 - 1.5);
              xHeaderPos += widths[i];
            });

            currentY += rowHeight;
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...colors.text);
          }

          // Fundo alternado
          if (isAlternate) {
            pdf.setFillColor(248, 248, 248);
            pdf.rect(14, currentY - 5, pageWidth - 28, rowHeight, "F");
          }
          isAlternate = !isAlternate;

          // Dados da linha
          let xRowPos = 14;
          row.forEach((cell, i) => {
            pdf.text(String(cell), xRowPos + 4, currentY + rowHeight / 2 - 1.5);
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

          // Adicionar informação de vencedor ou empate no PDF
          if (stats.total > 0) {
            y += 10;

            if (stats.isTie) {
              pdf.setFontSize(12);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(211, 84, 0); // Cor de alerta para empate
              pdf.text("Resultado: Empate técnico entre:", 14, y);
              y += 8;

              // Listar as opções empatadas
              stats.winners.forEach((option) => {
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "normal");
                pdf.text(
                  `• ${option} (${stats.maxVotes} votos - ${Math.round(
                    (stats.maxVotes / stats.total) * 100
                  )}%)`,
                  20,
                  y
                );
                y += 6;
              });
            } else {
              pdf.setFontSize(12);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(...colors.primary);
              pdf.text("Resultado: Opção vencedora", 14, y);
              y += 8;

              pdf.setFontSize(11);
              pdf.setFont("helvetica", "normal");
              const percentage = Math.round(
                (stats.maxVotes / stats.total) * 100
              );
              pdf.text(
                `${stats.winner} (${stats.maxVotes} votos - ${percentage}%)`,
                20,
                y
              );
              y += 8;
            }

            y += 5;
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

                // Cabeçalho da opção com centralização vertical
                y = createOptionHeader(option, voters.length, y);

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

  // Função para calcular estatísticas de votação
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

    // Verificar se é uma votação anônima
    const isAnonymous = voting.anonymous === true;

    // Extrair opções e votos
    const options = [];
    let totalVotes = 0;
    let winner = null;
    let maxVotes = 0;
    let winners = []; // Array para armazenar todas as opções com votos máximos (para detectar empate)

    // Processar opções da votação
    if (voting.options && typeof voting.options === "object") {
      Object.entries(voting.options).forEach(([option, votes]) => {
        const voteCount = votes || 0;
        totalVotes += voteCount;
        options.push({ label: option, votes: voteCount });

        // Verificar se é a opção mais votada
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          winner = option;
          winners = [option]; // Resetar lista de vencedores
        } else if (voteCount === maxVotes && voteCount > 0) {
          // Se for igual ao máximo atual, adicionar à lista de vencedores (possível empate)
          winners.push(option);
        }
      });
    }

    // Verificar se há empate (mais de uma opção com votos máximos)
    const isTie = winners.length > 1;

    return {
      options,
      total: totalVotes,
      winner,
      maxVotes,
      isAnonymous,
      isTie,
      winners,
    };
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
