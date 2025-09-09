import React, { useState } from "react";
import { FaPlus, FaTimes, FaCheck } from "react-icons/fa";
import "../styles/CreateVoting.css";

const CreateVotingForm = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [duration, setDuration] = useState(5); // duração em minutos

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar formulário
    if (!title.trim()) {
      alert("Por favor, informe um título para a votação");
      return;
    }

    const filteredOptions = options.filter((opt) => opt.trim());
    if (filteredOptions.length < 2) {
      alert("Adicione pelo menos duas opções de votação");
      return;
    }

    // Validar duração
    if (isNaN(duration) || duration < 0.5) {
      alert("Informe uma duração válida (mínimo 0.5 minuto)");
      return;
    }

    // Transformar array em objeto de opções
    const optionsObj = {};
    filteredOptions.forEach((opt) => {
      optionsObj[opt] = 0;
    });

    // Enviar dados incluindo duração
    onSubmit({
      title,
      options: optionsObj,
      duration: Number(duration),
      active: true,
      createdAt: new Date().toISOString(),
    });
  };

  const useDefaultOptions = () => {
    setOptions(["Concordo", "Discordo", "Me abstenho"]);
  };

  return (
    <div className="create-voting-card">
      <div className="create-voting-header">
        <h3>Nova Votação</h3>
      </div>

      <form onSubmit={handleSubmit} className="create-voting-form">
        <div className="form-group">
          <label htmlFor="voting-duration">Duração da Votação (minutos)</label>
          <input
            type="number"
            id="voting-duration"
            min="0.5"
            step="0.5"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="voting-title">Título da Votação</label>
          <input
            type="text"
            id="voting-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Aprovação da proposta"
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label>Opções de Resposta</label>

          <button
            type="button"
            className="default-options-btn"
            onClick={useDefaultOptions}
          >
            <FaCheck /> Usar opções padrão (Concordo/Discordo/Abstenção)
          </button>

          {options.map((option, index) => (
            <div key={index} className="option-input">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Opção ${index + 1}`}
                className="form-input"
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="remove-option"
                  onClick={() => handleRemoveOption(index)}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            className="add-option-btn"
            onClick={handleAddOption}
          >
            <FaPlus /> Adicionar Opção
          </button>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>

          <button type="submit" className="btn-submit">
            Criar Votação
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateVotingForm;
