import { useState, useRef, useEffect } from "react";
import { joinMeetingByPassword } from "../firebase";


function EnterMeeting({ user, onComplete, onCancel, activeMeeting }) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Preencher automaticamente o título se for chamado de uma reunião específica
  const meetingInfo = activeMeeting?.meeting
    ? `Para entrar em "${activeMeeting.meeting.name}"`
    : "Entrar em uma Reunião";

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
    const value = e.target.value.slice(0, 6);
    setPassword(value);
  };

  return (
    <div className="voting-form-container">
      <h2>{meetingInfo}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">
            Digite a senha da reunião (6 caracteres)
          </label>
          <input
            ref={inputRef}
            type="text"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Digite a senha de 6 caracteres"
            maxLength="6"
            autoComplete="off"
            className={password.length === 6 ? "valid-password" : ""}
            required
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isLoading || password.length !== 6}
        >
          {isLoading ? "Verificando..." : "Entrar na Reunião"}
        </button>

        <button type="button" className="cancel-btn" onClick={onCancel}>
          Cancelar
        </button>
      </form>
    </div>
  );
}

export default EnterMeeting;
