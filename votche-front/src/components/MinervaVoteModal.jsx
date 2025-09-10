import React, { useState } from "react";
import { FaUserTie, FaTimes } from "react-icons/fa";
import "../styles/MinervaVoteModal.css";

const MinervaVoteModal = ({ isOpen, onClose, options, onConfirm }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedOption) {
      onConfirm(selectedOption);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="minerva-modal">
        <div className="minerva-modal-header">
          <div className="minerva-modal-title">
            <FaUserTie className="minerva-icon" />
            <h3>Voto de Minerva</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="minerva-modal-content">
          <p className="minerva-modal-description">
            Como organizador da reunião, você pode desempatar esta votação
            selecionando uma das opções abaixo.
          </p>
          <p className="minerva-modal-warning">
            Esta ação é definitiva e será registrada no relatório final.
          </p>

          <div className="minerva-options-list">
            <h4>Selecione uma opção:</h4>
            {options.map((option) => (
              <div
                key={option}
                className={`minerva-option-item ${
                  selectedOption === option ? "selected" : ""
                }`}
                onClick={() => setSelectedOption(option)}
              >
                <div className="option-selector">
                  <div className="option-radio">
                    <div
                      className={`radio-inner ${
                        selectedOption === option ? "checked" : ""
                      }`}
                    ></div>
                  </div>
                  <span>{option}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="minerva-modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedOption}
          >
            Confirmar voto
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinervaVoteModal;
