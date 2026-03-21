const rbacMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.warn(`[RBAC_WARN] No user object in request for path: ${req.originalUrl}`);
            return res.status(401).json({ message: 'Akses ditolak. Silahkan login kembali.' });
        }

        const userRole = (req.user.role || '').trim().toUpperCase();
        const isAllowed = allowedRoles.some(role => role.trim().toUpperCase() === userRole);

        if (!isAllowed) {
            console.warn(`[RBAC_DENIED] Path: ${req.originalUrl} | User: ${req.user.email} | Role: ${userRole} | Allowed: ${allowedRoles.join(',')}`);
            return res.status(403).json({ message: 'Akses tidak diizinkan untuk peran ini.' });
        }

        console.log(`[RBAC_GRANTED] Path: ${req.originalUrl} | User: ${req.user.email} | Role: ${userRole}`);
        next();
    };
};

module.exports = rbacMiddleware;
