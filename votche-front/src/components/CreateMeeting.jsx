import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createNewMeeting, generateMeetingPassword } from "../firebase";
import "../styles/CreateMeeting.css";

function CreateMeeting({ user, onComplete, onCancel }) {
  // Estado base para o formulário
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: getTodayDateString(),
    startTime: getCurrentTimeString(),
    hasEndTime: false,
    endDate: getTodayDateString(),
    endTime: getTimeOneHourLater(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Funções utilitárias para datas e horas
  function getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  function getCurrentTimeString() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  }

  function getTimeOneHourLater() {
    const later = new Date();
    later.setHours(later.getHours() + 1);
    return `${String(later.getHours()).padStart(2, "0")}:${String(
      later.getMinutes()
    ).padStart(2, "0")}`;
  }

  // Handler para mudanças no formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Validação de datas/horas
  const validateDateTime = () => {
    const now = new Date();
    const startDateTime = new Date(
      `${formData.startDate}T${formData.startTime}`
    );

    if (startDateTime < now) {
      return "A data e hora de início devem ser futuras";
    }

    if (formData.hasEndTime) {
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      if (endDateTime <= startDateTime) {
        return "A data e hora de término devem ser posteriores à data e hora de início";
      }
    }

    return null;
  };

  // Envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar datas/horas
    const dateTimeError = validateDateTime();
    if (dateTimeError) {
      setError(dateTimeError);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Gerar senha para a reunião
      const password = generateMeetingPassword();

      // Criar dados da reunião
      const meetingData = {
        id: uuidv4(),
        name: formData.name,
        description: formData.description,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        active: true,
        startDate: formData.startDate,
        startTime: formData.startTime,
        hasEndTime: formData.hasEndTime,
        endDate: formData.hasEndTime ? formData.endDate : null,
        endTime: formData.hasEndTime ? formData.endTime : null,
        password: password, // Adicionar senha gerada
      };

      // Salvar no Firebase
      await createNewMeeting(meetingData, user);
      onComplete(meetingData);
    } catch (error) {
      setError(error.message || "Erro ao criar reunião");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-meeting-container">
      <h2>Criar Nova Reunião</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Informações Básicas</h3>
          <div className="form-group">
            <label htmlFor="name">Nome da Reunião</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Digite o nome da reunião"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição (opcional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Adicione uma descrição ou pauta para a reunião"
            />
          </div>
        </div>

        {/* Campos de Agendamento */}
        <div className="form-section">
          <h3>Agendamento</h3>

          <div className="form-group date-time-group">
            <label>Início da Reunião</label>
            <div className="date-time-inputs">
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label htmlFor="hasEndTime">
              <input
                type="checkbox"
                id="hasEndTime"
                name="hasEndTime"
                checked={formData.hasEndTime}
                onChange={handleChange}
              />
              Definir hora de término
            </label>
          </div>

          {formData.hasEndTime && (
            <div className="form-group date-time-group">
              <label>Término da Reunião</label>
              <div className="date-time-inputs">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required={formData.hasEndTime}
                />
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required={formData.hasEndTime}
                />
              </div>
            </div>
          )}

          {!formData.hasEndTime && (
            <p className="info-text">
              A reunião não terá tempo limite definido.
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "Criando..." : "Criar Reunião"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateMeeting;
