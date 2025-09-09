import express from "express";
import routes from './routes/routes.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import passport from 'passport';
import session from 'express-session';
import '../src/config/passport.js';
import cors from 'cors';

class App {

    constructor() {

        this.server = express();
        this.connectDatabase(); // Calls the function to connect to the database
        this.middlewares(); // Configure the middleware
        this.routes(); // Configure the routes

    }

    connectDatabase() {
        const { MONGO_USER, MONGO_PASSWORD, MONGO_HOST, MONGO_DB, MONGO_OPTIONS } = process.env;

        // Se não há usuário/senha, usa conexão local simples
        const uri = MONGO_USER && MONGO_PASSWORD
            ? `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}/${MONGO_DB}?${MONGO_OPTIONS}`
            : `mongodb://${MONGO_HOST}/${MONGO_DB}`;

        mongoose.connect(uri)
            .then(() => {
                console.log('Connected to MongoDB');
            })
            .catch(err => {
                console.error('Connection error', err);
                setTimeout(() => this.connectDatabase(), 5000);
            });
    }

    middlewares() {
        // Permite apenas o front-end acessar a API e envia cookies/autenticação
        this.server.use(cors({
            origin: 'http://localhost:5173',
            credentials: true,
        }));
        this.server.use(express.json());  // requests with JSON body
        this.server.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: true
        }));
        this.server.use(passport.initialize());
        this.server.use(passport.session());

    }


    // Application routes
    routes() {
        this.server.use(routes);
    }

}
export default new App().server;


