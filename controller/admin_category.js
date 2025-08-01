const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

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




exports.addCategory = (req, res) => {
    const { categoryName, categoryDescription } = req.body;
    const categoryImage = req.file ? req.file.filename : null;

    // Check if categoryName already exists (case-insensitive)
    const checkQuery = `
        SELECT * FROM categories 
        WHERE LOWER(categoryName) = LOWER(?)`;
    db.query(checkQuery, [categoryName], (err, results) => {
        if (err) {
            console.error('Error checking category name:', err);
            return res.status(500).send('Server Error');
        }

        if (results.length > 0) {
            return res.status(400).send('Category name already exists.');
        }

        // Proceed with inserting the new category
        const insertQuery = `
            INSERT INTO categories (categoryName, categoryDescription, categoryImage) 
            VALUES (?, ?, ?)`;
        db.query(insertQuery, [categoryName, categoryDescription, categoryImage], (err) => {
            if (err) {
                console.error('Error inserting category:', err);
                return res.status(500).send('Server Error');
            }
            res.redirect('/admin/categories');
        });
    });
};



exports.viewCategories = (req, res) => {
    const user = req.session.user; // Retrieve user from the session

    db.query('SELECT * FROM categories', (err, categories) => {
        if (err) throw err;

        res.render('admin_categories', {
            categories, // Pass categories to the view
            user,// Pass the session user to the view
            userImage: user.image // Pass user.image as userImage to the view
        });
    });
};



exports.updateCategory = (req, res) => {
    const { id } = req.params;
    const { categoryName, categoryDescription } = req.body;
    const categoryImage = req.file ? req.file.filename : null;

    // Check for duplicate categoryName (case-insensitive)
    const duplicateCheckQuery = `
        SELECT * FROM categories 
        WHERE LOWER(categoryName) = LOWER(?) AND categoryId != ?`;
    db.query(duplicateCheckQuery, [categoryName, id], (err, results) => {
        if (err) {
            console.error('Error checking duplicates:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length > 0) {
            return res.status(400).send('Category name already exists.');
        }

        // Fetch the current image
        db.query('SELECT categoryImage FROM categories WHERE categoryId = ?', [id], (err, results) => {
            if (err) {
                console.error('Error fetching category image:', err);
                return res.status(500).send('Internal Server Error');
            }

            const currentImage = results[0]?.categoryImage;

            // Prepare the update query
            let updateQuery = 'UPDATE categories SET categoryName = ?, categoryDescription = ? WHERE categoryId = ?';
            const params = [categoryName, categoryDescription, id];

            if (categoryImage) {
                updateQuery = `
                    UPDATE categories 
                    SET categoryName = ?, categoryDescription = ?, categoryImage = ? 
                    WHERE categoryId = ?`;
                params.splice(2, 0, categoryImage);

                // Delete old image if a new one is uploaded
                if (currentImage) {
                    const oldImagePath = path.join(__dirname, '..', 'uploads', currentImage);
                    fs.unlink(oldImagePath, (unlinkErr) => {
                        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                            console.error('Failed to delete old image:', unlinkErr);
                        }
                    });
                }
            }

            db.query(updateQuery, params, (err) => {
                if (err) {
                    console.error('Error updating category:', err);
                    return res.status(500).send('Error updating category.');
                }
                res.redirect('/admin/categories');
            });
        });
    });
};





// Delete a category
exports.deleteCategory = (req, res) => {
    const { id } = req.params;

    // Retrieve the image
    db.query('SELECT categoryImage FROM categories WHERE categoryId = ?', [id], (err, results) => {
        if (err) throw err;
        const image = results[0]?.categoryImage;

        // Delete the record
        db.query('DELETE FROM categories WHERE categoryId = ?', [id], (err) => {
            if (err) throw err;

            // Delete image file
            if (image) {
                fs.unlink(path.join(__dirname, '../uploads', image), (err) => {
                    if (err) console.error('Failed to delete image:', err);
                });
            }
            res.redirect('/admin/categories');
        });
    });
};
