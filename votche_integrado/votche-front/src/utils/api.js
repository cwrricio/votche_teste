// Centraliza as chamadas à API do back-end
// Altere a URL base conforme necessário

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });
    if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
    }
    return response.json();
}
// Busca reuniões arquivadas do usuário
export async function getUserArchivedMeetings(userId) {
    return apiFetch(`/meetings/archived?userId=${userId}`);
}

// Desarquiva uma reunião pelo ID
export async function unarchiveMeeting(meetingId) {
    return apiFetch(`/meetings/unarchive/${meetingId}`, {
        method: 'POST',
    });
}
