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

    // Obter informações completas do usuário atual
    const userInfo = auth.currentUser;

    // Adicionar usuário como participante com informações completas
    await update(
      ref(database, `meetings/${meetingId}/participants/${userId}`),
      {
        joinedAt: new Date().toISOString(),
        name: userInfo.displayName || "",
        email: userInfo.email || "",
        photoURL: userInfo.photoURL || "",
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

// Função para listar todas as reuniões ativas que o usuário participa
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

      if (meetingSnapshot.exists() && meetingSnapshot.val().active) {
        meetings.push({
          id: meetingId,
          ...meetingSnapshot.val(),
        });
      }
    }

    // Ordenar por data de criação (mais recente primeiro)
    return meetings.sort((a, b) => b.createdAt - a.createdAt);
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
    if (typeof meetingData.isAnonymous !== 'undefined') {
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
const registerVoteInMeeting = async (meetingId, votingId, option, userId) => {
  try {
    // Verificar se a votação existe
    const votingRef = ref(
      database,
      `meetings/${meetingId}/votings/${votingId}`
    );
    const votingSnapshot = await get(votingRef);

    if (!votingSnapshot.exists()) {
      throw new Error("Votação não encontrada");
    }

    const votingData = votingSnapshot.val();

    // Verificar se a votação está ativa
    if (!votingData.active || (votingData.endTime && votingData.endTime < Date.now())) {
      throw new Error("Esta votação foi encerrada");
    }

    // Buscar se a votação é anônima
    // Preferir o campo da votação, se não existir, cair para o da reunião (retrocompatibilidade)
    let isAnonymous = false;
    if (typeof votingData.anonymous !== 'undefined') {
      isAnonymous = votingData.anonymous === true;
    } else {
      const meetingRef = ref(database, `meetings/${meetingId}`);
      const meetingSnapshot = await get(meetingRef);
      const meetingData = meetingSnapshot.exists() ? meetingSnapshot.val() : {};
      isAnonymous = meetingData.isAnonymous === true;
    }

    // Se não for anônima, impedir voto duplo
    if (!isAnonymous && votingData.voters && votingData.voters[userId]) {
      throw new Error("Você já votou nesta votação");
    }

    // Suporte a múltipla escolha
    const isMulti = votingData.votingType === "multi";
    const selectedOptions = isMulti && Array.isArray(option) ? option : [option];

    // Normalizar e validar opções
    const normalizedOptions = selectedOptions.map(opt =>
      opt.trim().charAt(0).toUpperCase() + opt.trim().slice(1).toLowerCase()
    );

    // Atualizar contagem de votos para cada opção
    const updates = {};
    for (const normalizedOption of normalizedOptions) {
      // Verificar se a opção existe
      let originalOption = normalizedOption;
      let optionExists = false;
      if (votingData.options) {
        for (const opt of Object.keys(votingData.options)) {
          const normalizedOpt =
            opt.trim().charAt(0).toUpperCase() +
            opt.trim().slice(1).toLowerCase();
          if (normalizedOpt === normalizedOption) {
            originalOption = opt;
            optionExists = true;
            break;
          }
        }
      }
      if (!optionExists) {
        // Se a opção não existir, criar com texto igual à chave
        const optionsRef = ref(
          database,
          `meetings/${meetingId}/votings/${votingId}/options`
        );
        await update(optionsRef, {
          [normalizedOption]: { text: normalizedOption, count: 0 },
        });
      }
      // Incrementar contagem
      const optionRef = ref(
        database,
        `meetings/${meetingId}/votings/${votingId}/options/${originalOption}`
      );
      const optionSnapshot = await get(optionRef);
      let currentVotes = 0;
      let text = originalOption;
      if (optionSnapshot.exists()) {
        const val = optionSnapshot.val();
        if (typeof val === 'object' && val.count !== undefined) {
          currentVotes = val.count;
          text = val.text || originalOption;
        } else if (typeof val === 'number') {
          currentVotes = val;
        }
      }
      updates[`options/${originalOption}`] = { text, count: currentVotes + 1 };
    }

    // Se NÃO for anônima, registrar voto e timestamp do usuário
    if (!isAnonymous) {
      updates[`voters/${userId}`] = true;
      updates[`votes/${userId}`] = isMulti ? normalizedOptions : normalizedOptions[0];
      updates[`voteTimestamps/${userId}`] = Date.now();
    }

    await update(
      ref(database, `meetings/${meetingId}/votings/${votingId}`),
      updates
    );

    return true;
  } catch (error) {
    console.error("Erro ao registrar voto:", error);
    throw error;
  }
};

// Função para encerrar uma votação
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

    // Atualizar status da votação
    await update(ref(database, `meetings/${meetingId}/votings/${votingId}`), {
      active: false,
    });

    return true;
  } catch (error) {
    console.error("Erro ao encerrar votação:", error);
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

// Exportar todos os objetos/funções no final do arquivo
export {
  app,
  auth,
  googleProvider,
  database,
  generateMeetingPassword,
  // Funções para reuniões
  createMeeting,
  createNewMeeting,
  joinMeetingByPassword,
  getUserMeetings,
  getUserParticipatingMeetings,
  endMeeting,
  createVotingInMeeting,
  registerVoteInMeeting,
  endVoting,
  listenToMeeting,
  listenToVotingsInMeeting,
  // Nova função para listar reuniões públicas
  getAllActiveMeetings,
  leaveMeeting,
  checkMeetingsEndTime,
  archiveMeeting,
  unarchiveMeeting,
  deleteMeeting,
  getUserArchivedMeetings,
  listAllPasswords,
};

export default app;
