const checkAdmin = (req, res, next) => {
    if (
        req.session &&
        req.session.user &&
        (req.session.user.role === 'admin' || req.session.user.role === 'SuperAdmin')
    ) {
        next(); // Allow access
    } else {
        res.status(403).render('401'); // Unauthorized
    }
};

module.exports = {
    checkAdmin,
};
