import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Removido pois não está sendo usado
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  push,
  get,
  update,
  onValue,
  remove,
  serverTimestamp,
  increment, // Adicione esta importação
} from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAi9LEChjv5ScJz6VlAdXujnFDj9wdvXFc",
  authDomain: "votche-5271a.firebaseapp.com",
  projectId: "votche-5271a",
  storageBucket: "votche-5271a.firebasestorage.app",
  messagingSenderId: "128313100914",
  appId: "1:128313100914:web:39e6c09bf624252a7450eb",
  measurementId: "G-PB7N8Z0HDM",
  databaseURL: "https://votche-5271a-default-rtdb.firebaseio.com",
};

// Verificar se todas as configurações necessárias estão presentes
if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId
) {
  console.error("Configuração do Firebase incompleta:", firebaseConfig);
}

// Inicializar Firebase e serviços
let app;
let auth;
let database;
// analytics removido pois não está sendo usado

try {
  app = initializeApp(firebaseConfig);
  // analytics = getAnalytics(app); // Removido pois não está sendo usado
  database = getDatabase(app);
  auth = getAuth(app);

  console.log("Firebase inicializado com sucesso");
  console.log("Auth inicializado:", auth ? "Sim" : "Não");
  console.log("Database inicializado:", database ? "Sim" : "Não");

  // Configurar persistência local para que o login seja mantido
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("Persistência local configurada com sucesso");
    })
    .catch((error) => {
      console.error("Erro ao configurar persistência:", error);
    });
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
  // Criar stubs vazios em caso de erro
  app = null;
  auth = null;
  database = null;
  // analytics = null; // Removido pois não está sendo usado
}

// Verificar domínio autorizado
console.log("Domínio atual:", window.location.hostname);
console.log("authDomain configurado:", firebaseConfig.authDomain);

// Configurando o provedor Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Função para gerar senha aleatória alfanumérica de 6 caracteres
const generateMeetingPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ==================== FUNÇÕES DE REUNIÃO ====================

// Função para criar uma nova reunião
const createMeeting = async (name, description, date, time, createdBy) => {
  try {
    const password = generateMeetingPassword();

    // Verifica se a senha já existe
    const passwordRef = ref(database, `passwords/${password}`);
    const passwordSnapshot = await get(passwordRef);

    if (passwordSnapshot.exists()) {
      // Se a senha já existir, gerar outra
      return createMeeting(name, description, date, time, createdBy);
    }

    // Referência para nova reunião
    const meetingRef = push(ref(database, "meetings"));
    const meetingId = meetingRef.key;

    // Salvar dados da reunião
    await set(meetingRef, {
      name,
      description,
      date,
      time,
      createdBy,
      createdAt: Date.now(),
      active: true,
      password,
    });

    // Associar senha à reunião
    await set(ref(database, `passwords/${password}`), {
      id: meetingId,
      type: "meeting",
    });

    // Registrar reunião ao usuário criador
    await set(ref(database, `users/${createdBy}/meetings/${meetingId}`), true);

    return {
      id: meetingId,
      password,
    };
  } catch (error) {
    console.error("Erro ao criar reunião:", error);

    // Mensagem mais amigável baseada no tipo de erro
    if (error.code === "PERMISSION_DENIED") {
      throw new Error(
        "Sem permissão para criar reunião. Certifique-se de estar logado."
      );
    } else {
      throw error;
    }
  }
};

// Função para criar uma nova reunião
const createNewMeeting = async (meetingData, user) => {
  try {
    // Salvar os dados da reunião
    await set(ref(database, `meetings/${meetingData.id}`), {
      ...meetingData,
      creatorName: user.displayName || user.email,
      participants: {
        [user.uid]: {
          id: user.uid,
          name: user.displayName || user.email,
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
      },
    });

    // Associar senha à reunião
    await set(ref(database, `passwords/${meetingData.password}`), {
      id: meetingData.id,
      type: "meeting",
    });

    // Adicionar reunião à lista de reuniões do usuário
    await set(ref(database, `users/${user.uid}/meetings/${meetingData.id}`), {
      id: meetingData.id,
      role: "owner",
      createdAt: meetingData.createdAt,
    });

    // Também adicionar à lista de participações do usuário
    await set(
      ref(database, `users/${user.uid}/participatingIn/${meetingData.id}`),
      {
        id: meetingData.id,
        role: "owner",
        joinedAt: new Date().toISOString(),
      }
    );

    return meetingData.id;
  } catch (error) {
    console.error("Erro ao criar reunião:", error);
    throw error;
  }
};

// Função para entrar em uma reunião por senha
const joinMeetingByPassword = async (password, userId) => {
  try {
    // Primeiro, vamos garantir que a senha não seja undefined ou vazia
    if (!password || password.trim() === "") {
      throw new Error("Senha não fornecida");
    }

    // Normalizar a senha (remover espaços e converter para maiúsculas)
    const normalizedPassword = password.trim().toUpperCase();

    console.log("Tentando entrar com senha:", normalizedPassword);

    // Buscar a reunião associada à senha
    const passwordRef = ref(database, `passwords/${normalizedPassword}`);
    const passwordSnapshot = await get(passwordRef);

    if (!passwordSnapshot.exists()) {
      console.log(
        "Senha não encontrada no registro de senhas:",
        normalizedPassword
      );

      // Tentar buscar reuniões diretamente para verificar se a senha existe
      const meetingsRef = ref(database, "meetings");
      const meetingsSnapshot = await get(meetingsRef);

      if (meetingsSnapshot.exists()) {
        let foundMeeting = null;

        meetingsSnapshot.forEach((childSnapshot) => {
          const meeting = childSnapshot.val();
          if (
            meeting.password &&
            meeting.password.toUpperCase() === normalizedPassword
          ) {
            foundMeeting = {
              id: childSnapshot.key,
              ...meeting,
            };
            return true; // Equivalente a break
          }
        });

        if (foundMeeting) {
          // Se encontrou a reunião, registrar a senha no local correto
          await set(ref(database, `passwords/${normalizedPassword}`), {
            id: foundMeeting.id,
            type: "meeting",
          });

          // Continuar com o processo usando o ID encontrado
          const meetingId = foundMeeting.id;

          // Verificar se a reunião está ativa
          if (!foundMeeting.active) {
            throw new Error("Esta reunião foi encerrada");
          }

          // Adicionar usuário como participante
          await update(ref(database, `meetings/${meetingId}/participants`), {
            [userId]: {
              joinedAt: new Date().toISOString(),
            },
          });

          // Registrar participação do usuário
          await update(ref(database, `users/${userId}/participatingIn`), {
            [meetingId]: {
              joinedAt: new Date().toISOString(),
            },
          });

          return {
            id: meetingId,
            ...foundMeeting,
          };
        }
      }

      throw new Error("Senha inválida");
    }

    const passwordData = passwordSnapshot.val();
    console.log("Dados da senha encontrada:", passwordData);

    // Verificar se a senha está associada a uma reunião
    if (passwordData.type !== "meeting") {
      throw new Error("Esta senha não corresponde a uma reunião");
    }

    const meetingId = passwordData.id;

    // Buscar os dados da reunião
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    const meetingData = meetingSnapshot.val();

    // Verificar se a reunião está ativa
    if (!meetingData.active) {
      throw new Error("Esta reunião foi encerrada");
    }

    // Buscar as informações completas do usuário através do Auth
    const userAuth = auth.currentUser;
    // Se não conseguirmos obter do Auth, vamos tentar buscar do banco de usuários
    let userName = userAuth?.displayName || "";
    let userEmail = userAuth?.email || "";
    let userPhoto = userAuth?.photoURL || "";

    if (!userName || !userEmail) {
      try {
        // Tentar obter dados do perfil do usuário no banco
        const userProfileRef = ref(database, `users/${userId}/profile`);
        const userProfileSnapshot = await get(userProfileRef);

        if (userProfileSnapshot.exists()) {
          const userProfile = userProfileSnapshot.val();
          userName =
            userName || userProfile.displayName || userProfile.name || "";
          userEmail = userEmail || userProfile.email || "";
          userPhoto = userPhoto || userProfile.photoURL || "";
        }
      } catch (profileErr) {
        console.log("Erro ao buscar perfil do usuário:", profileErr);
      }
    }

    // Usar o email para extrair um nome se ainda não temos
    const emailName = userEmail ? userEmail.split("@")[0] : "";
    const displayName =
      userName || emailName || `Usuário ${userId.substring(0, 6)}`;

    // Garantir que salvamos todos os dados possíveis do usuário
    await update(
      ref(database, `meetings/${meetingId}/participants/${userId}`),
      {
        joinedAt: new Date().toISOString(),
        name: displayName,
        email: userEmail,
        photoURL: userPhoto,
        fullName: displayName,
        id: userId,
      }
    );

    // Registrar participação do usuário
    await update(ref(database, `users/${userId}/participatingIn`), {
      [meetingId]: {
        joinedAt: new Date().toISOString(),
      },
    });

    return {
      id: meetingId,
      ...meetingData,
    };
  } catch (error) {
    console.error("Erro ao entrar na reunião:", error);
    throw error;
  }
};

// Função para listar reuniões criadas pelo usuário
const getUserMeetings = async (userId) => {
  try {
    const userMeetingsRef = ref(database, `users/${userId}/meetings`);
    const userMeetingsSnapshot = await get(userMeetingsRef);

    if (!userMeetingsSnapshot.exists()) {
      return [];
    }

    const meetingsIds = Object.keys(userMeetingsSnapshot.val());
    const meetings = [];

    // Buscar dados completos de cada reunião
    for (const meetingId of meetingsIds) {
      const meetingRef = ref(database, `meetings/${meetingId}`);
      const meetingSnapshot = await get(meetingRef);

      if (meetingSnapshot.exists()) {
        meetings.push({
          id: meetingId,
          ...meetingSnapshot.val(),
        });
      }
    }

    // Ordenar por data de criação (mais recente primeiro)
    return meetings.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Erro ao listar reuniões do usuário:", error);
    throw error;
  }
};

// Função para verificar se usuário tem acesso ao relatório de uma reunião
const checkReportAccess = async (userId, meetingId) => {
  try {
    // Verificar se o usuário é o criador da reunião
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      return false;
    }

    const meetingData = meetingSnapshot.val();

    // Se o usuário for o criador da reunião, tem acesso
    if (meetingData.createdBy === userId) {
      return true;
    }

    // Verificar se o usuário é participante da reunião
    const participantsRef = ref(
      database,
      `meetings/${meetingId}/participants/${userId}`
    );
    const participantSnapshot = await get(participantsRef);

    if (participantSnapshot.exists()) {
      return true;
    }

    // Verificar se o usuário votou em alguma das votações da reunião
    const votingsRef = ref(database, `meetings/${meetingId}/votings`);
    const votingsSnapshot = await get(votingsRef);

    if (votingsSnapshot.exists()) {
      const votingIds = Object.keys(votingsSnapshot.val());

      for (const votingId of votingIds) {
        const votingRef = ref(database, `votings/${votingId}/votes/${userId}`);
        const voteSnapshot = await get(votingRef);

        if (voteSnapshot.exists()) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Erro ao verificar acesso ao relatório:", error);
    return false;
  }
};

// Função para listar todas as reuniões que o usuário participa (ativas e encerradas)
const getUserParticipatingMeetings = async (userId) => {
  try {
    const participatingRef = ref(database, `users/${userId}/participatingIn`);
    const participatingSnapshot = await get(participatingRef);

    if (!participatingSnapshot.exists()) {
      return [];
    }

    const meetingsIds = Object.keys(participatingSnapshot.val());
    const meetings = [];

    // Buscar dados completos de cada reunião
    for (const meetingId of meetingsIds) {
      const meetingRef = ref(database, `meetings/${meetingId}`);
      const meetingSnapshot = await get(meetingRef);

      if (meetingSnapshot.exists()) {
        // Incluir todas as reuniões, independente se estão ativas ou não
        meetings.push({
          id: meetingId,
          ...meetingSnapshot.val(),
        });
      }
    }

    // Ordenar por data de criação (mais recente primeiro)
    return meetings.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Erro ao listar reuniões que o usuário participa:", error);
    throw error;
  }
};

// Função para encerrar uma reunião
const endMeeting = async (meetingId, userId) => {
  try {
    // Verificar se o usuário é o criador da reunião
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    const meetingData = meetingSnapshot.val();

    if (meetingData.createdBy !== userId) {
      throw new Error("Apenas o criador da reunião pode encerrá-la");
    }

    // Atualizar status da reunião
    await update(meetingRef, {
      active: false,
    });

    // Encerrar todas as votações ativas na reunião
    if (meetingData.votings) {
      const votingsToUpdate = {};

      Object.entries(meetingData.votings).forEach(([votingId, voting]) => {
        if (voting.active) {
          votingsToUpdate[`votings/${votingId}/active`] = false;
        }
      });

      if (Object.keys(votingsToUpdate).length > 0) {
        await update(meetingRef, votingsToUpdate);
      }
    }

    return true;
  } catch (error) {
    console.error("Erro ao encerrar reunião:", error);
    throw error;
  }
};

// Função para criar votação dentro de uma reunião
const createVotingInMeeting = async (
  meetingId,
  title,
  options,
  durationMinutes,
  createdBy,
  votingType = "single"
) => {
  try {
    // Verificar se a reunião existe e está ativa
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    const meetingData = meetingSnapshot.val();

    if (!meetingData.active) {
      throw new Error("Não é possível criar votação em uma reunião encerrada");
    }

    // Verificar se o usuário é o criador da reunião
    if (meetingData.createdBy !== createdBy) {
      throw new Error("Apenas o criador da reunião pode criar votações");
    }

    // Calcular tempo de término da votação
    const endTime = Date.now() + durationMinutes * 60 * 1000;

    // Montar objeto de opções: { chave: { text: textoOriginal, count: 0 } }
    const optionsObj = {};
    Object.entries(options).forEach(([key, text]) => {
      optionsObj[key] = { text, count: 0 };
    });

    // Buscar se a reunião é anônima
    let anonymous = false;
    if (typeof meetingData.isAnonymous !== "undefined") {
      anonymous = meetingData.isAnonymous === true;
    }

    // Referência para nova votação
    const votingRef = push(ref(database, `meetings/${meetingId}/votings`));
    const votingId = votingRef.key;

    // Salvar dados da votação
    await set(votingRef, {
      title,
      options: optionsObj,
      createdBy,
      createdAt: Date.now(),
      endTime,
      active: true,
      votingType,
      anonymous,
    });

    return {
      id: votingId,
      meetingId,
    };
  } catch (error) {
    console.error("Erro ao criar votação na reunião:", error);
    throw error;
  }
};

// Função para registrar voto em uma votação de uma reunião
const registerVoteInMeeting = async (
  meetingId,
  votingId,
  selectedOption,
  userId
) => {
  try {
    // Verificar se a votação existe e está ativa
    const votingRef = ref(
      database,
      `meetings/${meetingId}/votings/${votingId}`
    );
    const votingSnapshot = await get(votingRef);

    if (!votingSnapshot.exists()) {
      throw new Error("Votação não encontrada");
    }

    const votingData = votingSnapshot.val();

    if (!votingData.active) {
      throw new Error("Esta votação já foi encerrada");
    }

    // Buscar informações do usuário atual
    const auth = getAuth();
    const currentUser = auth.currentUser;

    // Preparar os dados completos do usuário
    const userDisplayName = currentUser?.displayName || "";
    const userEmail = currentUser?.email || "";
    const userPhotoURL = currentUser?.photoURL || "";

    // Verificar se a votação é anônima
    const isAnonymous = votingData.anonymous === true;

    const updates = {};

    // Registrar o voto - com informações diferentes dependendo se é anônimo ou não
    if (isAnonymous) {
      // Para votações anônimas, registramos apenas que o usuário votou, sem a opção escolhida
      updates[
        `meetings/${meetingId}/votings/${votingId}/anonymousVotes/${userId}`
      ] = true;

      // E registramos a opção escolhida sem associá-la ao usuário
      // Verificamos se a opção já tem contagem ou iniciamos com 1
      updates[
        `meetings/${meetingId}/votings/${votingId}/anonymousOptions/${selectedOption}`
      ] = increment(1);

      // Incrementar o contador total de votos
      if (!votingData.totalVotes) {
        updates[`meetings/${meetingId}/votings/${votingId}/totalVotes`] = 1;
      } else {
        updates[`meetings/${meetingId}/votings/${votingId}/totalVotes`] =
          increment(1);
      }
    } else {
      // Para votações nominais, mantemos o comportamento original
      updates[`meetings/${meetingId}/votings/${votingId}/votes/${userId}`] =
        selectedOption;

      // Incrementar o contador total de votos
      if (!votingData.totalVotes) {
        updates[`meetings/${meetingId}/votings/${votingId}/totalVotes`] = 1;
      } else {
        updates[`meetings/${meetingId}/votings/${votingId}/totalVotes`] =
          increment(1);
      }
    }

    // Registrar o timestamp do voto (em ambos os casos)
    updates[
      `meetings/${meetingId}/votings/${votingId}/voteTimestamps/${userId}`
    ] = serverTimestamp();

    // IMPORTANTE: Atualizar os dados do participante se estiverem incompletos
    const participantRef = ref(
      database,
      `meetings/${meetingId}/participants/${userId}`
    );
    const participantSnapshot = await get(participantRef);

    // Se o participante já existe mas os dados estão incompletos, ou se não existe ainda
    if (
      !participantSnapshot.exists() ||
      !participantSnapshot.val().name ||
      !participantSnapshot.val().email
    ) {
      // Adicionar à lista de atualizações os dados completos do usuário
      updates[`meetings/${meetingId}/participants/${userId}/name`] =
        userDisplayName;
      updates[`meetings/${meetingId}/participants/${userId}/email`] = userEmail;
      updates[`meetings/${meetingId}/participants/${userId}/photoURL`] =
        userPhotoURL;
      updates[`meetings/${meetingId}/participants/${userId}/id`] = userId;

      // Se a entrada de participante não existir, adicionar joinedAt também
      if (!participantSnapshot.exists()) {
        updates[`meetings/${meetingId}/participants/${userId}/joinedAt`] =
          new Date().toISOString();
      }
    }

    // Executar todas as atualizações em uma única operação
    await update(ref(database), updates);

    console.log(
      `Voto ${
        isAnonymous ? "anônimo" : "nominal"
      } registrado com sucesso para a opção ${selectedOption}`
    );
    return true;
  } catch (error) {
    console.error("Erro ao registrar voto:", error);
    throw error;
  }
};

// Função para encerrar uma votação - modificada para lidar com votos anônimos
const endVoting = async (meetingId, votingId, userId) => {
  try {
    // Verificar se o usuário é o criador da reunião
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    const meetingData = meetingSnapshot.val();

    if (meetingData.createdBy !== userId) {
      throw new Error("Apenas o criador da reunião pode encerrar votações");
    }

    // Obter dados da votação
    const votingRef = ref(
      database,
      `meetings/${meetingId}/votings/${votingId}`
    );
    const votingSnapshot = await get(votingRef);

    if (!votingSnapshot.exists()) {
      throw new Error("Votação não encontrada");
    }

    const votingData = votingSnapshot.val();

    // Verificar se a votação é anônima
    const isAnonymous = votingData.anonymous === true;

    // Calcular resultado da votação - usando o método apropriado
    const result = isAnonymous
      ? calculateAnonymousVotingResult(votingData)
      : calculateVotingResult(votingData);

    // Atualizar status da votação com os resultados
    const updates = {
      active: false,
      endedAt: Date.now(),
      endedBy: userId,
      // Novos campos com os resultados
      winningOption: result.isTie ? null : result.winner,
      isTie: result.isTie,
      winners: result.winners,
      hasMinervaVote: false,
      maxVotes: result.maxVotes,
      // Registrar resultado oficial (inicialmente igual ao resultado do cálculo)
      officialResult: result.isTie ? null : result.winner,
    };

    await update(votingRef, updates);
    return true;
  } catch (error) {
    console.error("Erro ao encerrar votação:", error);
    throw error;
  }
};

// Nova função para calcular resultado de votações anônimas
const calculateAnonymousVotingResult = (votingData) => {
  const anonymousOptions = votingData.anonymousOptions || {};
  let maxVotes = 0;
  let winner = null;
  let winners = [];

  console.log("Calculando resultado anônimo com dados:", anonymousOptions);

  // Encontrar o maior número de votos e as opções com esse número
  Object.entries(anonymousOptions).forEach(([option, count]) => {
    // Garantir que count seja um número
    const voteCount = typeof count === "number" ? count : 0;

    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      winner = option;
      winners = [option];
    } else if (voteCount === maxVotes && voteCount > 0) {
      winners.push(option);
    }
  });

  // Verificar se há empate
  const isTie = winners.length > 1;

  console.log("Resultado do cálculo anônimo:", {
    winner,
    winners,
    isTie,
    maxVotes,
  });

  return {
    winner,
    winners,
    isTie,
    maxVotes,
  };
};

// Função auxiliar para calcular o resultado da votação nominal
const calculateVotingResult = (votingData) => {
  // Primeiro contamos os votos por opção
  const voteCounts = {};
  const votes = votingData.votes || {};

  Object.values(votes).forEach((option) => {
    voteCounts[option] = (voteCounts[option] || 0) + 1;
  });

  let maxVotes = 0;
  let winner = null;
  let winners = [];

  // Encontrar o maior número de votos e as opções com esse número
  Object.entries(voteCounts).forEach(([option, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      winner = option;
      winners = [option];
    } else if (count === maxVotes && count > 0) {
      winners.push(option);
    }
  });

  // Verificar se há empate
  const isTie = winners.length > 1;

  return {
    winner,
    winners,
    isTie,
    maxVotes,
  };
};

// Nova função para registrar voto de minerva
const registerMinervaVote = async (
  meetingId,
  votingId,
  selectedOption,
  userId
) => {
  try {
    // Verificar se o usuário é o criador da reunião
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    const meetingData = meetingSnapshot.val();

    if (meetingData.createdBy !== userId) {
      throw new Error(
        "Apenas o criador da reunião pode aplicar voto de minerva"
      );
    }

    // Verificar se a votação existe e está encerrada
    const votingRef = ref(
      database,
      `meetings/${meetingId}/votings/${votingId}`
    );
    const votingSnapshot = await get(votingRef);

    if (!votingSnapshot.exists()) {
      throw new Error("Votação não encontrada");
    }

    const votingData = votingSnapshot.val();

    // Verificar se a votação está inativa (encerrada)
    if (votingData.active) {
      throw new Error(
        "O voto de minerva só pode ser aplicado em votações encerradas"
      );
    }

    // Verificar se a votação é anônima
    const isAnonymous = votingData.anonymous === true;

    let maxVotes = 0;
    let winners = [];

    // Usar a fonte de dados correta dependendo do tipo de votação
    if (isAnonymous) {
      // Para votações anônimas, usar anonymousOptions
      const anonymousOptions = votingData.anonymousOptions || {};

      // Encontrar o maior número de votos
      Object.entries(anonymousOptions).forEach(([option, count]) => {
        const voteCount = typeof count === "number" ? count : 0;
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          winners = [option];
        } else if (voteCount === maxVotes && voteCount > 0) {
          winners.push(option);
        }
      });
    } else {
      // Para votações não anônimas, usar votes diretamente
      const voteCounts = {};
      const votes = votingData.votes || {};

      // Contar votos por opção
      Object.values(votes).forEach((option) => {
        voteCounts[option] = (voteCounts[option] || 0) + 1;
      });

      // Encontrar o maior número de votos
      Object.entries(voteCounts).forEach(([option, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          winners = [option];
        } else if (count === maxVotes && count > 0) {
          winners.push(option);
        }
      });
    }

    // Determinar se há empate (mais de uma opção com o número máximo de votos)
    const isTie = winners.length > 1;

    console.log("Verificação de empate:", {
      isAnonymous,
      maxVotes,
      winners,
      isTie,
      selectedOption,
    });

    // Verificar se há empate
    if (!isTie) {
      throw new Error(
        "O voto de minerva só pode ser aplicado em caso de empate"
      );
    }

    // Verificar se a opção escolhida é uma das opções empatadas
    if (!winners.includes(selectedOption)) {
      throw new Error(
        "O voto de minerva deve escolher uma das opções empatadas"
      );
    }

    // Atualizar a votação com o voto de minerva
    const updates = {
      hasMinervaVote: true,
      minervaVotedBy: userId,
      minervaVotedAt: Date.now(),
      minervaOption: selectedOption, // Definir o resultado oficial
      // Também atualizamos estes campos para garantir consistência
      winners: winners,
      isTie: false, // Após aplicar o voto de minerva, não há mais empate
    };

    await update(votingRef, updates);
    return true;
  } catch (error) {
    console.error("Erro ao registrar voto de minerva:", error);
    throw error;
  }
};

// Função para escutar atualizações de uma reunião
const listenToMeeting = (meetingId, callback) => {
  const meetingRef = ref(database, `meetings/${meetingId}`);
  return onValue(meetingRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({
        id: meetingId,
        ...snapshot.val(),
      });
    } else {
      callback(null);
    }
  });
};

// Função para escutar atualizações das votações em uma reunião
const listenToVotingsInMeeting = (meetingId, callback) => {
  const votingsRef = ref(database, `meetings/${meetingId}/votings`);
  return onValue(votingsRef, (snapshot) => {
    if (snapshot.exists()) {
      const votings = [];
      snapshot.forEach((childSnapshot) => {
        votings.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });

      // Ordenar por data de criação (mais recente primeiro)
      callback(votings.sort((a, b) => b.createdAt - a.createdAt));
    } else {
      callback([]);
    }
  });
};

// Função para buscar reuniões ativas (públicas)
const getAllActiveMeetings = async () => {
  try {
    console.log("Buscando reuniões ativas...");
    const meetingsRef = ref(database, "meetings");
    const meetingsSnapshot = await get(meetingsRef);

    if (!meetingsSnapshot.exists()) {
      console.log("Nenhuma reunião encontrada no Firebase");
      return [];
    }

    const meetings = [];

    meetingsSnapshot.forEach((childSnapshot) => {
      const meeting = childSnapshot.val();

      // Incluir apenas reuniões ativas
      if (meeting.active) {
        meetings.push({
          id: childSnapshot.key,
          ...meeting,
        });
      }
    });

    console.log(`Encontradas ${meetings.length} reuniões ativas`);

    // Ordenar por data de criação (mais recente primeiro)
    return meetings.sort((a, b) => {
      const timeA = a.createdAt || Date.now();
      const timeB = b.createdAt || Date.now();
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Erro ao buscar reuniões públicas:", error);
    return []; // Retorna lista vazia em vez de propagar o erro
  }
};

// Função para sair de uma reunião
const leaveMeeting = async (meetingId, userId) => {
  try {
    // Remover usuário da lista de participantes
    await remove(ref(database, `meetings/${meetingId}/participants/${userId}`));

    // Remover reunião da lista de participações do usuário
    await remove(ref(database, `users/${userId}/participatingIn/${meetingId}`));

    return true;
  } catch (error) {
    console.error("Erro ao sair da reunião:", error);
    throw error;
  }
};

// Função para verificar e atualizar status das reuniões com base no tempo
const checkMeetingsEndTime = async () => {
  const now = new Date();

  try {
    const meetingsRef = ref(database, "meetings");
    const snapshot = await get(meetingsRef);

    if (snapshot.exists()) {
      const meetings = snapshot.val();

      for (const id in meetings) {
        const meeting = meetings[id];

        if (!meeting.active) continue;

        // Verificar se a reunião tem tempo de término definido
        if (meeting.hasEndTime && meeting.endDate && meeting.endTime) {
          const endDateTime = new Date(`${meeting.endDate}T${meeting.endTime}`);

          // Se o tempo definido já passou, encerrar a reunião
          if (endDateTime < now) {
            console.log(
              `Encerrando automaticamente a reunião ${meeting.name} por tempo limite`
            );
            await update(ref(database, `meetings/${id}`), {
              active: false,
              endedAt: now.toISOString(),
              endReason: "timeout",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Erro ao verificar tempo das reuniões:", error);
  }
};

// Executar verificação a cada minuto
setInterval(checkMeetingsEndTime, 60000);

// Função para arquivar uma reunião
const archiveMeeting = async (meetingId, userId) => {
  try {
    // Verificar se o usuário é o proprietário da reunião
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    const meetingData = meetingSnapshot.val();
    if (meetingData.createdBy !== userId) {
      throw new Error("Apenas o criador pode arquivar esta reunião");
    }

    // Mover a reunião para a lista de arquivados do usuário
    await set(
      ref(database, `users/${userId}/archivedMeetings/${meetingId}`),
      true
    );

    // Remover da lista principal de reuniões do usuário
    await remove(ref(database, `users/${userId}/meetings/${meetingId}`));

    return true;
  } catch (error) {
    console.error("Erro ao arquivar reunião:", error);
    throw error;
  }
};

// Função para desarquivar uma reunião
const unarchiveMeeting = async (meetingId, userId) => {
  try {
    // Remover da lista de arquivados
    await remove(
      ref(database, `users/${userId}/archivedMeetings/${meetingId}`)
    );

    // Garantir que está na lista principal de reuniões (caso tenha sido removida)
    await set(ref(database, `users/${userId}/meetings/${meetingId}`), true);

    return true;
  } catch (error) {
    console.error("Erro ao desarquivar reunião:", error);
    throw error;
  }
};

// Função para excluir permanentemente uma reunião
const deleteMeeting = async (meetingId, userId) => {
  try {
    // Verificar se o usuário é o proprietário da reunião
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    const meetingData = meetingSnapshot.val();
    if (meetingData.createdBy !== userId) {
      throw new Error("Apenas o criador pode excluir esta reunião");
    }

    // Remover das listas do usuário
    await remove(ref(database, `users/${userId}/meetings/${meetingId}`));
    await remove(
      ref(database, `users/${userId}/archivedMeetings/${meetingId}`)
    );

    // Remover a senha associada
    if (meetingData.password) {
      await remove(ref(database, `passwords/${meetingData.password}`));
    }

    // Remover a reunião e suas votações
    await remove(ref(database, `meetings/${meetingId}`));
    await remove(ref(database, `votings/${meetingId}`));

    return true;
  } catch (error) {
    console.error("Erro ao excluir reunião:", error);
    throw error;
  }
};

// Função para obter reuniões arquivadas do usuário
const getUserArchivedMeetings = async (userId) => {
  try {
    const userArchivedRef = ref(database, `users/${userId}/archivedMeetings`);
    const userArchivedSnapshot = await get(userArchivedRef);

    if (!userArchivedSnapshot.exists()) {
      return [];
    }

    const archivedMeetingsIds = Object.keys(userArchivedSnapshot.val());

    // Buscar dados completos das reuniões
    const archivedMeetings = await Promise.all(
      archivedMeetingsIds.map(async (meetingId) => {
        const meetingRef = ref(database, `meetings/${meetingId}`);
        const meetingSnapshot = await get(meetingRef);

        if (meetingSnapshot.exists()) {
          const meetingData = meetingSnapshot.val();
          return {
            id: meetingId,
            ...meetingData,
          };
        }

        return null;
      })
    );

    // Filtrar reuniões que não existem mais
    return archivedMeetings.filter((meeting) => meeting !== null);
  } catch (error) {
    console.error("Erro ao obter reuniões arquivadas:", error);
    throw error;
  }
};

// Função para listar todas as senhas (para debug)
const listAllPasswords = async () => {
  try {
    const passwordsRef = ref(database, "passwords");
    const snapshot = await get(passwordsRef);

    if (!snapshot.exists()) {
      console.log("Nenhuma senha registrada");
      return [];
    }

    const passwords = [];
    snapshot.forEach((childSnapshot) => {
      passwords.push({
        password: childSnapshot.key,
        data: childSnapshot.val(),
      });
    });

    console.log("Senhas disponíveis:", passwords);
    return passwords;
  } catch (error) {
    console.error("Erro ao listar senhas:", error);
    return [];
  }
};

// Função para obter relatórios disponíveis para o usuário
const getUserAvailableReports = async (userId) => {
  try {
    // Buscar reuniões onde o usuário tem acesso a relatórios
    const reportsAccessRef = ref(database, `users/${userId}/reportAccess`);
    const reportsSnapshot = await get(reportsAccessRef);

    if (!reportsSnapshot.exists()) {
      return [];
    }

    const reportsAccess = reportsSnapshot.val();
    const meetingIds = Object.keys(reportsAccess);
    const availableReports = [];

    // Buscar dados completos de cada reunião
    for (const meetingId of meetingIds) {
      const meetingRef = ref(database, `meetings/${meetingId}`);
      const meetingSnapshot = await get(meetingRef);

      if (meetingSnapshot.exists()) {
        const meetingData = meetingSnapshot.val();

        // Buscar estatísticas de votação
        const votingsRef = ref(database, `meetings/${meetingId}/votings`);
        const votingsSnapshot = await get(votingsRef);
        const votingsData = votingsSnapshot.exists()
          ? votingsSnapshot.val()
          : {};

        // Calcular estatísticas básicas
        const totalVotings = Object.keys(votingsData).length;

        availableReports.push({
          id: meetingId,
          name: meetingData.name,
          date: meetingData.createdAt,
          status: meetingData.active ? "Ativa" : "Encerrada",
          totalVotings,
          accessedOn: reportsAccess[meetingId].votedAt,
          createdBy: meetingData.createdBy,
        });
      }
    }

    // Ordenar por data de acesso (mais recente primeiro)
    return availableReports.sort((a, b) => {
      const timeA = a.accessedOn || 0;
      const timeB = b.accessedOn || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Erro ao buscar relatórios disponíveis:", error);
    throw error;
  }
};

// Função para obter detalhes completos de uma reunião
const getMeetingDetails = async (meetingId) => {
  try {
    const meetingRef = ref(database, `meetings/${meetingId}`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      throw new Error("Reunião não encontrada");
    }

    return {
      id: meetingId,
      ...meetingSnapshot.val(),
    };
  } catch (error) {
    console.error("Erro ao obter detalhes da reunião:", error);
    throw error;
  }
};

// Função para obter votações de uma reunião
const getMeetingVotings = async (meetingId) => {
  try {
    const meetingRef = ref(database, `meetings/${meetingId}/votings`);
    const meetingSnapshot = await get(meetingRef);

    if (!meetingSnapshot.exists()) {
      return [];
    }

    const votingIds = Object.keys(meetingSnapshot.val());
    const votings = [];

    for (const votingId of votingIds) {
      const votingRef = ref(database, `votings/${votingId}`);
      const votingSnapshot = await get(votingRef);

      if (votingSnapshot.exists()) {
        votings.push({
          id: votingId,
          ...votingSnapshot.val(),
        });
      }
    }

    return votings;
  } catch (error) {
    console.error("Erro ao obter votações da reunião:", error);
    throw error;
  }
};

// Exportar todos os objetos/funções no final do arquivo
export {
  auth,
  googleProvider,
  database,
  createNewMeeting,
  getAllActiveMeetings,
  getUserMeetings,
  joinMeetingByPassword,
  archiveMeeting,
  unarchiveMeeting,
  deleteMeeting,
  getUserArchivedMeetings,
  getUserParticipatingMeetings,
  getMeetingDetails,
  getMeetingVotings,
  checkReportAccess,
  generateMeetingPassword,
  createVotingInMeeting,
  registerVoteInMeeting,
  endMeeting,
  endVoting,
  listenToMeeting,
  listenToVotingsInMeeting,
  leaveMeeting,
  getUserAvailableReports,
  registerMinervaVote,
};
