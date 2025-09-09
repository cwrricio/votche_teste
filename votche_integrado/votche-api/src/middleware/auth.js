// Middleware para verificar se o usuário está autenticado
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Usuário não autenticado' });
};

// Middleware para verificar se o usuário é organizador
export const isOrganizer = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    if (req.user.role !== 'organizador') {
        return res.status(403).json({ 
            message: 'Acesso negado. Apenas organizadores podem realizar esta ação.',
            userRole: req.user.role,
            requiredRole: 'organizador'
        });
    }
    
    return next();
};

// Middleware para verificar se o usuário não está autenticado (para rotas de login)
export const isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect(process.env.FRONTEND_URL + '/dashboard');
};

