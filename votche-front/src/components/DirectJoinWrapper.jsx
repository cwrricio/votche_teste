import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { joinMeetingByPassword } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../styles/DirectJoin.css"; // Crie este arquivo CSS para os estilos

function DirectJoinWrapper() {
  const { meetingId, password } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log(
      `DirectJoinWrapper: Tentando acessar meetingId=${meetingId}, password=${password}`
    );

    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuário já está autenticado
        joinMeetingAndRedirect(user);
      } else {
        // Usuário não está autenticado
        console.log("Usuário não autenticado, salvando redirecionamento");
        localStorage.setItem(
          "authRedirectPath",
          `/join-direct/${meetingId}/${password}`
        );
        navigate("/home", { state: { needAuth: true } });
      }
    });

    return () => unsubscribe();
  }, [meetingId, password, navigate]);

  const joinMeetingAndRedirect = async (user) => {
    try {
      console.log("Tentando entrar na reunião com senha:", password);
      const meeting = await joinMeetingByPassword(password, user.uid);
      console.log("Entrada na reunião bem-sucedida:", meeting);

      // Importante: atualizar o localStorage para que o App.jsx possa usar essa informação
      localStorage.setItem("activeMeetingId", meeting.id);

      // Redirecionamento direto para a reunião
      navigate(`/meeting/${meeting.id}`);
    } catch (error) {
      console.error("Erro ao entrar na reunião:", error);
      setError(error.message || "Erro ao entrar na reunião");
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="direct-join-container error">
        <h2>Erro ao entrar na reunião</h2>
        <p>{error}</p>
        <button
          onClick={() => navigate("/enter-meeting")}
          className="retry-button"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="direct-join-container">
      <h2>Conectando à reunião...</h2>
      <p>Por favor, aguarde enquanto processamos seu acesso.</p>
      <div className="spinner"></div>
    </div>
  );
}

export default DirectJoinWrapper;
