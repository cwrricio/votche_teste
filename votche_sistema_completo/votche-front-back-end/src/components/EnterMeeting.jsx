import React, { useState, useRef, useEffect } from "react";
import { FaSignInAlt, FaTimes, FaKey } from "react-icons/fa";
import { joinMeetingByPassword } from "../firebase";
import "../styles/EnterMeeting.css";

function EnterMeeting({ user, onComplete, onCancel, activeMeeting }) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Preencher automaticamente o título se for chamado de uma reunião específica
  const meetingInfo = activeMeeting?.meeting
    ? `Para entrar em "${activeMeeting.meeting.name}"`
    : "Digite a senha de acesso abaixo";

  useEffect(() => {
    // Focar no input quando o componente montar
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || password.length !== 6) {
      setError("A senha deve ter 6 caracteres");
      return;
    }

    try {
      setIsLoading(true);
      // Se temos um ID de reunião específico, usamos ele
      const meetingId = activeMeeting?.id;

      let meeting;

      if (meetingId) {
        // Verificar se a senha fornecida corresponde à reunião
        if (
          activeMeeting.meeting &&
          activeMeeting.meeting.password !== password
        ) {
          throw new Error("Senha incorreta para esta reunião");
        }
        meeting = await joinMeetingByPassword(password, user.uid);
      } else {
        // Fluxo padrão - buscar qualquer reunião com a senha
        meeting = await joinMeetingByPassword(password, user.uid);
      }

      onComplete(meeting);
    } catch (error) {
      setError(error.message || "Erro ao entrar na reunião");
    } finally {
      setIsLoading(false);
    }
  };

  // Função que verifica se a entrada é válida
  const handlePasswordChange = (e) => {
    const value = e.target.value.slice(0, 6).toUpperCase();
    setPassword(value);
  };

  return (
    <div className="enter-meeting-container">
      <h2>Entrar em uma Reunião</h2>
      <p className="meeting-context">{meetingInfo}</p>

      {error && <div className="error-message">{error}</div>}

      <form className="enter-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">Senha da Reunião</label>
          <div className="password-input-container">
            <FaKey className="key-icon" />
            <input
              ref={inputRef}
              type="text"
              id="password"
              className="password-input"
              value={password}
              onChange={handlePasswordChange}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              required
            />
          </div>
        </div>

        <div className="form-buttons">
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading || password.length !== 6}
          >
            <FaSignInAlt className="button-icon" />
            {isLoading ? "Verificando..." : "Entrar na Reunião"}
          </button>

          <button type="button" className="cancel-btn" onClick={onCancel}>
            <FaTimes className="button-icon" />
            Cancelar
          </button>
        </div>
      </form>

    </div>
  );
}

export default EnterMeeting;
