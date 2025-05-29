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



exports.getAdminOrders = async (req, res) => {
    const user = req.session.user; // Retrieve user from the session

    try {
        // Fetch all orders from the database
        const query = `
        SELECT
          oi.orderId,
          oi.orderProductId,
          p.productName,
          p.productImage,
          p.productPrice,
          oi.orderProductQuantity,
          oi.orderDate,
          oi.orderStatus,
          u.username
        FROM order_items oi
        JOIN products p ON oi.orderProductId = p.productId
        JOIN users u ON oi.orderUserId = u.userId
        ORDER BY oi.orderDate DESC;
      `;
        const [orders] = await db.promise().query(query);

        // Group orders by orderId
        const ordersGrouped = orders.reduce((acc, order) => {
            acc[order.orderId] = acc[order.orderId] || [];
            acc[order.orderId].push(order);
            return acc;
        }, {});

        // Render the admin orders page
        res.render('admin_orders', { 
            ordersGrouped,
            user,// Pass the session user to the view
            userImage: user.image // Pass user.image as userImage to the view 
        });
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        res.status(500).send('Error retrieving orders');
    }
};


exports.updateOrderStatus = async (req, res) => {
    const { orderId, orderStatus } = req.body;

    try {
        // Update the order status in the database
        const query = 'UPDATE order_items SET orderStatus = ? WHERE orderId = ?';
        await db.promise().query(query, [orderStatus, orderId]);

        // Send success response
        res.redirect('/admin/orders');
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, error: 'Error updating order status' });
    }
};