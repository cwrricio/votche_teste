import { apiFetch } from "../utils/api";
import React, { useState } from "react";
// import { v4 as uuidv4 } from "uuid";
import "../styles/CreateMeeting.css";
import { FaUserSecret, FaClock } from "react-icons/fa";

function CreateMeeting({ user, onComplete, onCancel }) {
  // Estado base para o formulário
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startNow: true,
    startDate: getTodayDateString(),
    startTime: getCurrentTimeString(),
    hasEndTime: false,
    endDate: getTodayDateString(),
    endTime: getTimeOneHourLater(),
    isAnonymous: false,
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

    if (name === "startNow" && checked) {
      setFormData((prev) => ({
        ...prev,
        startNow: checked,
        startDate: getTodayDateString(),
        startTime: getCurrentTimeString(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Validação de datas/horas apenas se não for início imediato
  const validateDateTime = () => {
    if (formData.startNow) {
      return null;
    }
    const now = new Date();
    const startDateTime = new Date(
      `${formData.startDate}T${formData.startTime}`
    );
    const nowWithBuffer = new Date(now.getTime() - 60000);
    if (startDateTime < nowWithBuffer) {
      return "A data e hora de início devem ser atuais ou futuras";
    }
    if (formData.hasEndTime) {
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      if (endDateTime <= startDateTime) {
        return "A data e hora de término devem ser posteriores à data e hora de início";
      }
    }
    return null;
  };

  // NOVO: Função para montar horaTermino (Date) se definido
  function getHoraTermino() {
    if (!formData.hasEndTime) return undefined;
    // Junta data e hora em formato ISO
    return new Date(`${formData.endDate}T${formData.endTime}:00.000Z`);
  }

  // Envio do formulário
  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   if (!formData.startNow) {
  //     const dateTimeError = validateDateTime();
  //     if (dateTimeError) {
  //       setError(dateTimeError);
  //       return;
  //     }
  //   }

  //   setError("");
  //   setIsLoading(true);

  //   try {
  //     // Gera um código único para o organizador
  //     const organizerCode = user._id;

  //     // Monta o objeto createdBy com dados do usuário logado
  //     const createdBy = {
  //       userId: user?._id || user?.uid || "",
  //       name: user?.name || "",
  //       email: user?.email || "",
  //       googleId: user?.googleId || "",
  //     };

  //     // Monta o objeto para o backend conforme o schema do backend
  //     const meetingData = {
  //       name: formData.name,
  //       description: formData.description,
  //       organizerCode,
  //       voteType: formData.isAnonymous ? "anonymous" : "identified",
  //       agendamento: formData.startNow,
  //       horaTermino: getHoraTermino(),
  //       createdBy,
  //       participants: [],
  //       questions: [],
  //     };

  //     await apiFetch("/meetings", {
  //       method: "POST",
  //       credentials: "include",
  //       body: JSON.stringify(meetingData),
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     });
  //     onComplete(meetingData);
  //   } catch (error) {
  //     console.error("Erro ao criar reunião:", error);
  //     setError(error.message || "Erro ao criar reunião");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use a validação de data/hora se não for início imediato
    if (!formData.startNow) {
      const dateTimeError = validateDateTime();
      if (dateTimeError) {
        setError(dateTimeError);
        return;
      }
    }

    setError("");
    setIsLoading(true);

    try {
      const organizerCode = user._id;
      const createdBy = {
        userId: user?._id || user?.uid || "",
        organizerCode: user?._id || user?.uid || "",
        name: user?.name || "",
        email: user?.email || "",
        googleId: user?.googleId || "",
      };

      // Use a função getHoraTermino para definir o campo horaTermino
      const meetingData = {
        name: formData.name,
        description: formData.description,
        organizerCode,
        voteType: formData.isAnonymous ? "anonymous" : "identified",
        agendamento: formData.startNow,
        horaTermino: getHoraTermino(),
        createdBy,
        participants: [],
        questions: [],
      };

      await apiFetch("/meetings", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(meetingData),
        headers: {
          "Content-Type": "application/json",
        },
      });
      onComplete(meetingData);
    } catch (error) {
      setError(error.message || "Erro ao criar reunião");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-meeting-container">
      <div className="create-meeting-header">
        <h2>Nova Reunião</h2>
      </div>

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

        {/* Campos de Agendamento - Simplificados */}
        <div className="form-section">
          <h3>Agendamento</h3>

          <div className="form-group checkbox-group">
            <label
              htmlFor="startNow"
              className="checkbox-label start-now-option"
            >
              <input
                type="checkbox"
                id="startNow"
                name="startNow"
                checked={formData.startNow}
                onChange={handleChange}
              />
              <span className="checkbox-icon">
                <FaClock />
              </span>
              <span className="checkbox-text">Iniciar imediatamente</span>
            </label>
            <p className="option-description">
              A reunião começará assim que for criada
            </p>
          </div>

          {!formData.startNow && (
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
          )}

          <div className="form-group checkbox-group">
            <label htmlFor="hasEndTime" className="checkbox-label">
              <input
                type="checkbox"
                id="hasEndTime"
                name="hasEndTime"
                checked={formData.hasEndTime}
                onChange={handleChange}
              />
              <span className="checkbox-text">Definir hora de término</span>
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
        </div>

        {/* Configuração Anônima - Simplificada */}
        <div className="form-section">
          <h3>Configurações</h3>

          <div className="form-group checkbox-group">
            <label htmlFor="isAnonymous" className="checkbox-label">
              <input
                type="checkbox"
                id="isAnonymous"
                name="isAnonymous"
                checked={formData.isAnonymous}
                onChange={handleChange}
              />
              <span className="checkbox-icon">
                <FaUserSecret />
              </span>
              <span className="checkbox-text">Votação anônima</span>
            </label>
            <p className="option-description">
              Os participantes não poderão ver quem votou em cada opção
            </p>
          </div>
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