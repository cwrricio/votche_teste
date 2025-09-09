/**
 * Utilitários para manipulação de datas no formato utilizado pelo aplicativo
 */

/**
 * Formata uma data e hora para o formato local brasileiro
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @param {string} timeStr - Hora no formato HH:MM
 * @returns {string} Data formatada
 */
export const formatDate = (dateStr, timeStr) => {
  try {
    const date = new Date(dateStr + "T" + timeStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (e) {
    return `${dateStr} ${timeStr}`;
  }
};

/**
 * Verifica se uma data já passou
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @param {string} timeStr - Hora no formato HH:MM
 * @returns {boolean} true se a data já passou
 */
export const isPastDate = (dateStr, timeStr) => {
  try {
    const date = new Date(dateStr + "T" + timeStr);
    return date < new Date();
  } catch (e) {
    return false;
  }
};

/**
 * Formata uma data completa ISO para o formato local brasileiro
 * @param {string} isoDateString - Data no formato ISO
 * @returns {string} Data formatada
 */
export const formatISODate = (isoDateString) => {
  try {
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (e) {
    return isoDateString;
  }
};
