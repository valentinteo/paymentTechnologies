const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

// Connect to SQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Replace with your database password
    database: 'c372_booklink', // Replace with your database name
    port: 3307
});

exports.addUser = (req, res) => {
    const { username, password, email, address, role } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!username || !password || !email || !address || !role || !image) {
        console.error('Missing fields:', { username, password, email, address, role, image });
        return res.status(400).send('All fields are required.');
    }

    // Check for duplicate username or email
    db.query(
        'SELECT * FROM users WHERE username = ? OR userEmail = ?',
        [username, email],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal Server Error');
            }

            if (results.length > 0) {
                // Check which field is duplicated
                const duplicateField =
                    results[0].username === username ? 'Username' : 'Email';
                return res.status(400).send(`${duplicateField} already exists.`);
            }

            // If no duplicates, proceed with user creation
            db.query(
                'INSERT INTO users (username, userPassword, userEmail, userAddress, userImage, userRole) VALUES (?, ?, ?, ?, ?, ?)',
                [username, password, email, address, image, role],
                (err) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).send('Internal Server Error');
                    }
                    res.redirect('/admin/users');
                }
            );
        }
    );
};


// exports.addUser = (req, res) => {
//     const { username, password, email, address, role, securityQ1, securityQ2, securityQ3 } = req.body;
//     const image = req.file ? req.file.filename : null;

//     if (!username || !password || !email || !address || !role || !image) {
//         console.error('Missing fields:', { username, password, email, address, role, image });
//         return res.status(400).send('All fields are required.');
//     }

//     // // Ensure security questions are provided if the role is admin
//     // if (role === 'admin' && (!securityQ1 || !securityQ2 || !securityQ3)) {
//     //     return res.status(400).send('Admins must set three security questions/words.');
//     // }

//     // Check for duplicate username or email
//     db.query(
//         'SELECT * FROM users WHERE username = ? OR userEmail = ?',
//         [username, email],
//         (err, results) => {
//             if (err) {
//                 console.error('Database error:', err);
//                 return res.status(500).send('Internal Server Error');
//             }

//             if (results.length > 0) {
//                 const duplicateField = results[0].username === username ? 'Username' : 'Email';
//                 return res.status(400).send(`${duplicateField} already exists.`);
//             }

//             // If no duplicates, proceed with user creation
//             const insertQuery = `
//                 INSERT INTO users (username, userPassword, userEmail, userAddress, userImage, userRole) 
//                 VALUES (?, ?, ?, ?, ?, ?)
//             `;

//             const params = role === 'admin'
//                 ? [username, password, email, address, image, role]
//                 : [username, password, email, address, image, role];

//             db.query(insertQuery, params, (err) => {
//                 if (err) {
//                     console.error('Database error:', err);
//                     return res.status(500).send('Internal Server Error');
//                 }
//                 res.redirect('/admin/users');
//             });
//         }
//     );
// };




exports.getAllUsers = (req, res) => {
    const user = req.session.user; // Retrieve user from the session
    // // Check if the user is an admin
    // if (!req.session.user || req.session.user.role !== 'admin') {
    //     return res.status(403).send('Access denied. Admins only.');
    // }

    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Internal Server Error');
        }


        res.render('admin_users', { 
            users: results,
            user,// Pass the session user to the view
            userImage: user.image
        });
    });
};







exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { username, password, email, address, role } = req.body;
    const image = req.file ? req.file.filename : null;

    // Check for duplicate username or email
    const duplicateQuery = 'SELECT * FROM users WHERE (username = ? OR userEmail = ?) AND userId != ?';
    db.query(duplicateQuery, [username, email, id], (err, results) => {
        if (err) {
            console.error('Error checking duplicates:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (results.length > 0) {
            // Determine the field causing the conflict
            const duplicateField = results[0].username === username ? 'Username' : 'Email';
            return res.status(400).send(`${duplicateField} already exists.`);
        }

        // Fetch the current user's image from the database
        db.query('SELECT userImage FROM users WHERE userId = ?', [id], (err, results) => {
            if (err) {
                console.error('Error fetching user data:', err);
                return res.status(500).send('Internal Server Error');
            }

            const currentImage = results[0]?.userImage; // Get current image

            let query = 'UPDATE users SET username = ?, userPassword = ?, userEmail = ?, userAddress = ?, userRole = ? WHERE userId = ?';
            const params = [username, password, email, address, role, id];

            if (image) {
                query = 'UPDATE users SET username = ?, userPassword = ?, userEmail = ?, userAddress = ?, userImage = ?, userRole = ? WHERE userId = ?';
                params.splice(4, 0, image);

                // Delete the old image file if it exists
                if (currentImage) {
                    const oldImagePath = path.join(__dirname, '..', 'uploads', currentImage);
                    fs.unlink(oldImagePath, (unlinkErr) => {
                        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                            console.error('Failed to delete old image:', unlinkErr);
                        }
                    });
                }
            }

            db.query(query, params, (err) => {
                if (err) {
                    console.error('Error updating user:', err);
                    return res.status(500).send('Error updating user');
                }
                res.redirect('/admin_users');
            });
        });
    });
};


// exports.deleteUser = (req, res) => {
//     const { id } = req.params; // Get the user ID from the URL

//     // Ensure the ID is valid
//     if (!id) {
//         return res.status(400).send('User ID is required.');
//     }

//     // Delete the user from the database
//     db.query('DELETE FROM users WHERE userId = ?', [id], (err) => {
//         if (err) {
//             console.error('Database query error:', err);
//             return res.status(500).send('Internal Server Error');
//         }

//         res.redirect('/admin/users'); // Redirect back to the users page
//     });
// };


// exports.deleteUser = (req, res) => {
//     const { id } = req.params; // User ID to be deleted
//     const { role } = req.session.user; // Role of the current logged-in user

//     // Ensure the ID is valid
//     if (!id) {
//         req.flash('error', 'User ID is required.');
//         return res.redirect('/admin/users');
//     }

//     // Fetch the role of the target user
//     db.query('SELECT userRole FROM users WHERE userId = ?', [id], (err, results) => {
//         if (err) {
//             console.error('Database query error:', err);
//             req.flash('error', 'Error checking user role.');
//             return res.redirect('/admin/users');
//         }

//         if (results.length === 0) {
//             req.flash('error', 'User not found.');
//             return res.redirect('/admin/users');
//         }

//         const targetUserRole = results[0].userRole;

//         // Role-based deletion logic
//         if (role === 'SuperAdmin') {
//             // SuperAdmin can delete any user
//             performDeletion(id, req, res);
//         } else if (role === 'admin') {
//             if (targetUserRole === 'user') {
//                 // Admin can delete only users with the role 'user'
//                 performDeletion(id, req, res);
//             } else {
//                 // Admin cannot delete 'admin' or 'SuperAdmin'
//                 req.flash('error', 'Your action is restricted.');
//                 return res.redirect('/admin/users');
//             }
//         } else {
//             // Non-admin roles cannot delete any users
//             req.flash('error', 'Unauthorized action.');
//             return res.redirect('/admin/users');
//         }
//     });
// };

// // Helper function to perform the deletion
// function performDeletion(userId, req, res) {
//     db.query('DELETE FROM users WHERE userId = ?', [userId], (err) => {
//         if (err) {
//             console.error('Database query error:', err);
//             req.flash('error', 'Error deleting user.');
//             return res.redirect('/admin/users');
//         }

//         req.flash('success', 'User deleted successfully.');
//         return res.redirect('/admin/users');
//     });
// }


exports.deleteUser = (req, res) => {
    const { id } = req.params; // Get the user ID to delete
    const currentUser = req.session.user; // Get the current logged-in user from session

    if (!id) {
        req.flash('error', 'User ID is required.');
        return res.redirect('/admin/users');
    }

    // Query to get the role of the user to be deleted
    const getUserRoleQuery = 'SELECT userRole FROM users WHERE userId = ?';
    db.query(getUserRoleQuery, [id], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            req.flash('error', 'Failed to retrieve user details.');
            return res.redirect('/admin/users');
        }

        if (results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        const userToDeleteRole = results[0].userRole;

        // Restrict admin from deleting SuperAdmin or admin
        if (currentUser.role === 'admin' && userToDeleteRole !== 'user') {
            req.flash('error', 'Your action is restricted. Admins can only delete users with the "user" role.');
            return res.redirect('/admin/users');
        }

        // Check for related records in `order_items`
        const checkQuery = 'SELECT COUNT(*) AS orderCount FROM order_items WHERE orderUserId = ?';
        db.query(checkQuery, [id], (checkErr, checkResults) => {
            if (checkErr) {
                console.error('Database query error:', checkErr);
                req.flash('error', 'Failed to check related orders.');
                return res.redirect('/admin/users');
            }

            const { orderCount } = checkResults[0];
            if (orderCount > 0) {
                req.flash('error', 'Cannot delete user. There are related orders.');
                return res.redirect('/admin/users');
            }

            // If no related orders, proceed to delete
            db.query('DELETE FROM users WHERE userId = ?', [id], (deleteErr) => {
                if (deleteErr) {
                    console.error('Database query error:', deleteErr);
                    req.flash('error', 'Failed to delete user.');
                    return res.redirect('/admin/users');
                }

                req.flash('success', 'User deleted successfully.');
                res.redirect('/admin/users');
            });
        });
    });
};
