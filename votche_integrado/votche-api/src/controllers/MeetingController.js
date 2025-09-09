import Meeting from '../models/Meeting.js';
import Counter from '../models/CounterSchema.js';
import QRCode from 'qrcode';
import { io } from '../server.js'; // Importar a instância do Socket.IO

// Function to get the next sequential ID
async function getNextSequenceValue(sequenceName) {
    const counter = await Counter.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
    );
    return counter.sequence_value;
}


// Função para gerar PIN de acesso
function generateAccessPin() {
    const pinLength = 6;
    let pin = '';

    for (let i = 0; i < pinLength; i++) {
        pin += Math.floor(Math.random() * 10);
    }

    return pin;
}

// Função para gerar QR Code único para a reunião
async function generateMeetingQRCode(meetingId, accessPin) {
    try {
        // URL que será codificada no QR Code - pode ser customizada conforme necessário
        const meetingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${accessPin}`;

        // Gera o QR Code como string base64
        const qrCodeDataURL = await QRCode.toDataURL(meetingUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return qrCodeDataURL;
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        throw new Error('Falha na geração do QR Code');
    }
}

class MeetingController {
    // Cria uma nova reunião no banco de dados
    async createMeeting(req, res) {
        const {
            name,
            description,
            participants,
            questions,
            voteType,
            agendamento,      // <-- novo campo
            horaTermino,      // <-- novo campo
            startDate,
            startTime
        } = req.body;

        try {
            // Verificação adicional de segurança - garantir que o usuário é organizador
            if (!req.user || req.user.role !== 'organizador') {
                return res.status(403).json({
                    error: 'Acesso negado. Apenas organizadores podem criar reuniões.',
                    userRole: req.user?.role || 'não autenticado'
                });
            }

            const meetingId = await getNextSequenceValue('meetingId');
            const organizerCode = req.user._id;
            const accessPin = generateAccessPin();

            // Validação básica em vez de usar o arquivo de validação externo
            if (!name) {
                return res.status(400).json({ error: 'Nome da reunião é obrigatório' });
            }

            // Validação do tipo de votação
            if (voteType && !['identified', 'anonymous'].includes(voteType)) {
                return res.status(400).json({ error: 'Tipo de votação deve ser "identified" ou "anonymous"' });
            }

            // Gera o QR Code único para a reunião
            const qrCode = await generateMeetingQRCode(meetingId, accessPin);

            const meeting = await Meeting.create({
                _id: meetingId,
                name,
                description,
                organizerCode,
                accessPin,
                qrCode,
                status: (typeof agendamento === 'boolean' ? agendamento : true) ? 'active' : 'scheduled',
                voteType: voteType || 'anonymous', // Default para anônima
                participants: participants || [],
                questions: questions || [],
                // Novos campos de agendamento
                agendamento: typeof agendamento === 'boolean' ? agendamento : true,
                horaTermino: horaTermino || null,
                startDate: startDate || '',
                startTime: startTime || '',
                // Adicionar informações do organizador que criou a reunião
                createdBy: {
                    userId: req.user._id,
                    name: req.user.displayName,
                    email: req.user.email,
                    googleId: req.user.googleId,
                    photo: req.user.photo || req.user.photoURL
                }
            });

            return res.status(201).json({
                meeting,
                organizerCode,
                accessPin,
                qrCode,
                message: 'Reunião criada com sucesso pelo organizador'
            });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao criar reunião.', details: err.message });
        }
    }
    // Acesso do organizador à reunião
    async accessMeetingAsOrganizer(req, res) {
        const organizerCode = req.user._id;

        try {
            const meeting = await Meeting.findOne({ organizerCode });

            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada ou código inválido' });
            }

            return res.json({
                meeting,
                isOrganizer: true
            });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao acessar reunião.', details: err.message });
        }
    }

    // Participante entra na reunião com o PIN
    async joinMeeting(req, res) {
        const { accessPin } = req.params;
        const { participantName } = req.body;

        try {
            const meeting = await Meeting.findOne({ accessPin });

            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada ou PIN inválido' });
            }

            // Se a votação for identificada, verificar se o usuário está autenticado
            if (meeting.voteType === 'identified') {
                if (!req.user) {
                    return res.status(401).json({
                        error: 'Autenticação necessária para votações identificadas',
                        requiresAuth: true,
                        meeting: {
                            _id: meeting._id,
                            name: meeting.name,
                            voteType: meeting.voteType
                        }
                    });
                }

                // Verificar se o usuário já está na reunião
                const existingParticipant = meeting.participants.find(p =>
                    p.googleId === req.user.googleId
                );

                if (existingParticipant) {
                    return res.json({
                        meeting,
                        participant: existingParticipant,
                        isAuthenticated: true
                    });
                }

                // Adicionar participante autenticado
                const newParticipant = {
                    name: req.user.displayName,
                    email: req.user.email,
                    googleId: req.user.googleId,
                    photo: req.user.photo || req.user.photoURL

                };
                meeting.participants.push(newParticipant);
                await meeting.save();

                io.to(meeting._id.toString()).emit('participantCountUpdate', meeting.participants.length);

                return res.json({
                    meeting,
                    participant: meeting.participants[meeting.participants.length - 1],
                    isAuthenticated: true
                });
            } else {
                // Votação anônima - não requer autenticação
                const newParticipant = { name: participantName || 'Participante Anônimo' };
                meeting.participants.push(newParticipant);
                await meeting.save();

                io.to(meeting._id.toString()).emit('participantCountUpdate', meeting.participants.length);

                return res.json({
                    meeting,
                    participant: meeting.participants[meeting.participants.length - 1],
                    isAuthenticated: false
                });
            }
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao entrar na reunião.', details: err.message });
        }
    }

    // Novo endpoint: Acesso via QR Code (funciona igual ao joinMeeting mas com semântica diferente)
    async joinMeetingByQRCode(req, res) {
        const { accessPin } = req.params;
        const { participantName } = req.body;

        try {
            const meeting = await Meeting.findOne({ accessPin });

            if (!meeting) {
                return res.status(404).json({
                    error: 'Reunião não encontrada. Verifique se o QR Code é válido.',
                    qrCodeError: true
                });
            }

            // Log para auditoria de acesso via QR Code
            console.log(`Acesso via QR Code - Reunião: ${meeting.name} (ID: ${meeting._id})`);

            // Se a votação for identificada, verificar se o usuário está autenticado
            if (meeting.voteType === 'identified') {
                if (!req.user) {
                    return res.status(401).json({
                        error: 'Autenticação necessária para votações identificadas',
                        requiresAuth: true,
                        qrCodeAccess: true,
                        meeting: {
                            _id: meeting._id,
                            name: meeting.name,
                            voteType: meeting.voteType,
                            accessPin: meeting.accessPin
                        }
                    });
                }

                // Verificar se o usuário já está na reunião
                const existingParticipant = meeting.participants.find(p =>
                    p.googleId === req.user.googleId
                );

                if (existingParticipant) {
                    return res.json({
                        meeting,
                        participant: existingParticipant,
                        isAuthenticated: true,
                        accessMethod: 'qrcode'
                    });
                }

                // Adicionar participante autenticado
                const newParticipant = {
                    name: req.user.displayName,
                    email: req.user.email,
                    googleId: req.user.googleId
                };
                meeting.participants.push(newParticipant);
                await meeting.save();

                io.to(meeting._id.toString()).emit('participantCountUpdate', meeting.participants.length);

                return res.json({
                    meeting,
                    participant: meeting.participants[meeting.participants.length - 1],
                    isAuthenticated: true,
                    accessMethod: 'qrcode'
                });
            } else {
                // Votação anônima - não requer autenticação
                const newParticipant = {
                    name: participantName || 'Participante Anônimo (QR Code)'
                };
                meeting.participants.push(newParticipant);
                await meeting.save();

                io.to(meeting._id.toString()).emit('participantCountUpdate', meeting.participants.length);

                return res.json({
                    meeting,
                    participant: meeting.participants[meeting.participants.length - 1],
                    isAuthenticated: false,
                    accessMethod: 'qrcode'
                });
            }
        } catch (err) {
            return res.status(500).json({
                error: 'Erro ao acessar reunião via QR Code.',
                details: err.message
            });
        }
    }

    // List participant by id
    async participant(req, res) {
        const { participantId } = req.params;
        try {
            const meeting = await Meeting.findOne({ 'participants._id': participantId });
            if (!meeting) {
                return res.status(404).json({ error: 'Participant not found' });
            }
            const participant = meeting.participants.id(participantId);
            if (!participant) {
                return res.status(404).json({ error: 'Participant not found in the meeting' });
            }
            return res.json({
                participant,
                meetingId: meeting._id,
                meetingName: meeting.name
            });
        } catch (error) {
            return res.status(500).json({ error: 'Server error', details: error.message });
        }
    }

    // Adicionar uma nova pergunta com alternativas à reunião especificada
    async addQuestion(req, res) {
        const { meetingId } = req.params;
        const { question, choices } = req.body;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });

            // Adiciona a nova pergunta com as alternativas
            meeting.questions.push({
                question,
                choices: choices.map(text => ({ text })),
            });

            // Salva a atualização no banco
            await meeting.save();
            return res.status(201).json(meeting.questions.at(-1));
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao adicionar pergunta.', details: err.message });
        }
    }

    // List Details of a Question
    async listQuestion(req, res) {
        const { questionId } = req.params;
        try {
            const meeting = await Meeting.findOne({ 'questions._id': questionId });
            if (!meeting) {
                return res.status(404).json({ error: 'Question not found' });
            }
            const question = meeting.questions.id(questionId);
            if (!question) {
                return res.status(404).json({ error: 'Question not found in the meeting' });
            }
            return res.json({
                question,
                meetingId: meeting._id,
                meetingName: meeting.name
            });
        } catch (error) {
            return res.status(500).json({ error: 'Server error', details: error.message });
        }
    }

    // Registra um voto em uma das escolhas de uma pergunta existente na reunião
    async vote(req, res) {
        const { participantId, meetingId, questionId, choiceIndex } = req.body;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });

            // Verifica se o participante está registrado na reunião
            const participant = meeting.participants.id(participantId);
            if (!participant) return res.status(404).json({ error: 'Participante não autorizado' });

            // Se a votação for identificada, verificar autenticação
            if (meeting.voteType === 'identified') {
                if (!req.user) {
                    return res.status(401).json({ error: 'Autenticação necessária para votações identificadas' });
                }

                // Verificar se o participante autenticado corresponde ao usuário logado
                if (participant.googleId !== req.user.googleId) {
                    return res.status(403).json({ error: 'Participante não corresponde ao usuário autenticado' });
                }
            }

            const question = meeting.questions.id(questionId);
            if (!question || !question.choices[choiceIndex]) {
                return res.status(400).json({ error: 'Pergunta ou escolha inválida' });
            }

            // Se a votação for identificada, verifica se o participante já votou nesta pergunta
            if (meeting.voteType === 'identified') {
                // Verifica se o participante já votou em alguma escolha desta pergunta
                const hasVoted = question.choices.some(choice =>
                    choice.voters.includes(participantId)
                );

                if (hasVoted) {
                    return res.status(400).json({ error: 'Participante já votou nesta pergunta' });
                }

                // Adiciona o participante à lista de votantes da escolha selecionada
                question.choices[choiceIndex].voters.push(participantId);
            }

            // Incrementa o contador de votos da escolha selecionada
            question.choices[choiceIndex].votes += 1;
            await meeting.save();
            return res.json({
                question,
                message: 'Voto registrado com sucesso',
                isAuthenticated: meeting.voteType === 'identified'
            });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao registrar voto.', details: err.message });
        }
    }

    // Endpoint para sair da reunião
    async leaveMeeting(req, res) {
        const { accessPin } = req.params;
        const { participantId } = req.body; // Pode ser o _id do participante ou googleId

        try {
            const meeting = await Meeting.findOne({ accessPin });

            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada ou PIN inválido' });
            }

            let participantRemoved = false;
            if (meeting.voteType === 'identified' && req.user) {
                // Para votação identificada, remover pelo googleId do usuário logado
                const initialLength = meeting.participants.length;
                meeting.participants = meeting.participants.filter(p => p.googleId !== req.user.googleId);
                if (meeting.participants.length < initialLength) {
                    participantRemoved = true;
                }
            } else {
                // Para votação anônima ou se não houver usuário logado, remover pelo _id do participante
                const initialLength = meeting.participants.length;
                meeting.participants = meeting.participants.filter(p => p._id.toString() !== participantId);
                if (meeting.participants.length < initialLength) {
                    participantRemoved = true;
                }
            }

            if (participantRemoved) {
                await meeting.save();
                io.to(meeting._id.toString()).emit('participantCountUpdate', meeting.participants.length);
                return res.json({ message: 'Saiu da reunião com sucesso.' });
            } else {
                return res.status(404).json({ error: 'Participante não encontrado na reunião.' });
            }

        } catch (err) {
            return res.status(500).json({ error: 'Erro ao sair da reunião.', details: err.message });
        }
    }

    // Listar todas as reuniões (apenas para organizadores)
    async listMeetings(req, res) {
        try {
            if (!req.user || req.user.role !== 'organizador') {
                return res.status(403).json({ error: 'Acesso negado. Apenas organizadores podem listar reuniões.' });
            }
            const meetings = await Meeting.find({ organizerCode: req.user._id });
            return res.json(meetings);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao listar reuniões.', details: err.message });
        }
    }

    // Obter detalhes de uma reunião específica
    async getMeetingDetails(req, res) {
        const { meetingId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }
            // Verificar se o usuário logado é o organizador desta reunião
            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }
            return res.json(meeting);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao obter detalhes da reunião.', details: err.message });
        }
    }

    // Atualizar uma reunião
    async updateMeeting(req, res) {
        const { meetingId } = req.params;
        const { name, description, status, voteType } = req.body;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }
            // Verificar se o usuário logado é o organizador desta reunião
            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }

            if (name) meeting.name = name;
            if (description) meeting.description = description;
            if (status) meeting.status = status;
            if (voteType) meeting.voteType = voteType;

            await meeting.save();
            return res.json(meeting);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao atualizar reunião.', details: err.message });
        }
    }

    // Excluir uma reunião
    async deleteMeeting(req, res) {
        const { meetingId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }
            // Verificar se o usuário logado é o organizador desta reunião
            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }

            await Meeting.deleteOne({ _id: meetingId });
            return res.status(204).send(); // No Content
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao excluir reunião.', details: err.message });
        }
    }

    // Obter resultados da votação para uma reunião específica
    async getVotingResults(req, res) {
        const { meetingId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }
            // Verificar se o usuário logado é o organizador desta reunião
            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }

            const results = meeting.questions.map(question => ({
                question: question.question,
                choices: question.choices.map(choice => ({
                    text: choice.text,
                    votes: choice.votes,
                    voters: meeting.voteType === 'identified' ? choice.voters.map(voterId => {
                        const participant = meeting.participants.id(voterId);
                        return participant ? { name: participant.name, email: participant.email } : null;
                    }).filter(p => p !== null) : []
                }))
            }));

            return res.json(results);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao obter resultados da votação.', details: err.message });
        }
    }

    // Obter o número de participantes de uma reunião
    async getParticipantCount(req, res) {
        const { meetingId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }
            // Verificar se o usuário logado é o organizador desta reunião
            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }
            return res.json({ participantCount: meeting.participants.length });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao obter contagem de participantes.', details: err.message });
        }
    }

    // Adicionar um participante a uma reunião (apenas para organizadores)
    async addParticipant(req, res) {
        const { meetingId } = req.params;
        const { name, email, googleId } = req.body;

        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }

            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }

            // Prevenir duplicatas para participantes identificados
            if (meeting.voteType === 'identified' && googleId) {
                const existingParticipant = meeting.participants.find(p => p.googleId === googleId);
                if (existingParticipant) {
                    return res.status(409).json({ error: 'Participante já adicionado à reunião.' });
                }
            }

            const newParticipant = { name, email, googleId };
            meeting.participants.push(newParticipant);
            await meeting.save();

            io.to(meeting._id.toString()).emit('participantCountUpdate', meeting.participants.length);

            return res.status(201).json(newParticipant);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao adicionar participante.', details: err.message });
        }
    }

    // Remover um participante de uma reunião (apenas para organizadores)
    async removeParticipant(req, res) {
        const { meetingId, participantId } = req.params;

        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }

            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }

            const initialLength = meeting.participants.length;
            meeting.participants = meeting.participants.filter(p => p._id.toString() !== participantId);

            if (meeting.participants.length < initialLength) {
                await meeting.save();
                io.to(meeting._id.toString()).emit('participantCountUpdate', meeting.participants.length);
                return res.status(200).json({ message: 'Participante removido com sucesso.' });
            } else {
                return res.status(404).json({ error: 'Participante não encontrado na reunião.' });
            }
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao remover participante.', details: err.message });
        }
    }

    // Iniciar votação
    async startVoting(req, res) {
        const { meetingId, questionId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });

            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }

            const question = meeting.questions.id(questionId);
            if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

            question.status = 'active';
            await meeting.save();

            io.to(meeting._id.toString()).emit('votingStatusUpdate', { questionId, status: 'active' });

            return res.json({ message: 'Votação iniciada com sucesso', question });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao iniciar votação.', details: err.message });
        }
    }

    // Encerrar votação
    async endVoting(req, res) {
        const { meetingId, questionId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });

            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }

            const question = meeting.questions.id(questionId);
            if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

            question.status = 'inactive';

            // Se todas as perguntas estiverem inativas, marcar a reunião como completed
            const allInactive = meeting.questions.every(q => q.status === 'inactive');
            if (allInactive) {
                meeting.status = 'completed';
            }

            await meeting.save();

            io.to(meeting._id.toString()).emit('votingStatusUpdate', { questionId, status: 'inactive' });

            return res.json({ message: 'Votação encerrada com sucesso', question });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao encerrar votação.', details: err.message });
        }
    }

    // Obter status da votação
    async getVotingStatus(req, res) {
        const { meetingId, questionId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });

            const question = meeting.questions.id(questionId);
            if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

            return res.json({ status: question.status });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao obter status da votação.', details: err.message });
        }
    }

    // Obter resultados parciais da votação
    async getPartialResults(req, res) {
        const { meetingId, questionId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });

            const question = meeting.questions.id(questionId);
            if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

            const partialResults = question.choices.map(choice => ({
                text: choice.text,
                votes: choice.votes
            }));

            return res.json(partialResults);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao obter resultados parciais.', details: err.message });
        }
    }

    // Adicionar um socketId a um participante
    async addSocketIdToParticipant(req, res) {
        const { meetingId, participantId } = req.params;
        const { socketId } = req.body;

        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }

            const participant = meeting.participants.id(participantId);
            if (!participant) {
                return res.status(404).json({ error: 'Participante não encontrado' });
            }

            participant.socketId = socketId;
            await meeting.save();

            return res.json({ message: 'SocketId adicionado ao participante com sucesso.' });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao adicionar socketId ao participante.', details: err.message });
        }
    }

    // Remover socketId de um participante
    async removeSocketIdFromParticipant(req, res) {
        const { meetingId, participantId } = req.params;

        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }

            const participant = meeting.participants.id(participantId);
            if (!participant) {
                return res.status(404).json({ error: 'Participante não encontrado' });
            }

            participant.socketId = undefined; // Remove o socketId
            await meeting.save();

            return res.json({ message: 'SocketId removido do participante com sucesso.' });
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao remover socketId do participante.', details: err.message });
        }
    }

    // Obter todos os participantes de uma reunião
    async getAllParticipants(req, res) {
        const { meetingId } = req.params;
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ error: 'Reunião não encontrada' });
            }
            // Verificar se o usuário logado é o organizador desta reunião
            if (!req.user || meeting.organizerCode.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Acesso negado. Você não é o organizador desta reunião.' });
            }
            return res.json(meeting.participants);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao obter participantes.', details: err.message });
        }
    }

}

export default new MeetingController();


