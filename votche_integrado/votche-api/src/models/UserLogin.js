import { Schema, model } from 'mongoose'

const userSchema = new Schema({
    googleId: { type: String, required: true, unique: true },
    displayName: String,
    email: String,
    photo: String,
    role: {
        type: String,
        enum: ['organizador', 'votante_anonimo', 'votante_nao_anonimo'],
        required: true,
        default: 'organizador'
    },
});

export default model('User', userSchema);
