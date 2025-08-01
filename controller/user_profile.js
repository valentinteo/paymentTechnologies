const mysql = require('mysql2');



// // Connect to SQL database
// const db = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '', // Replace with your database password
//     database: 'c372_booklink', // Replace with your database name
//     port: 3307
// });


const db = mysql.createConnection({
  host: 'db4free.net',
  user: 'valentin',
  password: 'v1SK?947368/[9',
  database: 'c372_booklink',
  port: 3306
});



exports.updateProfile = (req, res) => {
    const { username, email, password, address } = req.body; // Include address
    const userId = req.session.user.id;

    // Corrected SQL query with a comma between fields
    const query = `
      UPDATE users 
      SET username = ?, 
          userEmail = ?, 
          userPassword = SHA(?), 
          userAddress = ? 
      WHERE userId = ?`;

    db.query(query, [username, email, password, address, userId], (err) => {
        if (err) {
            console.error('Database update error:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Update session data
        req.session.user.username = username;
        req.session.user.userAddress = address;

        res.redirect('/user_profile');
    });
};






exports.updateProfilePicture = (req, res) => {
    const userId = req.session.user.id; // Assuming user ID is stored in the session
    const newImage = req.file.filename; // Uploaded file name from Multer

    // Update query
    const query = 'UPDATE users SET userImage = ? WHERE userId = ?';

    db.query(query, [newImage, userId], (err) => {
        if (err) {
            console.error('Error updating profile picture:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/user_profile'); // Redirect back to profile page
    });
};

exports.renderProfile = (req, res) => {
    const searchQuery = req.query.q || ''; // Default to an empty string if not provided
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if not logged in
    }

    db.query(
        'SELECT * FROM users WHERE userId = ?',
        [req.session.user.id],
        (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).send('Internal Server Error');
            }

            if (results.length > 0) {
                res.render('user_profile', {
                    user: results[0], 
                    errorMessage: null,
                    searchQuery
                });
            } else {
                res.redirect('/login');
            }
        }
    );
};