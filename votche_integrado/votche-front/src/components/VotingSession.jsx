// Melhorar o componente VotingSession e adicionar relatório

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { apiFetch } from "../utils/api";

const VotingSession = ({ voting, meetingId, currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [votingData, setVotingData] = useState(null);
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!voting || !meetingId) return;
    setLoading(true);
    setError("");
    apiFetch(`/meetings/${meetingId}/votings/${voting.id}`, { credentials: "include" })
      .then((data) => {
        setVotingData(data);
        // Verifica se o usuário já votou
        if (data.votes && data.votes[currentUser._id]) {
          setSelectedOption(data.votes[currentUser._id]);
          setHasVoted(true);
        } else {
          setHasVoted(false);
          setSelectedOption("");
        }
      })
      .catch(() => {
        setError("Erro ao carregar dados da votação");
      })
      .finally(() => setLoading(false));
  }, [voting, meetingId, currentUser]);

  const handleVote = async () => {
    if (!selectedOption) {
      setError("Selecione uma opção para votar");
      return;
    }

    try {
      setLoading(true);
      await apiFetch(`/meetings/${meetingId}/votings/${voting.id}/vote`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ userId: currentUser._id, option: selectedOption }),
      });
      setHasVoted(true);
      setError("");
    } catch {
      setError("Ocorreu um erro ao registrar seu voto");
    } finally {
      setLoading(false);
    }
  };

  const getVoteCounts = () => {
    if (!votingData || !votingData.votes) return {};

    const counts = {};
    Object.values(votingData.votes).forEach((vote) => {
      counts[vote] = (counts[vote] || 0) + 1;
    });
    return counts;
  };

  const formatChartData = () => {
    const counts = getVoteCounts();
    return votingData.options.map((option) => ({
      id: option,
      value: counts[option] || 0,
      label: option,
    }));
  };

  const getTotalVotes = () => {
    return votingData && votingData.votes
      ? Object.keys(votingData.votes).length
      : 0;
  };

  // Formatar data para o relatório
  const formatDate = (timestamp) => {
    if (!timestamp) return "Data não disponível";

    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  // Formatar apenas hora e minuto para exibição do horário de voto


  // Componente de relatório completo
  const VotingReport = () => (
    <Dialog
      open={showReport}
      onClose={() => setShowReport(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Relatório Completo da Votação</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Informações Gerais
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell
                    component="th"
                    sx={{ fontWeight: "bold", width: "30%" }}
                  >
                    Pergunta
                  </TableCell>
                  <TableCell>{votingData.question}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: "bold" }}>
                    Total de votos
                  </TableCell>
                  <TableCell>{getTotalVotes()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: "bold" }}>
                    Criado em
                  </TableCell>
                  <TableCell>{formatDate(votingData.createdAt)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: "bold" }}>
                    Status
                  </TableCell>
                  <TableCell>
                    {votingData.active ? (
                      <Chip label="Ativa" color="success" size="small" />
                    ) : (
                      <Chip label="Encerrada" color="error" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Distribuição dos Votos
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Opção</TableCell>
                      <TableCell align="right">Votos</TableCell>
                      <TableCell align="right">Porcentagem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {votingData.options.map((option) => {
                      const counts = getVoteCounts();
                      const voteCount = counts[option] || 0;
                      const percentage =
                        getTotalVotes() > 0
                          ? Math.round((voteCount / getTotalVotes()) * 100)
                          : 0;

                      return (
                        <TableRow key={option}>
                          <TableCell>{option}</TableCell>
                          <TableCell align="right">{voteCount}</TableCell>
                          <TableCell align="right">{percentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} md={6}>
              {getTotalVotes() > 0 ? (
                <Box sx={{ height: 300 }}>
                  <BarChart
                    series={[
                      {
                        data: formatChartData().map((item) => item.value),
                        label: "Votos",
                        color: "#3f51b5",
                      },
                    ]}
                    xAxis={[
                      {
                        data: formatChartData().map((item) => item.label),
                        scaleType: "band",
                      },
                    ]}
                    height={300}
                  />
                </Box>
              ) : (
                <Alert severity="info">
                  Ainda não há votos para exibir no gráfico
                </Alert>
              )}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowReport(false)}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );





  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!votingData) {
    return <Alert severity="error">Dados da votação não encontrados</Alert>;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      {/* Header com informações da votação */}
      <Box sx={{ mb: 3, borderLeft: "4px solid #3f51b5", pl: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {votingData.question}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Chip
            label={`Total: ${getTotalVotes()} votos`}
            color="primary"
            size="small"
            variant="outlined"
          />
          {hasVoted && <Chip label="Você votou" color="success" size="small" />}

          {/* Botão de relatório */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowReport(true)}
            sx={{ ml: "auto" }}
          >
            Ver Relatório Completo
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Área de votação */}
        <Grid item xs={12} md={hasVoted ? 6 : 12}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom sx={{ fontWeight: "medium" }}>
            Selecione uma opção:
          </Typography>

          <RadioGroup
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
          >
            <Grid container spacing={2}>
              {votingData.options.map((option, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: hasVoted ? "default" : "pointer",
                      border:
                        selectedOption === option ? "2px solid #3f51b5" : "",
                      backgroundColor:
                        selectedOption === option
                          ? "rgba(63, 81, 181, 0.08)"
                          : "",
                      transition: "all 0.2s ease",
                      "&:hover": hasVoted
                        ? {}
                        : {
                          borderColor: "#3f51b5",
                          backgroundColor: "rgba(63, 81, 181, 0.04)",
                        },
                    }}
                    onClick={() => !hasVoted && setSelectedOption(option)}
                  >
                    <CardContent>
                      <FormControlLabel
                        value={option}
                        control={<Radio color="primary" />}
                        label={
                          <Typography variant="body1">{option}</Typography>
                        }
                        disabled={hasVoted}
                        sx={{ width: "100%" }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </RadioGroup>

          {!hasVoted && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, py: 1.5 }}
              onClick={handleVote}
              disabled={!selectedOption}
            >
              Confirmar Voto
            </Button>
          )}
        </Grid>

        {/* Resultados */}
        {hasVoted && (
          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              gutterBottom
              align="center"
              sx={{ fontWeight: "medium" }}
            >
              Resultados Parciais
            </Typography>

            {getTotalVotes() > 0 ? (
              <>
                <Box sx={{ height: 300 }}>
                  <PieChart
                    series={[
                      {
                        data: formatChartData(),
                        highlightScope: {
                          faded: "global",
                          highlighted: "item",
                        },
                        faded: {
                          innerRadius: 30,
                          additionalRadius: -30,
                          color: "gray",
                        },
                      },
                    ]}
                    height={300}
                  />
                </Box>

                <Box sx={{ mt: 2 }}>
                  {votingData.options.map((option, index) => {
                    const counts = getVoteCounts();
                    const voteCount = counts[option] || 0;
                    const percentage =
                      getTotalVotes() > 0
                        ? Math.round((voteCount / getTotalVotes()) * 100)
                        : 0;

                    return (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {option}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {percentage}% ({voteCount})
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{ height: 8, borderRadius: 2, mt: 0.5 }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </>
            ) : (
              <Alert severity="info">Ainda não há votos registrados</Alert>
            )}
          </Grid>
        )}
      </Grid>

      {/* Componente de relatório */}
      <VotingReport />
    </Paper>
  );
};

export default VotingSession;
