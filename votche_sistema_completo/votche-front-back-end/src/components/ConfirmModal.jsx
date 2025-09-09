import React from "react";
import "../styles/ConfirmModal.css";
import { FaExclamationTriangle } from "react-icons/fa";

export default function ConfirmModal({
  open,
  title = "Confirmação",
  message = "Tem certeza?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  // Prevenir propagação de clique
  const handleCardClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="confirm-card" onClick={handleCardClick}>
        <header className="confirm-header">
          <h3>
            <FaExclamationTriangle
              style={{ marginRight: "8px", color: "#e74c3c" }}
            />
            {title}
          </h3>
        </header>

        <div className="confirm-body">
          <p>{message}</p>
        </div>

        <footer className="confirm-footer">
          <button
            className="btn btn-cancel"
            onClick={onCancel}
            disabled={loading}
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
            aria-label={confirmLabel}
          >
            {loading ? "Processando..." : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
