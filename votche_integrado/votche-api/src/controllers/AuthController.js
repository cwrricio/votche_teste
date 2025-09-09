import passport from 'passport';

class AuthController {
    googleAuth(req, res, next) {
        passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    }

    googleAuthCallback(req, res, next) {
        passport.authenticate('google', {
            failureRedirect: process.env.FRONTEND_URL + '/login',
            successRedirect: process.env.FRONTEND_URL + '/dashboard'
        })(req, res, next);
    }

    logout(req, res) {
        req.logout((err) => {
            if (err) { 
                console.error('Erro no logout:', err);
                return res.status(500).json({ message: 'Erro ao fazer logout' });
            }
            res.redirect(process.env.FRONTEND_URL);
        });
    }

    currentUser(req, res) {
        if (req.user) {
            res.json(req.user);
        } else {
            res.status(401).json({ message: 'Não autenticado' });
        }
    }
}

export default new AuthController();


