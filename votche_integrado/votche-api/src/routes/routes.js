import { Router } from 'express'
// import multer from 'multer'
import MeetingController from '../controllers/MeetingController.js';
import AuthController from '../controllers/AuthController.js';
import { isAuthenticated, isOrganizer } from '../middleware/auth.js';

const routes = new Router()

// Rotas de autenticação Google OAuth2 (devem vir primeiro)
routes.get("/auth/google", AuthController.googleAuth);
routes.get("/auth/google/callback", AuthController.googleAuthCallback);
routes.get("/auth/logout", AuthController.logout);
routes.get("/auth/current_user", AuthController.currentUser);

// Rotas protegidas de reuniões (requerem autenticação)
routes.post('/meetings/organizer', isOrganizer, MeetingController.accessMeetingAsOrganizer);
// Rota de acesso via PIN removida. Agora apenas QRCode.
routes.post('/meetings/qrcode/:accessPin', MeetingController.joinMeetingByQRCode); // Nova rota para acesso via QR Code
routes.post('/meetings', isOrganizer, MeetingController.createMeeting);
routes.post('/meetings/:meetingId/questions', MeetingController.addQuestion); // Participantes podem não estar autenticados
routes.post('/meetings/vote', MeetingController.vote); // Participantes podem não estar autenticados

// Novas rotas para contagem de participantes
routes.get('/meetings/:meetingId/participants/count', isOrganizer, MeetingController.getParticipantCount);
routes.get('/meetings/:meetingId/participants', isOrganizer, MeetingController.getAllParticipants);
routes.post('/meetings/:meetingId/participants', isOrganizer, MeetingController.addParticipant);
routes.delete('/meetings/:meetingId/participants/:participantId', isOrganizer, MeetingController.removeParticipant);
routes.post('/meetings/:accessPin/leave', MeetingController.leaveMeeting);

// Rotas para gerenciamento de votação
routes.post('/meetings/:meetingId/questions/:questionId/start', isOrganizer, MeetingController.startVoting);
routes.post('/meetings/:meetingId/questions/:questionId/end', isOrganizer, MeetingController.endVoting);
routes.get('/meetings/:meetingId/questions/:questionId/status', MeetingController.getVotingStatus);
routes.get('/meetings/:meetingId/questions/:questionId/results', MeetingController.getPartialResults);

// Rotas para gerenciamento de socket
routes.post('/meetings/:meetingId/participants/:participantId/socket', MeetingController.addSocketIdToParticipant);
routes.delete('/meetings/:meetingId/participants/:participantId/socket', MeetingController.removeSocketIdFromParticipant);

routes.get('/meetings', isOrganizer, MeetingController.listMeetings)
routes.get('/meetings/:meetingId', isOrganizer, MeetingController.getMeetingDetails) // Apenas organizadores
routes.get('/meetings/questions/:questionId', MeetingController.listQuestion);
routes.get('/meetings/participants/:participantId', MeetingController.participant);
routes.get('/meetings/:meetingId/results', isOrganizer, MeetingController.getVotingResults);

routes.patch('/meetings/:meetingId', isOrganizer, MeetingController.updateMeeting)
routes.delete('/meetings/:meetingId', isOrganizer, MeetingController.deleteMeeting)

export default routes

