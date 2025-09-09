import { Schema, model } from 'mongoose'

// Schema para alternativas de perguntas
const choiceSchema = new Schema({
    text: String,
    votes: { type: Number, default: 0 },
    voters: [{ type: Schema.Types.ObjectId, ref: 'Participant' }]
});

// Schema para perguntas da reunião
const questionSchema = new Schema({
    question: String,
    choices: [choiceSchema]
});

// Schema para participantes da reunião
const participantSchema = new Schema({
    name: String,
    email: String,
    googleId: String
});

// Schema principal da reunião
const MeetingSchema = new Schema({
    _id: Number,
    name: String,
    description: String,
    organizerCode: { // Código de acesso do organizador (não é identificação)
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        unique: false
    },
    qrCode: { // QR Code único da reunião (gerado automaticamente)
        type: String,
        required: false
    },
    voteType: {
        type: String,
        enum: ['identified', 'anonymous'],
        default: 'anonymous'
    },
    
    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed'],
        default: 'scheduled'
    },
    agendamento: {
        type: Boolean,
        default: true
    },
    horaTermino: {
        type: Date
    },
    createdBy: { // Referência ao usuário organizador
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String,
        googleId: String
    },
    participants: [participantSchema],
    questions: [questionSchema],
    startDate: { type: String },
    startTime: { type: String }
}, { timestamps: true });

export default model('Meeting', MeetingSchema);