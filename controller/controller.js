const mysql = require('mysql2');
const path = require('path');
const crypto = require('crypto'); // Import crypto module for hashing
const { v4: uuidv4 } = require('uuid'); // Use UUID library to generate alphanumeric IDs
const axios = require('axios'); // Install axios for HTTP requests
const puppeteer = require('puppeteer');
const fs = require("fs");



// // Connect to SQL database
// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '', // Replace with your database password
//   database: 'c372_booklink', // Replace with your database name
//   port: 3307
// });



const db = mysql.createConnection({
  host: 'db4free.net',
  user: 'valentin',
  password: 'v1SK?947368/[9',
  database: 'c372_booklink',
  port: 3306
});



db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database!');
});





exports.getHomepage = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    // Fetch featured products
    const productQuery = 'SELECT productId, productName, productPrice, productImage, productStock FROM products LIMIT 8';
    const [products] = await db.promise().query(productQuery);

    // Fetch featured categories
    const categoryQuery = 'SELECT categoryId, categoryName, categoryImage FROM categories LIMIT 4';
    const [categories] = await db.promise().query(categoryQuery);

    let cartCount = 0;
    let userAddress = 'Set Location';

    if (userId) {
      const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
      const userQuery = 'SELECT userAddress FROM users WHERE userId = ?';

      const [cartResults] = await db.promise().query(cartCountQuery, [userId]);
      const [userResults] = await db.promise().query(userQuery, [userId]);

      cartCount = cartResults[0]?.cartCount || 0;
      userAddress = userResults[0]?.userAddress || 'Add Address';
    } else {
      if (req.session.guestCart) {
        cartCount = Object.values(req.session.guestCart).reduce((sum, item) => sum + item.quantity, 0);
      }
    }

    const user = userId
      ? { ...req.session.user, userAddress }
      : null;

    const searchQuery = req.query.q || ''; // Default to an empty string if not provided


    res.render('homepage', {
      user,
      products,
      categories, // Include categories in the response
      cartCount,
      searchQuery,
    });
  } catch (err) {
    console.error('Error fetching homepage data:', err);
    res.status(500).send('Internal Server Error');
  }
};



// Middleware to check if admin
exports.checkAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    next(); // Allow access
  } else {
    res.status(403).render('401');
  }
};






exports.login = async (req, res) => {
  const { username, password, 'g-recaptcha-response': captchaResponse } = req.body;

  // if (!username || !password || !captchaResponse) {
  //   req.flash('error', 'All fields are required, including CAPTCHA.');
  //   return res.redirect('/login');
  // }

  // Verify CAPTCHA
  try {
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const response = await axios.post(verifyUrl, null, {
      params: {
        secret: '6LcOXsIqAAAAAI0E8wZi53_G5en0xbEXXqrKRvl0', // Server-side secret key
        response: captchaResponse,
      },
    });

    console.log('Captcha API Response:', response.data);

    const { success, score, 'error-codes': errorCodes } = response.data;

    if (errorCodes) {
      console.error('Error Codes:', errorCodes);
    }

    if (!success || score < 0.5) { // Adjust score threshold if needed
      req.flash('error', 'Captcha verification failed. Please try again.');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Captcha verification error:', error.message);
    req.flash('error', 'Captcha verification failed due to a server error.');
    return res.redirect('/login');
  }

  // Hash the password
  const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send('Internal Server Error');
      }

      if (results.length === 0) {
        req.flash('error', 'User not registered.');
        return res.redirect('/login');
      }

      const user = results[0];
      if (user.userPassword !== hashedPassword) {
        req.flash('error', 'Password is incorrect.');
        return res.redirect('/login');
      }

      req.session.user = {
        id: user.userId,
        username: user.username,
        role: user.userRole,
        image: user.userImage,
        Address: user.userAddress,
      };

      if (user.userRole === 'admin' || user.userRole === 'SuperAdmin') {
        res.redirect('/admin_dashboard');
      } else {
        res.redirect('/homepage');
      }
    }
  );
};



exports.renderLoginPage = (req, res) => {
  res.render('login', { errorMessage: null });
};




// User Signup
exports.signup = (req, res) => {
  const { username, password, email } = req.body;

  // // Validate input fields
  // if (!username || !password || !email) {
  //   return res.status(400).render('signup', { errorMessage: 'All fields are required.' });
  // }

  // Check if the username already exists
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).render('signup', { errorMessage: 'Internal Server Error. Please try again later.' });
    }

    if (results.length > 0) {
      // User already exists
      return res.status(400).render('signup', { errorMessage: 'Username already exists. Please choose another.' });
    }

    // Insert new user into the database
    db.query(
      'INSERT INTO users (username, userPassword, userEmail, userRole) VALUES (?, SHA(?), ?, ?)',
      [username, password, email, 'user'], // Default role is 'user'
      (err) => {
        if (err) {
          console.error('Database insert error:', err);
          return res.status(500).render('signup', { errorMessage: 'Internal Server Error. Please try again later.' });
        }

        // Redirect to login page after successful signup
        return res.redirect('/login');
      }
    );
  });
};






exports.adminDashboard = (req, res) => {
  const user = req.session.user; // Get user from session
  if (user) {
    res.render('admin_dashboard', {
      user: user, // Pass the user object to the view
      userImage: user.image // Pass user.image as userImage to the view
    });
  } else {
    res.redirect('/login'); // Redirect to login if no user is logged in
  }
};








exports.renderForgetPassword = (req, res) => {
  res.render('forget_password', { errorMessage: null });
};


exports.resetPassword = (req, res) => {
  const { email, newPassword } = req.body;

  db.query(
    'UPDATE users SET userPassword = SHA(?) WHERE userEmail = ?',
    [newPassword, email],
    (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send('Internal Server Error');
      }

      if (results.affectedRows > 0) {
        // Password updated successfully, redirect to login
        req.flash('success', 'Password reset successfully. You can now log in.');
        res.redirect('/forget_password');
      } else {
        // Email not found, flash error message
        req.flash('error', 'Email is not registered.');
        res.redirect('/forget_password');
      }
    }
  );
};





// Logout route
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Logout failed.');
    }
    res.redirect('/login'); // Redirect to login page after logout
  });
};

exports.getCategories = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    // SQL query to fetch all categories
    const query = 'SELECT * FROM categories';
    const [results] = await db.promise().query(query);

    let cartCount = 0;

    if (userId) {
      // Fetch cart count for logged-in users
      const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
      const [cartResults] = await db.promise().query(cartCountQuery, [userId]);

      cartCount = cartResults[0]?.cartCount || 0;

      // Update cartCount in session for consistency
      req.session.cartCount = cartCount;
    } else {
      // For guests, use session-based cart
      if (req.session.guestCart) {
        // Calculate cart count from guest cart
        cartCount = Object.values(req.session.guestCart).reduce((sum, item) => sum + item.quantity, 0);
      } else {
        // Initialize guestCart if not present
        req.session.guestCart = [];
      }

      // Update session cart count
      req.session.cartCount = cartCount;
    }

    // Prepare the user object based on login status
    const user = userId
      ? { ...req.session.user, userAddress: req.session.user?.Address || 'Add Address' }
      : null; // Null for not-logged-in users

    const searchQuery = req.query.q || ''; // Default to an empty string if not provided

    // Render the categories page with user, categories, and cart count
    res.render('categories', {
      categories: results, // Categories data from the database
      user,                // User object
      cartCount,           // Cart count for user or guest
      searchQuery,
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).send('Internal Server Error');
  }
};





exports.getProductsByCategory = (req, res) => {
  try {
    // Extract categoryId from the route parameters
    const { categoryId } = req.params; // Updated to use params
    if (!categoryId) {
      console.error('Category ID is missing in the request.');
      return res.status(400).send('Category ID is required.');
    }

    // SQL query to fetch products based on categoryId
    const productQuery = 'SELECT * FROM products WHERE categoryId = ?';

    // Execute the product query
    db.query(productQuery, [categoryId], (err, products) => {
      if (err) {
        console.error('Error fetching products by category:', err.message);
        return res.status(500).send('Internal Server Error');
      }

      // Check if the user is logged in
      const userId = req.session?.user?.id;

      // Prepare the user object
      const user = userId
        ? {
          ...req.session.user,
          userAddress: req.session.user?.Address || 'Add Address',
        }
        : null; // Null for guests to match the navbar logic

      const searchQuery = req.query.q || ''; // Default to an empty string if not provided

      // Render the products page with the fetched data
      res.render('products', {
        products, // Pass the fetched products
        user, // Pass the user object or null for guests
        cartCount: req.session?.cartCount || 0, // Optional: Cart count
        searchQuery,
      });
    });
  } catch (error) {
    console.error('Unexpected error in getProductsByCategory:', error);
    res.status(500).send('Internal Server Error');
  }
};






exports.renderSuccessPage = (req, res) => {
  const userId = req.session?.user?.id;

  try {
    // Check if the user is authenticated
    if (!userId) {
      return res.status(401).render('401'); // Unauthorized access
    }

    // // Step 1: Generate a unique alphanumeric orderId
    // const orderId = uuidv4(); // Generates a unique ID like 'c9d6e6c1-4e7c-4f59-bb8f-df1b454f9800'
    // Generate a unique 10-character alphanumeric orderId
    const generateOrderId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };

    const orderId = generateOrderId();

    // Step 2: Retrieve cart items for the current user
    const fetchCartQuery = 'SELECT cartProductId, cartProductQuantity FROM cart_items WHERE cartUserId = ?';
    db.query(fetchCartQuery, [userId], (fetchError, cartItems) => {
      if (fetchError) {
        console.error('Error fetching cart items:', fetchError);
        return res.status(500).send('Failed to process your request.');
      }

      if (cartItems.length === 0) {
        return res.status(400).send('Your cart is empty.');
      }

      // Step 3: Insert cart items into the `order_items` table with the generated orderId
      const insertOrderQuery = `
        INSERT INTO order_items (orderProductId, orderProductQuantity, orderUserId, orderDate, orderId)
        VALUES (?, ?, ?, NOW(), ?)
      `;

      const insertPromises = cartItems.map(item =>
        new Promise((resolve, reject) => {
          db.query(
            insertOrderQuery,
            [item.cartProductId, item.cartProductQuantity, userId, orderId],
            (insertError) => {
              if (insertError) reject(insertError);
              else resolve();
            }
          );
        })
      );

      Promise.all(insertPromises)
        .then(() => {
          // Step 4: Clear the cart for the current user
          const clearCartQuery = 'DELETE FROM cart_items WHERE cartUserId = ?';
          db.query(clearCartQuery, [userId], (clearError) => {
            if (clearError) {
              console.error('Error clearing the cart:', clearError);
              return res.status(500).send('Failed to process your request.');
            }

            // Step 5: Render the success page with the generated orderId
            res.render('success', {
              message: `Thank you for your purchase! Your order ID is ${orderId}.`,
            });
          });
        })
        .catch((insertError) => {
          console.error('Error inserting into orders:', insertError);
          res.status(500).send('Failed to process your order.');
        });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Failed to process your request.');
  }
};


exports.getOrders = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    // Query to fetch all order items with a status other than "Completed"
    const query = `
      SELECT
          oi.orderId,
          oi.orderProductId,
          p.productName,
          p.productImage,
          p.productPrice,
          oi.orderProductQuantity,
          oi.orderDate,
          oi.orderStatus
      FROM order_items oi
      JOIN products p ON oi.orderProductId = p.productId
      WHERE oi.orderUserId = ? AND TRIM(LOWER(oi.orderStatus)) NOT LIKE 'completed%';`;


    const [orders] = await db.promise().query(query, [userId]);

    // Dynamically fetch userAddress if not in the session
    const userQuery = 'SELECT userAddress FROM users WHERE userId = ?';
    const [[userResult]] = await db.promise().query(userQuery, [userId]);
    const userAddress = userResult?.userAddress || "Add Address";

    // Group orders by orderId
    const ordersGrouped = orders.reduce((acc, order) => {
      acc[order.orderId] = acc[order.orderId] || [];
      acc[order.orderId].push(order);
      return acc;
    }, {});

    const searchQuery = req.query.q || ''; // Default to an empty string if not provided

    // Render the orders page with filtered orders
    res.render('orders', {
      ordersGrouped,
      user: {
        userAddress,
        ...req.session.user,
      },
      searchQuery,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Error retrieving orders');
  }
};




exports.getOrderHistory = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    // Fetch completed orders
    const query = `
      SELECT
          oi.orderId,
          oi.orderProductId,
          p.productName,
          p.productImage,
          p.productPrice,
          oi.orderProductQuantity,
          oi.orderDate,
          oi.orderStatus
      FROM order_items oi
      JOIN products p ON oi.orderProductId = p.productId
      WHERE oi.orderUserId = ? AND TRIM(LOWER(oi.orderStatus)) LIKE 'completed%';`;
    const params = [userId];

    const [orders] = await db.promise().query(query, params);


    // Fetch user address
    const userQuery = 'SELECT userAddress FROM users WHERE userId = ?';
    const [[userResult]] = await db.promise().query(userQuery, [userId]);
    const userAddress = userResult?.userAddress || 'Add Address';

    // Group orders by orderId
    const ordersGrouped = orders.reduce((acc, order) => {
      acc[order.orderId] = acc[order.orderId] || [];
      acc[order.orderId].push(order);
      return acc;
    }, {});

    res.render('order_history', {
      ordersGrouped,
      user: { ...req.session.user, userAddress },
      searchQuery: req.query.q || '',
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Error retrieving orders');
  }
};












// exports.getProductDetails = async (req, res) => {
//   try {
//     const productId = req.params.id; // Get product ID from the route parameter

//     // Query for the specific product
//     const productQuery = 'SELECT * FROM products WHERE productId = ?';
//     const [products] = await db.promise().query(productQuery, [productId]);

//     if (products.length === 0) {
//       return res.status(404).send('Product not found');
//     }

//     const userId = req.session?.user?.id; // Check if user is logged in
//     let cartCount = 0;
//     let userAddress = 'Set Location';

//     if (userId) {
//       // Fetch cart count and address
//       const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
//       const userQuery = 'SELECT userAddress FROM users WHERE userId = ?';

//       const [cartResults] = await db.promise().query(cartCountQuery, [userId]);
//       const [userResults] = await db.promise().query(userQuery, [userId]);

//       cartCount = cartResults[0]?.cartCount || 0;
//       userAddress = userResults[0]?.userAddress || 'Add Address';
//     } else {

//       // For guests, calculate cart count from session
//       if (req.session.guestCart) {

//         // Ensure guestCart is an object and calculate the count
//         if (typeof req.session.guestCart === 'object') {
//           cartCount = Object.values(req.session.guestCart).reduce((sum, item) => sum + item.quantity, 0);
//         }
//       }
//     }

//     // Define the user object
//     const user = userId
//       ? { ...req.session.user, userAddress } // Logged-in user with address
//       : null; // Guest user

//     const searchQuery = req.query.q || ''; // Default to an empty string if not provided


//     // Render the product page with all relevant data
//     res.render('product', {
//       product: products[0], // Product details
//       user, // User object
//       cartCount, // Cart count
//       searchQuery,
//     });
//   } catch (err) {
//     console.error('[ERROR] Fetching product details failed:', err);
//     res.status(500).send('Internal Server Error');
//   }
// };


exports.getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    // Query for the specific product
    const productQuery = 'SELECT * FROM products WHERE productId = ?';
    const [products] = await db.promise().query(productQuery, [productId]);

    const reviewsQuery = 'SELECT * FROM reviews WHERE productId = ?';
    const [reviews] = await db.promise().query(reviewsQuery, [productId]);

    if (products.length === 0) {
      return res.status(404).send('Product not found');
    }

    const userId = req.session?.user?.id;
    let cartCount = 0;
    let userAddress = 'Set Location';
    let completedOrders = [];

    if (userId) {
      // Fetch cart count and address
      const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
      const userQuery = 'SELECT userAddress FROM users WHERE userId = ?';
      const completedOrdersQuery = `
        SELECT DISTINCT orderProductId FROM order_items
        WHERE orderUserId = ? AND TRIM(LOWER(orderStatus)) LIKE 'completed%'
      `;

      const [cartResults] = await db.promise().query(cartCountQuery, [userId]);
      const [userResults] = await db.promise().query(userQuery, [userId]);
      const [completedResults] = await db.promise().query(completedOrdersQuery, [userId]);

      cartCount = cartResults[0]?.cartCount || 0;
      userAddress = userResults[0]?.userAddress || 'Add Address';
      completedOrders = completedResults.map(order => order.orderProductId); // FIX: Use 'orderProductId'
    }

    const user = userId ? { ...req.session.user, userAddress } : null;
    const searchQuery = req.query.q || '';

    res.render('product', {
      product: products[0],
      user,
      cartCount,
      searchQuery,
      completedOrders, // Send completed product IDs to the EJS template
      reviews,
    });
  } catch (err) {
    console.error('[ERROR] Fetching product details failed:', err);
    res.status(500).send('Internal Server Error');
  }
};



exports.getAllProducts = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    // Fetch all products
    const productQuery = 'SELECT * FROM products';
    const [products] = await db.promise().query(productQuery);

    // Helper functions to handle user/guest cart and address logic
    const getCartCount = async (userId, guestCart) => {
      if (userId) {
        const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
        const [cartResults] = await db.promise().query(cartCountQuery, [userId]);
        return cartResults[0]?.cartCount || 0;
      } else if (guestCart) {
        return Object.values(guestCart).reduce((sum, item) => sum + item.quantity, 0);
      }
      return 0;
    };

    const getUserAddress = async (userId) => {
      if (userId) {
        const userQuery = 'SELECT userAddress FROM users WHERE userId = ?';
        const [userResults] = await db.promise().query(userQuery, [userId]);
        return userResults[0]?.userAddress || 'Add Address';
      }
      return 'Set Location';
    };

    // Get cart count and user address
    const cartCount = await getCartCount(userId, req.session.guestCart);
    const userAddress = await getUserAddress(userId);

    // Build user object
    const user = userId
      ? { ...req.session.user, userAddress } // For logged-in user
      : null; // For guest

    const searchQuery = req.query.q || ''; // Default to an empty string if not provided

    // Render all products page
    res.render('allproducts', {
      user,
      products,
      cartCount,
      searchQuery,
    });
  } catch (err) {
    console.error('Error fetching all products:', err);
    res.status(500).send('Internal Server Error');
  }
};





exports.searchProducts = async (req, res) => {
  try {
    // const searchQuery = req.query.q || ''; // Get the query or default to an empty string
    const searchQuery = req.query.query;
    const userId = req.session?.user?.id;

    // Perform search query on the `products` table
    const sql = `SELECT * FROM products WHERE productName LIKE ? OR productDescription LIKE ? LIMIT 5`;
    const queryParams = [`%${searchQuery}%`, `%${searchQuery}%`];
    const [results] = await db.promise().query(sql, queryParams);


    // If request is AJAX, return JSON
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ results });
    }


    // Helper functions to handle user/guest cart and address logic
    const getCartCount = async (userId, guestCart) => {
      if (userId) {
        const cartCountQuery = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
        const [cartResults] = await db.promise().query(cartCountQuery, [userId]);
        return cartResults[0]?.cartCount || 0;
      } else if (guestCart) {
        return Object.values(guestCart).reduce((sum, item) => sum + item.quantity, 0);
      }
      return 0;
    };

    const getUserAddress = async (userId) => {
      if (userId) {
        const userQuery = 'SELECT userAddress FROM users WHERE userId = ?';
        const [userResults] = await db.promise().query(userQuery, [userId]);
        return userResults[0]?.userAddress || 'Add Address';
      }
      return 'Set Location';
    };

    // Get cart count and user address
    const cartCount = await getCartCount(userId, req.session.guestCart);
    const userAddress = await getUserAddress(userId);

    // Build user object
    const user = userId
      ? { ...req.session.user, userAddress } // For logged-in user
      : null; // For guest

    // Render the search results page
    res.render('search-results', {
      user,
      results, // Pass the search results
      searchQuery, // Pass the search query to the view
      cartCount,
    });


  } catch (err) {
    console.error('Error performing search query:', err);
    res.status(500).send('Internal Server Error');
  }
};


// exports.searchProducts = async (req, res) => {
//   try {
//     const searchQuery = req.query.query || '';
//     const userId = req.session?.user?.id;

//     if (!searchQuery) {
//       return res.json({ results: [] });
//     }

//     const sql = `SELECT productName FROM products WHERE productName LIKE ? LIMIT 5`; // Limit results to 5 suggestions
//     const queryParams = [`%${searchQuery}%`];
//     const [results] = await db.promise().query(sql, queryParams);

//     // If request is AJAX, return JSON
//     if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
//       return res.json({ results });
//     }

//     // Normal search page rendering
//     res.render('search-results', {
//       user: userId ? { ...req.session.user } : null,
//       results,
//       searchQuery,
//       cartCount: 0,
//     });

//   } catch (err) {
//     console.error('Error performing search query:', err);
//     res.status(500).send('Internal Server Error');
//   }
// };



exports.getAdminReport = async (req, res) => {
  const user = req.session.user; // Retrieve user from the session
  try {
    // Query for summary
    const summaryQuery = `
          SELECT
              COUNT(DISTINCT orderId) AS totalOrders,
              SUM(orderProductQuantity * productPrice) AS totalRevenue
          FROM order_items
          JOIN products ON order_items.orderProductId = products.productId
          WHERE orderStatus = 'Completed';
      `;
    const [summaryResults] = await db.promise().query(summaryQuery);
    const summary = summaryResults[0] || { totalOrders: 0, totalRevenue: 0 };

    // Ensure totalRevenue is a number
    summary.totalRevenue = Number(summary.totalRevenue || 0);

    // Query for product sales performance
    const salesQuery = `
          SELECT
              p.productName,
              SUM(oi.orderProductQuantity) AS totalSold,
              SUM(oi.orderProductQuantity * p.productPrice) AS totalRevenue
          FROM order_items oi
          JOIN products p ON oi.orderProductId = p.productId
          WHERE oi.orderStatus = 'Completed'
          GROUP BY p.productName
          ORDER BY totalRevenue DESC
          LIMIT 5;
      `;
    const [salesReport] = await db.promise().query(salesQuery);

    // Ensure each totalRevenue and totalSold is a number
    salesReport.forEach(product => {
      product.totalRevenue = Number(product.totalRevenue || 0);
      product.totalSold = Number(product.totalSold || 0);
    });

    // Render admin report page
    res.render('admin_report', {
      summary,
      salesReport,
      user,
      userImage: user.image // Pass user.image as userImage to the view
    });
  } catch (error) {
    console.error('Error generating admin report:', error);
    res.status(500).send('Error generating admin report');
  }
};


exports.downloadAdminReport = async (req, res) => {
  try {
    console.log("Starting Puppeteer...");
    // const browser = await puppeteer.launch({ headless: false }); // Debugging mode
    const browser = await puppeteer.launch({ 
      headless: "new", 
      protocolTimeout: 60000 // Increase timeout to 60 seconds
    });    
    const page = await browser.newPage();

    const reportUrl = "http://localhost:3000/admin/report";
    console.log("Opening URL:", reportUrl);
    // await page.goto(reportUrl, { waitUntil: "networkidle2", timeout: 60000 });
    await page.goto("http://localhost:3000/admin/report", { waitUntil: "load", timeout: 60000 });
    // await page.goto("http://localhost:3000/admin/report", { waitUntil: "domcontentloaded", timeout: 60000 });



    const pdfPath = "C:/Users/23010715/Downloads/Admin_Report.pdf";
    console.log("Generating PDF...");

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    console.log("PDF Generated:", pdfPath);

    if (fs.existsSync(pdfPath)) {
      res.download(pdfPath, "Admin_Report.pdf", (err) => {
        if (err) {
          console.error("Error sending the file:", err);
          res.status(500).send("Error generating the PDF");
        }
      });
    } else {
      res.status(500).send("PDF file not found");
    }
  } catch (error) {
    console.error("Error generating admin report PDF:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.submitReview = async (req, res) => {
  try {
    const { reviewContent, reviewRating, productId } = req.body;
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!reviewContent || !reviewRating || !productId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const reviewImage = req.file ? req.file.filename : null; // Handle optional image upload

    // Insert into database
    const insertQuery = `
      INSERT INTO reviews (reviewContent, reviewRating, reviewImage, reviewedByUserId, productId)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.promise().query(insertQuery, [reviewContent, reviewRating, reviewImage, userId, productId]);

    res.redirect(`/productdescription/${productId}#review-section`);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).send('Internal Server Error');
  }
};

