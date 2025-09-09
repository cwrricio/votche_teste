import { apiFetch } from "../utils/api";
import { useState } from 'react';
import '../styles/Voting.css';

function EnterVoting(props) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pin || pin.length !== 4 || isNaN(pin)) {
      setError('O PIN deve ter 4 números');
      return;
    }

    try {
      setIsLoading(true);
      const voting = await apiFetch(`/votings/pin/${pin}`, { credentials: "include" });

      // Verificar se a votação já acabou
      if (voting.endTime < Date.now() && voting.active) {
        setError('Esta votação já foi encerrada');
        return;
      }

      if (props.onComplete) props.onComplete(voting);
    } catch (error) {
      setError(error.message || 'Erro ao buscar votação');
    } finally {
      setIsLoading(false);
    }
  };

  // Função que limita entrada para somente números e até 4 caracteres
  const handlePinChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(value);
  };

  return (
    <div className="voting-form-container">
      <h2>Entrar em uma Votação</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="pin">Digite o PIN da votação (4 números)</label>
          <input
            type="text"
            id="pin"
            value={pin}
            onChange={handlePinChange}
            placeholder="Digite o PIN de 4 números"
            pattern="[0-9]{4}"
            maxLength="4"
            required
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isLoading || pin.length !== 4}
        >
          {isLoading ? 'Buscando...' : 'Entrar na Votação'}
        </button>
      </form>
    </div>
  );
}

export default EnterVoting;