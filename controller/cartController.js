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



exports.renderShoppingCart = async (req, res) => {
    try {
        const userId = req.session?.user?.id; // Check if the user is logged in
        let cartCount = 0;
        let products = [];
        let userAddress = 'Add Address'; // Default address for users

        if (userId) {
            // Fetch cart and address details for logged-in users
            const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
            const cartItemsQuery = `
                SELECT 
                    c.cartId,
                    p.productId,
                    p.productName,
                    p.productPrice,
                    p.productImage,
                    c.cartProductQuantity
                FROM cart_items c
                JOIN products p ON c.cartProductId = p.productId
                WHERE c.cartUserId = ?
            `;
            const userAddressQuery = 'SELECT userAddress FROM users WHERE userId = ?';

            // Execute queries
            const [cartCountResults] = await db.promise().query(cartCountQuery, [userId]);
            const [cartItemsResults] = await db.promise().query(cartItemsQuery, [userId]);
            const [userAddressResults] = await db.promise().query(userAddressQuery, [userId]);

            // Assign results
            cartCount = cartCountResults[0]?.cartCount || 0;
            products = cartItemsResults || [];
            userAddress = userAddressResults[0]?.userAddress || 'Add Address';
        } else {
            // Fetch product data for guest users
            const guestCart = req.session.guestCart || {};

            if (Object.keys(guestCart).length > 0) {
                const productIds = Object.keys(guestCart).map((id) => `'${id}'`).join(',');
                const productQuery = `
                    SELECT 
                        productId,
                        productName,
                        productPrice,
                        productImage
                    FROM products
                    WHERE productId IN (${productIds})
                `;

                const [productResults] = await db.promise().query(productQuery);

                // Map product details with quantities from guestCart
                products = productResults.map((product) => ({
                    ...product,
                    cartProductQuantity: guestCart[product.productId].quantity,
                }));

                cartCount = products.reduce((sum, item) => sum + item.cartProductQuantity, 0);
            }
        }

        // Update session cart count
        req.session.cartCount = cartCount;

        // Create user object
        const user = userId
            ? { ...req.session.user, userAddress }
            : null; // Null for not-logged-in users

        const searchQuery = req.query.q || ''; // Default to an empty string if not provided

        // Render the cart page
        res.render('cart_copy', {
            user,
            cartCount,
            products,
            searchQuery,
        });
    } catch (error) {
        console.error('Unexpected error in renderShoppingCart:', error);
        res.status(500).send('Internal Server Error');
    }
};


exports.updateQuantity = (req, res) => {
    const cartId = req.params.id; // For logged-in users
    const productId = req.params.id; // Get productId from URL
    const { quantity } = req.body; // Get quantity from the request body

    if (!productId || !quantity) {
        console.error('Error: Missing productId or quantity');
        return res.status(400).send('Invalid request');
    }

    const userId = req.session?.user?.id;

    if (userId) {
        // Update quantity for logged-in users
        const updateQuery = 'UPDATE cart_items SET cartProductQuantity = ? WHERE cartId = ?';
        db.query(updateQuery, [quantity, cartId], (error, results) => {
            if (error) {
                console.error("Error updating product quantity:", error);
                return res.status(500).send('Error updating product quantity');
            }
            if (results.affectedRows === 0) {
                console.error("No rows updated. Check cartId and userId.");
                return res.status(404).send('Cart item not found');
            }
            res.redirect('/cart');
        });
    } else {
        // Update for guest user
        const guestCart = req.session.guestCart || {};
        if (guestCart[productId]) {
            guestCart[productId].quantity = parseInt(quantity, 10);
            req.session.guestCart = guestCart;
            res.redirect('/cart');
        } else {
            console.error('Error: Product not found in guest cart');
            return res.status(400).send('Invalid request');
        }
    }
};



exports.deleteShoppingCartItem = (req, res) => {
    const cartId = req.params.id; // For logged-in users
    const productId = req.params.id; // Use the same parameter for guest users to match the route
    const userId = req.session?.user?.id; // Check if the user is logged in

    if (!cartId && !productId) {
        console.error("Error: Missing cartId or productId");
        return res.status(400).send('Invalid request');
    }

    if (userId) {
        // For logged-in users, delete from the database using cartId
        const deleteQuery = 'DELETE FROM cart_items WHERE cartId = ?';
        db.query(deleteQuery, [cartId], (error) => {
            if (error) {
                console.error("Error deleting product from cart:", error);
                return res.status(500).send('Error deleting product from cart');
            }

            // Update the cart count in the session after deletion
            const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
            db.query(cartCountQuery, [userId], (err, results) => {
                if (err) {
                    console.error("Error updating cart count:", err);
                    return res.status(500).send('Error updating cart count');
                }

                req.session.cartCount = results[0]?.cartCount || 0;
                res.redirect('/cart');
            });
        });
    } else {
        // For guest users, modify the guestCart session object
        const guestCart = req.session.guestCart || {};

        if (!productId || !guestCart[productId]) {
            console.error("Error: Missing or invalid productId for guest user");
            return res.status(400).send('Invalid request');
        }

        
        // Remove the product from the guestCart
        delete guestCart[productId];

        // Update cartCount in session
        const cartCount = Object.values(guestCart).reduce((sum, item) => sum + item.quantity, 0);
        req.session.cartCount = cartCount;

        // Update session with modified guestCart
        req.session.guestCart = guestCart;

        res.redirect('/cart');
    }
};


exports.renderProduct = (req, res) => {
    const productId = req.params.id; // Get the product ID from the URL (e.g., /product/1)

    // Query to get the product details by its ID
    db.query('SELECT * FROM products WHERE productId = ?', [productId], (error, results) => {
        if (error) {
            console.error("Error fetching product:", error);
            return res.status(500).send('Error fetching product');
        }

        if (results.length === 0) {
            return res.status(404).send('Product not found');
        }

        // Check if the user is logged in or a guest
        const userId = req.session?.user?.id || null;

        let cartCount = 0;
        if (userId) {
            // Fetch cart count for logged-in users
            const countQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
            db.query(countQuery, [userId], (err, countResults) => {
                if (err) {
                    console.error('Error fetching cart count:', err);
                    return res.status(500).send('Failed to fetch cart count');
                }
                cartCount = countResults[0]?.cartCount || 0;

                // Render the product page for logged-in users
                res.render('product', {
                    product: results[0],
                    user: req.session.user,
                    cartCount,
                });
            });
        } else {
            // For guests, use session-based cart count
            if (!Array.isArray(req.session.guestCart)) {
                req.session.guestCart = []; // Initialize guest cart as an array
            }
            cartCount = req.session.guestCart.reduce((total, item) => total + item.cartProductQuantity, 0);

            // Render the product page for guests
            res.render('product', {
                product: results[0],
                user: { username: null, userAddress: 'Set Location' },
                cartCount,
            });
        }
    });
};



exports.addToCart = (req, res) => {
    const userId = req.session?.user?.id; // Check if the user is logged in
    const { productId } = req.params;

    if (userId) {
        // For logged-in users
        const checkQuery = 'SELECT * FROM cart_items WHERE cartUserId = ? AND cartProductId = ?';
        const insertQuery = 'INSERT INTO cart_items (cartUserId, cartProductId, cartProductQuantity) VALUES (?, ?, 1)';
        const updateQuery = 'UPDATE cart_items SET cartProductQuantity = cartProductQuantity + 1 WHERE cartUserId = ? AND cartProductId = ?';

        db.query(checkQuery, [userId, productId], (err, results) => {
            if (err) {
                console.error('Error checking cart:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            const query = results.length > 0 ? updateQuery : insertQuery;

            db.query(query, [userId, productId], (err) => {
                if (err) {
                    console.error('Error updating cart:', err);
                    return res.status(500).json({ success: false, message: 'Failed to add to cart' });
                }

                const countQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
                db.query(countQuery, [userId], (err, countResults) => {
                    if (err) {
                        console.error('Error fetching cart count:', err);
                        return res.status(500).json({ success: false, message: 'Failed to fetch cart count' });
                    }

                    const cartCount = countResults[0].cartCount || 0;
                    req.session.cartCount = cartCount; // Update session cart count
                    res.json({ success: true, cartCount });
                });
            });
        });
    } else {
        // For guests
        if (!req.session.guestCart || Array.isArray(req.session.guestCart)) {
            req.session.guestCart = {}; // Ensure guestCart is an object
        }

        const guestCart = req.session.guestCart;

        // Ensure `productId` exists and is valid
        if (!productId) {
            console.error('Error: Missing productId');
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Initialize the item in the cart if not already present
        if (!guestCart[productId]) {
            guestCart[productId] = { productId, quantity: 0 }; // Initialize quantity to 0
        }

        // Safely increment the quantity
        guestCart[productId].quantity = (guestCart[productId].quantity || 0) + 1;

        // Recalculate the cart count
        const cartCount = Object.values(guestCart).reduce((sum, item) => sum + (item.quantity || 0), 0);

        req.session.cartCount = cartCount; // Update session cart count
        res.json({ success: true, cartCount });
    }
};
