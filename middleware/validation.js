// Middleware to validate login input
const validateLogin = (req, res, next) => {
    const { username, password, 'g-recaptcha-response': captchaResponse } = req.body;

    // Check if all required fields are provided
    if (!username || !password || !captchaResponse) {
        req.flash('error', 'All fields are required, including CAPTCHA.');
        return res.redirect('/login');
    }
    // Proceed to the next middleware/controller
    next();
};

const validateRegistration = (req, res, next) => {
    const { username, password, email } = req.body;

    // Validate input fields
    if (!username || !password || !email) {
        return res.status(400).render('signup', { errorMessage: 'All fields are required.' });
    }
    next();

};

module.exports = {
    validateLogin,
    validateRegistration
};