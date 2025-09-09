import { useState } from "react";
import { joinMeetingByPassword } from "../firebase";
import "../styles/Voting.css";

function EnterVoting({ user, onComplete }) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || password.length !== 6) {
      setError("A senha deve ter 6 caracteres");
      return;
    }

    try {
      setIsLoading(true);

      // Entrar na reunião usando a senha
      const meeting = await joinMeetingByPassword(password, user.uid);

      // Você pode adaptar o comportamento aqui dependendo do que deseja fazer
      // após entrar na reunião (ex: mostrar as votações disponíveis)
      onComplete(meeting);
    } catch (error) {
      setError(error.message || "Erro ao buscar reunião");
    } finally {
      setIsLoading(false);
    }
  };

  // Função que limita entrada para 6 caracteres
  const handlePasswordChange = (e) => {
    const value = e.target.value.slice(0, 6).toUpperCase();
    setPassword(value);
  };

  return (
    <div className="voting-form-container">
      <h2>Entrar em uma Reunião</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">
            Digite a senha da reunião (6 caracteres)
          </label>
          <input
            type="text"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Digite a senha de 6 caracteres"
            maxLength="6"
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
      </form>
    </div>
  );
}

export default EnterVoting;
