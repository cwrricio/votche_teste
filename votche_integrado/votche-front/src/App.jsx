import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { apiFetch } from "./utils/api";

import LandingPage from "./components/LandingPage";
import MeetingsList from "./components/MeetingsList";
import CreateMeeting from "./components/CreateMeeting";
import EnterMeeting from "./components/EnterMeeting";
import MeetingSession from "./components/MeetingSession";
import ArchivedMeetings from "./components/ArchivedMeetings";
import Sidebar from "./components/Sidebar";
import Topbar from './components/NavigationBar';
import ReportDashboard from "./components/ReportDashboard";


function App() {
  const [user, setUser] = useState(null); // Usuário autenticado pelo back-end
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [meetings, setMeetings] = useState({ created: [], participating: [] });

  const [viewingArchived, setViewingArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isLandingPage = location.pathname === "/";

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Verificar autenticação e carregar reuniões se o usuário estiver logado
  // Checar autenticação no back-end ao carregar
  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await apiFetch("/auth/current_user", { credentials: "include" });
        if (userData && userData._id) {
          setUser(userData);
          await loadUserMeetings(userData._id);
          const savedPath = localStorage.getItem("authRedirectPath");
          if (savedPath) {
            localStorage.removeItem("authRedirectPath");
            navigate(savedPath);
          }
        } else {
          setUser(null);
          setShowDropdown(false);
          setActiveMeeting(null);
          setMeetings({ created: [], participating: [] });
        }
      } catch {
        setUser(null);
        setShowDropdown(false);
        setActiveMeeting(null);
        setMeetings({ created: [], participating: [] });
      }
    }
    checkAuth();
  }, [navigate]);

  // Função para carregar reuniões do usuário
  // Buscar reuniões do usuário autenticado
  const loadUserMeetings = async (userId) => {
    try {
      setIsLoading(true);
      setError("");
      // Exemplo: buscar reuniões criadas e participando
      const created = await apiFetch(`/meetings?organizerId=${userId}`, { credentials: "include" });
      const participating = await apiFetch(`/meetings?participantId=${userId}`, { credentials: "include" });
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

  // Lidar com login via Google
  // Redirecionar para login Google do back-end
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
  };

  // Lidar com logout
  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { credentials: "include" });
      setUser(null);
      navigate("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      setError("Falha ao fazer logout. Tente novamente.");
    }
  };

  // Funções auxiliares


  // Lidar com a seleção de uma reunião
  const handleSelectMeeting = (meeting) => {
    setActiveMeeting(meeting);
    navigate(`/meeting/${meeting._id}`);
  };

  // Lidar com a criação de uma nova reunião
  const handleCreateMeeting = () => {
    if (!user) {
      localStorage.setItem("authRedirectPath", "/create-meeting");
      handleGoogleLogin();
      return;
    }
    navigate("/create-meeting");
  };

  // Lidar com a entrada em uma reunião existente
  const handleEnterMeeting = () => {
    navigate("/enter-meeting");
  };

  // Lidar com a criação bem-sucedida de uma reunião
  const handleMeetingCreated = async () => {
    if (user) await loadUserMeetings(user._id);
    navigate("/home");
  };

  // Lidar com a entrada bem-sucedida em uma reunião
  const handleEnterMeetingComplete = (meeting) => {
    setActiveMeeting(meeting);
    navigate(`/meeting/${meeting.id}`);
  };

  // Lidar com o arquivamento de uma reunião
  const handleArchiveMeeting = async (meetingParam) => {
    if (!user) return;
    const meetingId = typeof meetingParam === "string" ? meetingParam : meetingParam?.id;
    if (!meetingId) {
      console.error("ID da reunião inválido ao tentar arquivar:", meetingParam);
      setError("ID da reunião inválido");
      return;
    }
    try {
      await apiFetch(`/meetings/${meetingId}/archive`, { method: "POST", credentials: "include" });
      await loadUserMeetings(user._id);
    } catch (error) {
      console.error("Erro ao arquivar reunião:", error);
      setError("Falha ao arquivar a reunião. Tente novamente.");
    }
  };

  // Lidar com a visualização de reuniões arquivadas
  const handleViewArchivedMeetings = () => {
    if (!user) return;
    setViewingArchived(true);
    navigate("/archived-meetings");
  };

  // Lidar com o retorno às reuniões regulares
  const handleBackToRegularMeetings = () => {
    setViewingArchived(false);
    navigate("/home");
  };

  // Navegação de volta para home
  const handleBackToHome = () => {
    navigate("/home");
  };

  return (
    <div
      className={`app-container ${isLandingPage ? "landing-page-active" : ""}`}
    >
      {!isLandingPage && (
        <Topbar
          user={user}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          handleLogout={handleLogout}
          handleBackToHome={handleBackToHome}
          handleGoogleLogin={handleGoogleLogin}
        />
      )}

      {!isLandingPage ? (
        <div className="app-layout">
          <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Abrir menu lateral"
          >
            {sidebarOpen ? "×" : "☰"}
          </button>

          <div className="main-content">
            <Routes>
              <Route
                path="/home"
                element={
                  <MeetingsList
                    user={user}
                    meetings={meetings}
                    isLoading={isLoading}
                    error={error}
                    onSelectMeeting={handleSelectMeeting}
                    onCreateNewMeeting={handleCreateMeeting}
                    onEnterMeeting={handleEnterMeeting}
                    onArchiveMeeting={handleArchiveMeeting}
                    onViewArchivedMeetings={handleViewArchivedMeetings}
                    onBackToRegular={handleBackToRegularMeetings}
                    viewingArchived={viewingArchived}
                    onLogin={handleGoogleLogin}
                  />
                }
              />
              <Route
                path="/create-meeting"
                element={
                  user ? (
                    <CreateMeeting
                      user={user}
                      onComplete={handleMeetingCreated}
                      onCancel={handleBackToHome}
                    />
                  ) : (
                    <Navigate to="/home" replace />
                  )
                }
              />
              <Route
                path="/enter-meeting"
                element={
                  <EnterMeeting
                    user={user}
                    onComplete={handleEnterMeetingComplete}
                    onCancel={handleBackToHome}
                    activeMeeting={activeMeeting}
                  />
                }
              />
              <Route
                path="/meeting/:id"
                element={
                  <MeetingSession
                    meetingId={activeMeeting?._id}
                    user={user}
                    onBack={handleBackToHome}
                  />
                }
              />
              <Route
                path="/archived-meetings"
                element={
                  user ? (
                    <ArchivedMeetings
                      user={user}
                      onBack={handleBackToRegularMeetings}
                    />
                  ) : (
                    <Navigate to="/home" replace />
                  )
                }
              />
              <Route
                path="/reports"
                element={<ReportDashboard user={user} />}
              />
              <Route path="/app" element={<Navigate to="/home" replace />} />
              <Route path="/" element={<LandingPage />} />
            </Routes>
          </div>
        </div>
      ) : (
        <div className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </div>
      )}
    </div>
  );
}

export default App;
