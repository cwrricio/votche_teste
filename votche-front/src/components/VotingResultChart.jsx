import React from "react";
import { Pie, Bar } from "react-chartjs-2";

const VotingResultChart = ({ voting, chartType = "pie", height = 200 }) => {
  // Se não há dados, mostrar mensagem
  if (!voting || !voting.options || Object.keys(voting.options).length === 0) {
    return (
      <div className="no-data-chart">
        <p>Sem dados para exibir</p>
      </div>
    );
  }

  const options = voting.options;
  const labels = Object.keys(options);
  const data = Object.values(options);
  const totalVotes = data.reduce((a, b) => a + b, 0);

  if (totalVotes === 0) {
    return (
      <div className="no-data-chart">
        <p>Sem votos registrados</p>
      </div>
    );
  }

  // Cores para o gráfico
  const chartColors = [
    "#3498db", // azul
    "#2ecc71", // verde
    "#e74c3c", // vermelho
    "#f39c12", // laranja
    "#9b59b6", // roxo
    "#1abc9c", // turquesa
    "#d35400", // laranja escuro
    "#34495e", // azul escuro
  ];

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: chartColors.slice(0, labels.length),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = Math.round((value / totalVotes) * 100);
            return `${context.label}: ${value} votos (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: `${height}px` }}>
      {chartType === "pie" ? (
        <Pie data={chartData} options={chartOptions} />
      ) : (
        <Bar data={chartData} options={chartOptions} />
      )}
    </div>
  );
};

export default VotingResultChart;
