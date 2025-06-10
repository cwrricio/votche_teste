import { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  auth,
  googleProvider,
  getUserMeetings,
  getUserParticipatingMeetings,
  getUserArchivedMeetings,
  archiveMeeting,
} from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import CreateMeeting from "./components/CreateMeeting";
import EnterMeeting from "./components/EnterMeeting";
import MeetingsList from "./components/MeetingsList";
import MeetingSession from "./components/MeetingSession";
import DebugInfo from "./components/DebugInfo";
import ArchivedMeetings from "./components/ArchivedMeetings";

function App() {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [meetings, setMeetings] = useState({ created: [], participating: [] });
  const [archivedMeetings, setArchivedMeetings] = useState([]);
  const [viewingArchived, setViewingArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  // Verificar autenticação e carregar reuniões se o usuário estiver logado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      console.log(
        "Estado de autenticação detectado:",
        authUser ? `Usuário: ${authUser.displayName}` : "Nenhum usuário"
      );

      if (authUser) {
        console.log("Detalhes do usuário:", {
          uid: authUser.uid,
          email: authUser.email,
          nome: authUser.displayName,
          verificado: authUser.emailVerified,
        });
        setUser(authUser);

        // Carregar reuniões quando o usuário faz login
        await loadUserMeetings(authUser.uid);

        // Restaurar a rota após login bem-sucedido
        const savedPath = localStorage.getItem("authRedirectPath");
        if (savedPath) {
          localStorage.removeItem("authRedirectPath");
        }
      } else {
        setUser(null);
        setShowDropdown(false);
        setCurrentView("home");
        setActiveMeeting(null);
        setMeetings({ created: [], participating: [] });
      }
    });

    return () => unsubscribe();
  }, []);

  // Função para carregar reuniões do usuário
  const loadUserMeetings = async (userId) => {
    try {
      setIsLoading(true);
      setError("");

      // Carregar reuniões criadas pelo usuário
      const created = await getUserMeetings(userId);

      // Carregar reuniões que o usuário participa
      const participating = await getUserParticipatingMeetings(userId);

      setMeetings({ created, participating });
    } catch (error) {
      console.error("Erro ao carregar reuniões:", error);
      setError("Falha ao carregar reuniões. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Função para login com Google
  const handleGoogleLogin = async () => {
    try {
      console.log("Iniciando login com Google...");

      // Configurar parâmetros adicionais
      googleProvider.setCustomParameters({
        // Forçar seleção de conta sempre
        prompt: "select_account",
      });

      // Usar popup em vez de redirecionamento
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login com Google bem-sucedido!", result.user);
      setUser(result.user);

      // Carregar reuniões após login bem-sucedido
      await loadUserMeetings(result.user.uid);
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);

      // Mensagem de erro mais específica para o usuário
      if (error.code === "auth/popup-blocked") {
        alert(
          "O popup de login foi bloqueado. Por favor, permita popups para este site."
        );
      } else if (error.code === "auth/popup-closed-by-user") {
        alert("Você fechou a janela de login antes de concluir.");
      } else {
        alert(`Erro ao fazer login: ${error.message}`);
      }
    }
  };

  // Função para logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowDropdown(false);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Função para formatar o nome do usuário (pegar apenas o primeiro nome)
  const formatUserName = (fullName) => {
    if (!fullName) return "";
    const firstName = fullName.split(" ")[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  // Funções para navegação
  const handleCreateMeeting = () => {
    setCurrentView("create");
  };

  const handleEnterMeeting = () => {
    setCurrentView("enter");
  };

  const handleMeetingCreated = async (result) => {
    if (user) {
      await loadUserMeetings(user.uid); // Recarregar lista de reuniões
      setActiveMeeting({
        id: result.id,
        pin: result.pin,
      });
      setCurrentView("meeting");
    }
  };

  const handleEnterMeetingComplete = (meeting) => {
    setActiveMeeting({
      id: meeting.id,
      pin: meeting.pin || null,
    });
    setCurrentView("meeting");
  };

  const handleSelectMeeting = (meeting) => {
    // Verificar se o usuário é o proprietário da reunião
    if (user && user.uid === meeting.createdBy) {
      // Usuário é o dono, acesso direto
      setActiveMeeting({
        id: meeting.id,
        pin: meeting.pin || null,
      });
      setCurrentView("meeting");
    } else {
      // Usuário não é o dono, precisa fornecer PIN
      setActiveMeeting({
        id: meeting.id,
        requirePin: true,
        meeting: meeting,
      });
      setCurrentView("enter");
    }
  };

  const handleBackToHome = async () => {
    if (user) {
      await loadUserMeetings(user.uid); // Recarregar lista de reuniões ao voltar
    }
    setCurrentView("home");
    setActiveMeeting(null);
  };

  // Handler para arquivar reunião
  const handleArchiveMeeting = async (meeting) => {
    if (!user) return;

    try {
      await archiveMeeting(meeting.id, user.uid);
      // Após arquivar, recarregar as reuniões do usuário
      await loadUserMeetings(user.uid);
    } catch (error) {
      console.error("Erro ao arquivar reunião:", error);
      alert("Não foi possível arquivar a reunião.");
    }
  };

  // Função para carregar reuniões arquivadas
  const handleViewArchivedMeetings = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const archived = await getUserArchivedMeetings(user.uid);
      setArchivedMeetings(archived);
      setViewingArchived(true);
    } catch (error) {
      console.error("Erro ao carregar reuniões arquivadas:", error);
      alert("Não foi possível carregar as reuniões arquivadas.");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para voltar às reuniões normais
  const handleBackToRegularMeetings = async () => {
    setViewingArchived(false);
    if (user) {
      // Recarregar reuniões normais para garantir atualização
      await loadUserMeetings(user.uid);
    }
  };

  // Determinar qual componente renderizar
  const renderContent = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="home-container">
            <MeetingsList
              user={user}
              meetings={
                viewingArchived
                  ? { created: archivedMeetings, participating: [] }
                  : meetings
              }
              isLoading={isLoading}
              error={error}
              onSelectMeeting={handleSelectMeeting}
              onCreateNewMeeting={handleCreateMeeting}
              onEnterMeeting={handleEnterMeeting}
              onRefresh={() => {
                if (user) loadUserMeetings(user.uid);
              }}
              onLogin={handleGoogleLogin}
              onArchiveMeeting={handleArchiveMeeting}
              onViewArchivedMeetings={handleViewArchivedMeetings}
              onBackToRegular={handleBackToRegularMeetings}
              viewingArchived={viewingArchived}
            />
          </div>
        );

      case "archived":
        return (
          <ArchivedMeetings
            user={user}
            onBack={() => setCurrentView("home")}
            onViewMeeting={handleSelectMeeting}
          />
        );

      case "create":
        return (
          <CreateMeeting
            user={user}
            onComplete={handleMeetingCreated}
            onCancel={handleBackToHome}
          />
        );

      case "enter":
        return (
          <EnterMeeting
            user={user}
            onComplete={handleEnterMeetingComplete}
            onCancel={handleBackToHome}
            activeMeeting={activeMeeting}
          />
        );

      case "meeting":
        return (
          <MeetingSession
            meetingId={activeMeeting?.id}
            user={user}
            onBack={handleBackToHome}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Topbar */}
      <div className="topbar">
        <div className="logo" onClick={handleBackToHome}>
          Votchê
        </div>
        {user ? (
          <div className="user-profile" ref={dropdownRef}>
            <div
              className="profile-container"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <img
                src={user.photoURL}
                alt="Foto de perfil"
                className="profile-photo"
              />
              <span className="user-name">
                {formatUserName(user.displayName)}
              </span>
            </div>
            {showDropdown && (
              <div className="profile-dropdown">
                <button onClick={handleBackToHome} className="dropdown-item">
                  Minhas Reuniões
                </button>
                <button onClick={handleLogout} className="dropdown-item">
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="login-button" onClick={handleGoogleLogin}>
            <span className="user-icon">👤</span>
            <span>Login</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">{renderContent()}</div>
    </div>
  );
}

export default App;
