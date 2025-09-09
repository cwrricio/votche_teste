import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Meeting from './models/Meeting.js';

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Permitir todas as origens para desenvolvimento
        methods: ["GET", "POST"]
    }
});

// Mapa para rastrear participantes conectados por reunião
const connectedParticipants = new Map();

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    // Evento para entrar em uma reunião
    socket.on('joinMeeting', async (data) => {
        const { meetingId, participantId, isOrganizer } = data;
        
        try {
            // Verificar se a reunião existe
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                socket.emit('error', { message: 'Reunião não encontrada' });
                return;
            }

            // Entrar na sala da reunião
            socket.join(meetingId);
            
            // Rastrear participante conectado
            if (!connectedParticipants.has(meetingId)) {
                connectedParticipants.set(meetingId, new Set());
            }
            
            const roomParticipants = connectedParticipants.get(meetingId);
            roomParticipants.add(socket.id);
            
            // Emitir contagem atualizada para todos na sala
            io.to(meetingId).emit('participantCountUpdate', {
                count: meeting.participants.length,
                connectedCount: roomParticipants.size
            });

            console.log(`Participante ${participantId} entrou na reunião ${meetingId}`);
            
        } catch (error) {
            console.error('Erro ao entrar na reunião:', error);
            socket.emit('error', { message: 'Erro interno do servidor' });
        }
    });

    // Evento para sair de uma reunião
    socket.on('leaveMeeting', (data) => {
        const { meetingId } = data;
        
        socket.leave(meetingId);
        
        // Remover participante do rastreamento
        if (connectedParticipants.has(meetingId)) {
            const roomParticipants = connectedParticipants.get(meetingId);
            roomParticipants.delete(socket.id);
            
            // Emitir contagem atualizada
            io.to(meetingId).emit('connectedCountUpdate', roomParticipants.size);
        }
        
        console.log(`Participante saiu da reunião ${meetingId}`);
    });

    // Evento para atualizar status de votação
    socket.on('updateVotingStatus', (data) => {
        const { meetingId, questionId, status } = data;
        io.to(meetingId).emit('votingStatusUpdate', { questionId, status });
    });

    // Evento para atualizar resultados de votação em tempo real
    socket.on('updateVotingResults', (data) => {
        const { meetingId, questionId, results } = data;
        io.to(meetingId).emit('votingResultsUpdate', { questionId, results });
    });

    // Evento de desconexão
    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
        
        // Remover participante de todas as reuniões
        for (const [meetingId, participants] of connectedParticipants.entries()) {
            if (participants.has(socket.id)) {
                participants.delete(socket.id);
                io.to(meetingId).emit('connectedCountUpdate', participants.size);
                
                // Limpar reuniões vazias
                if (participants.size === 0) {
                    connectedParticipants.delete(meetingId);
                }
            }
        }
    });
});

httpServer.listen(3001, () => {
    console.log('Server running on port 3001');
});

export { io };

