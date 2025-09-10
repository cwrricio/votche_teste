import React, { useState } from "react";
import { FaPlus, FaTimes, FaCheck } from "react-icons/fa";
import "../styles/CreateVoting.css";

const CreateVotingForm = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);

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

    // Transformar array em objeto de opções
    const optionsObj = {};
    filteredOptions.forEach((opt) => {
      optionsObj[opt] = 0;
    });

    // Enviar dados sem duração de votação
    onSubmit({
      title,
      options: optionsObj,
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
                required
              />
            </div>
          ))}

          <div className="options-action-buttons">
            <button
              type="button"
              className="option-action-btn add-option-btn"
              onClick={handleAddOption}
            >
              <FaPlus /> Adicionar Opção
            </button>
            <button
              type="button"
              className="option-action-btn remove-option-btn"
              onClick={() => handleRemoveOption(options.length - 1)}
              disabled={options.length <= 2} // Desabilitar se tiver apenas 2 opções
            >
              <FaTimes /> Remover Opção
            </button>
          </div>
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
