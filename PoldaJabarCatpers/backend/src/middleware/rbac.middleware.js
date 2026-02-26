const rbacMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Akses ditolak. Silahkan login kembali.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Akses tidak diizinkan untuk peran ini.' });
        }

        next();
    };
};

module.exports = rbacMiddleware;
