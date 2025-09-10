import { useState } from "react";
import { createVoting } from "../firebase";
import "../styles/Voting.css";

function CreateVoting({ user, onComplete }) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [duration, setDuration] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      setError("Uma votação precisa ter pelo menos 2 opções");
      return;
    }
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validações
    if (!title.trim()) {
      setError("Informe um título para a votação");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) {
      setError("Informe pelo menos 2 opções válidas");
      return;
    }

    if (isNaN(duration) || duration < 1) {
      setError("A duração mínima é de 1 minuto");
      return;
    }

    try {
      setIsCreating(true);
      const result = await createVoting(
        title,
        validOptions,
        duration,
        user.uid
      );
      onComplete(result);
    } catch (error) {
      setError(error.message || "Erro ao criar votação");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="voting-form-container">
      <h2>Criar Nova Votação</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Pergunta da Votação</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Qual o melhor dia para a reunião?"
            required
          />
        </div>

        <div className="form-group">
          <label>Opções de Resposta</label>
          {options.map((option, index) => (
            <div key={index} className="option-input">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Opção ${index + 1}`}
                required
              />
              <button
                type="button"
                className="remove-option"
                onClick={() => handleRemoveOption(index)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-option-btn"
            onClick={handleAddOption}
          >
            + Adicionar Opção
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="duration">Duração (minutos)</label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            min="1"
            required
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isCreating}
        >
          {isCreating ? 'Criando...' : 'Criar Votação'}
        </button>
      </form>
    </div>
  );
}

export default CreateVoting;
