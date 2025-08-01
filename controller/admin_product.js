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

exports.addProduct = (req, res) => {
    const { productName, productDescription, productPrice, productStock, categoryId } = req.body;
    const productImage = req.file ? req.file.filename : null;

    // Updated validation for productPrice (whole number, 1 or 2 decimals)
    const pricePattern = /^\d+(\.\d{1,2})?$/;
    if (!pricePattern.test(productPrice) || parseFloat(productPrice) <= 0) {
        return res.status(400).send("Error: Product price must be greater than 0 and can have at most 2 decimal places.");
    }

    // Validate stock level
    if (isNaN(productStock) || parseInt(productStock) < 0) {
        return res.status(400).send("Error: Stock level cannot be less than 0.");
    }

    // SQL query to insert the product into the database
    const query = `
        INSERT INTO products 
        (productName, productDescription, productImage, productPrice, productStock, categoryId)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        query,
        [productName, productDescription, productImage, parseFloat(productPrice).toFixed(2), parseInt(productStock), categoryId],
        (err) => {
            if (err) {
                console.error("Error inserting product:", err);
                return res.status(500).send("Error adding product to the database.");
            }
            res.redirect("/admin/products");
        }
    );
};





exports.viewProducts = (req, res) => {
    const productQuery = 'SELECT * FROM products';
    const categoryQuery = 'SELECT * FROM categories';
    const user = req.session.user; // Retrieve user from the session

    db.query(productQuery, (err, products) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).send('Error fetching products.');
        }

        db.query(categoryQuery, (err, categories) => {
            if (err) {
                console.error('Error fetching categories:', err);
                return res.status(500).send('Error fetching categories.');
            }

            // Render the EJS file
            res.render('admin_products', {
                products: products,
                categories: categories,
                user,// Pass the session user to the view
                userImage: user.image
            });
        });
    });
};

exports.deleteProduct = (req, res) => {
    const { id } = req.params;

    // Step 1: Delete dependent rows from 'reviews'
    db.query('DELETE FROM reviews WHERE productId = ?', [id], (err) => {
        if (err) {
            console.error('Error deleting related reviews:', err);
            return res.status(500).send('Error deleting related reviews.');
        }

        // Step 2: Delete dependent rows from 'order_items'
        db.query('DELETE FROM order_items WHERE orderProductId = ?', [id], (err) => {
            if (err) {
                console.error('Error deleting related rows:', err);
                return res.status(500).send('Error deleting related rows.');
            }

            // Step 3: Now delete the product
            db.query('DELETE FROM products WHERE productId = ?', [id], (err) => {
                if (err) {
                    console.error('Error deleting product:', err);
                    return res.status(500).send('Error deleting product.');
                }

                res.redirect('/admin/products');
            });
        });
    });
};

exports.updateProduct = (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, categoryId } = req.body;
    const image = req.file ? req.file.filename : null;

    // Query to fetch the existing product details
    db.query('SELECT productImage FROM products WHERE productId = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching product image:', err.message);
            return res.status(500).send('Internal Server Error');
        }

        const oldImage = results[0]?.productImage;

        // Update the product details in the database
        const updateQuery = `
            UPDATE products
            SET productName = ?, productDescription = ?, productPrice = ?,
                productStock = ?, categoryId = ?, productImage = IFNULL(?, productImage)
            WHERE productId = ?
        `;

        db.query(updateQuery, [name, description, price, stock, categoryId, image, id], (err) => {
            if (err) {
                console.error('Error updating product:', err.message);
                return res.status(500).send('Internal Server Error');
            }


            // If a new image was uploaded, delete the old image file
            if (image && oldImage) {
                const imagePath = path.join(__dirname, '..', 'uploads', oldImage);

                fs.unlink(imagePath, (err) => {
                    if (err) {
                        if (err.code === 'EBUSY' || err.code === 'EACCES') {
                            console.error('File is locked, retrying deletion after 1 second...');
                            setTimeout(() => {
                                fs.unlink(imagePath, (retryErr) => {
                                    if (retryErr) {
                                        console.error(`Retry failed to delete old image: ${retryErr.message}`);
                                    } else {
                                        console.log('Old image deleted successfully.');
                                    }
                                });
                            }, 1000); // Retry after 1 second
                        } else {
                            console.error(`Failed to delete old image: ${err.message}`);
                        }
                    } else {
                        console.log('Old image deleted successfully.');
                    }
                });
            }

            res.redirect('/admin/products');
        });
    });
};