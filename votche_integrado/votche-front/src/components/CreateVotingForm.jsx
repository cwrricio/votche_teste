
import React, { useState } from "react";
import { FaPlus, FaTimes, FaCheck } from "react-icons/fa";
import "../styles/CreateVoting.css";

const CreateVotingForm = ({ onSubmit, onCancel }) => {
  const [questions, setQuestions] = useState([
    { title: "", options: ["", ""], type: "radio" }
  ]);

  const handleAddOption = (qIdx) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].options.push("");
    setQuestions(newQuestions);
  };

  const handleRemoveOption = (qIdx, oIdx) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].options.splice(oIdx, 1);
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIdx, oIdx, value) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].options[oIdx] = value;
    setQuestions(newQuestions);
  };

  const handleQuestionTitleChange = (qIdx, value) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].title = value;
    setQuestions(newQuestions);
  };

  const handleQuestionTypeChange = (qIdx, value) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].type = value;
    setQuestions(newQuestions);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { title: "", options: ["", ""], type: "radio" }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validação de todas as perguntas
    for (const q of questions) {
      if (!q.title.trim()) {
        alert("Por favor, informe um título para cada pergunta");
        return;
      }
      const filteredOptions = q.options.filter((opt) => opt.trim());
      if (filteredOptions.length < 2) {
        alert("Cada pergunta deve ter pelo menos duas opções");
        return;
      }
    }
    // Enviar todas as perguntas
    onSubmit(
      questions.map(q => ({
        title: q.title,
        options: q.options.filter(opt => opt.trim()),
        type: q.type,
        active: true,
        createdAt: new Date().toISOString(),
      }))
    );
  };

  const setDefaultOptions = (qIdx) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].options = ["Concordo", "Discordo", "Me abstenho"];
    setQuestions(newQuestions);
  };

  return (
    <div className="create-voting-card">
      <div className="create-voting-header">
        <h3>Nova Votação</h3>
      </div>
      <form onSubmit={handleSubmit} className="create-voting-form">
        {questions.map((q, qIdx) => (
          <div className="question-block" key={qIdx} style={{ border: '1px solid #eee', marginBottom: 16, padding: 12 }}>
            <div className="form-group">
              <label htmlFor={`question-title-${qIdx}`}>Título da Pergunta</label>
              <input
                type="text"
                id={`question-title-${qIdx}`}
                value={q.title}
                onChange={e => handleQuestionTitleChange(qIdx, e.target.value)}
                placeholder="Ex: Aprovação da proposta"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo de Pergunta</label>
              <select value={q.type} onChange={e => handleQuestionTypeChange(qIdx, e.target.value)}>
                <option value="radio">Múltipla escolha (uma opção)</option>
                <option value="checkbox">Caixa de seleção (várias opções)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Opções de Resposta</label>
              <button
                type="button"
                className="default-options-btn"
                onClick={() => setDefaultOptions(qIdx)}
              >
                <FaCheck /> Usar opções padrão (Concordo/Discordo/Abstenção)
              </button>
              {q.options.map((option, oIdx) => (
                <div key={oIdx} className="option-input">
                  <input
                    type="text"
                    value={option}
                    onChange={e => handleOptionChange(qIdx, oIdx, e.target.value)}
                    placeholder={`Opção ${oIdx + 1}`}
                    className="form-input"
                    required
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      className="remove-option"
                      onClick={() => handleRemoveOption(qIdx, oIdx)}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="add-option-btn"
                onClick={() => handleAddOption(qIdx)}
              >
                <FaPlus /> Adicionar Opção
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="add-question-btn" onClick={handleAddQuestion} style={{ marginBottom: 16 }}>
          <FaPlus /> Adicionar Pergunta
        </button>
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
