const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mysql = require('mysql2');
const flash = require('connect-flash');




const controller = require('./controller/controller');
const adminUserController = require('./controller/admin_user');
const adminCategoryController = require('./controller/admin_category');
const adminProductController = require('./controller/admin_product');
const cartController = require('./controller/cartController');
const userProfileController = require('./controller/user_profile');
const adminProfileController = require('./controller/admin_profile');
const adminOrdersController = require('./controller/admin_orders');




// Import middleware
const {  checkAdmin } = require('./middleware/auth');
const { validateRegistration, validateLogin } = require('./middleware/validation');


const multer = require('multer');
const path = require('path');





const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Replace with your database password
  database: 'c372_booklink', // Replace with your database name
  port: 3307
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to store images
  },
  filename: (req, file, cb) => {
    // Check if there is already an existing filename in the request body
    if (req.body.existingFilename && req.body.existingFilename !== 'null') {
      cb(null, req.body.existingFilename); // Use existing filename
    } else {
      cb(null, Date.now() + '-' + file.originalname); // Create a new unique filename
    }
  },
});

const upload = multer({ storage });


module.exports = upload;

const app = express();
app.use(express.json());
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

// Middleware for sessions
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(async (req, res, next) => {
  if (req.session && req.session.user) {
    const userId = req.session.user.id;
    try {
      const query = 'SELECT SUM(cartProductQuantity) AS cartCount FROM cart_items WHERE cartUserId = ?';
      db.query(query, [userId], (err, results) => {
        if (err) {
          console.error('Error fetching cart count:', err);
          res.locals.cartCount = 0;
        } else {
          res.locals.cartCount = results[0].cartCount || 0;
        }
        next();
      });
    } catch (error) {
      console.error('Error fetching cart count:', error);
      res.locals.cartCount = 0;
      next();
    }
  } else {
    res.locals.cartCount = 0;
    next();
  }
});

app.use((req, res, next) => {
  if (!req.session || !req.session.user) {
    res.locals.cartCount = 0;
  }
  next();
});



// app.use((req, res, next) => {
//   if (!req.session.cart) {
//     req.session.cart = [];
//   }
//   next();
// });

// Middleware to Initialize Session Cart and Mock User
app.use((req, res, next) => {
  // Ensure the cart exists in the session
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Mock user for testing purposes (remove in production)
  // if (!req.user) {
  //   req.user = { id: 3 }; // Replace with an actual user ID for testing
  // }

  next();
});



app.use(flash());

app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});










const stripe = require('stripe')('sk_test_51QaL7GJ0WDYVigF0m9AJOtHHHzuPeJ3Pw26ZttcT7xztaYzruRiWttiksqsSQgn7EDBTU6qxjGnhmweFsWmnKebf00YZbCDwzG');
// app.post('/create-checkout-session', async (req, res) => {
//   try {
//     const { products } = req.body;

//     if (!products || !Array.isArray(products)) {
//       return res.status(400).json({ error: 'Invalid products data' });
//     }

//     const lineItems = products.map((product) => ({
//       price_data: {
//         currency: 'SGD',
//         product_data: {
//           name: product.productName,
//           // Images: upload/product.productImage
          
//         },
//         unit_amount: Math.round(product.productPrice * 100),
//       },
//       quantity: product.cartProductQuantity,
//     }));

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card','grabpay','paynow', 'alipay'],
//       line_items: lineItems,
//       mode: 'payment',
//       success_url: `${req.protocol}://${req.get('host')}/success`,
//       cancel_url: `${req.protocol}://${req.get('host')}/cart`,
//     });

//     res.json({ sessionId: session.id });
//   } catch (error) {
//     console.error('Error creating Stripe session:', error);
//     res.status(500).json({ error: 'Failed to create Stripe checkout session' });
//   }
// });









const publicHost = "https://42b7-118-200-107-34.ngrok-free.app";


// app.post('/create-checkout-session', async (req, res) => {
//   try {
//     const { products } = req.body;

//     if (!products || !Array.isArray(products)) {
//       return res.status(400).json({ error: 'Invalid products data' });
//     }

//     const lineItems = products.map(product => {
//       const imageUrl = `${publicHost}/uploads/${encodeURIComponent(product.productImage)}`;
//       return {
//         price_data: {
//           currency: 'sgd',
//           product_data: {
//             name: product.productName,
//             images: [imageUrl],
//           },
//           unit_amount: Math.round(product.productPrice * 100),
//         },
//         quantity: product.cartProductQuantity,
//       };
//     });
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card', 'grabpay', 'paynow', 'alipay', 'paypal'],
//       line_items: lineItems,
//       mode: 'payment',
//       // success_url: `${req.protocol}://${req.get('host')}/success`,
//       success_url: `${req.protocol}://${req.get('host')}/success/{CHECKOUT_SESSION_ID}`,
//       cancel_url: `${req.protocol}://${req.get('host')}/cart`,
//     });

//     res.json({ sessionId: session.id });
//   } catch (error) {
//     console.error('Error creating Stripe session:', error);
//     res.status(500).json({ error: 'Failed to create Stripe checkout session' });
//   }
// });


app.post('/create-checkout-session', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid products data' });
    }

    const lineItems = products.map(product => {
      const imageUrl = `${publicHost}/uploads/${encodeURIComponent(product.productImage)}`;
      return {
        price_data: {
          currency: 'sgd', // Ensure SGD is supported for PayPal
          product_data: {
            name: product.productName,
            images: [imageUrl],
          },
          unit_amount: Math.round(product.productPrice * 100),
        },
        quantity: product.cartProductQuantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'grabpay', 'paynow', 'alipay'], 
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/success/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cart`,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: 'Failed to create Stripe checkout session' });
  }
});











app.get('/', controller.getHomepage);

app.get('/login', controller.renderLoginPage);
app.post('/login', validateLogin, controller.login);

app.get('/signup', controller.signup);
app.post('/signup', validateRegistration, controller.signup);

app.get('/homepage', controller.getHomepage);

app.get('/user_profile', userProfileController.renderProfile);
app.post('/user_profile', userProfileController.updateProfile);
app.post('/user_profile/update_picture', upload.single('image'), userProfileController.updateProfilePicture);

app.get('/forget_password', controller.renderForgetPassword);
app.post('/forget_password', controller.resetPassword);

app.post('/logout', controller.logout);



// Admin routes
// USERS
app.get('/admin_dashboard', checkAdmin, controller.adminDashboard);
app.get('/admin/users', checkAdmin, adminUserController.getAllUsers);
app.post('/admin/users', upload.single('image'), checkAdmin, adminUserController.addUser);
app.post('/admin/users/:id/update', upload.single('image'), checkAdmin, adminUserController.updateUser);
app.get('/admin/users/:id/delete', checkAdmin, adminUserController.deleteUser);

app.get('/admin_profile', checkAdmin, adminProfileController.renderAdminProfile);
app.post('/admin_profile', checkAdmin, adminProfileController.updateAdminProfile);
app.post('/admin_profile/update_picture', upload.single('image'), checkAdmin, adminProfileController.updateAdminProfilePicture);


// ADMIN CATEGORY
app.get('/admin/categories', checkAdmin, adminCategoryController.viewCategories);
app.post('/admin/categories/add', upload.single('categoryImage'), checkAdmin, adminCategoryController.addCategory);
app.post('/admin/categories/:id/update', upload.single('categoryImage'), checkAdmin, adminCategoryController.updateCategory); // Update an existing category
app.get('/admin/categories/:id/delete', checkAdmin, adminCategoryController.deleteCategory); // Delete a category


// ADMIN PRODUCTS
app.get('/admin/products', checkAdmin, adminProductController.viewProducts);
app.post('/admin/products/add', upload.single('productImage'), checkAdmin, adminProductController.addProduct);
app.post('/admin/products/:id/update', upload.single('productImage'), checkAdmin, adminProductController.updateProduct);
app.get('/admin/products/:id/delete', checkAdmin, adminProductController.deleteProduct);


//ADMIN ORDERS 
app.get('/admin/orders', checkAdmin, adminOrdersController.getAdminOrders);
app.post('/admin/orders/update', checkAdmin, adminOrdersController.updateOrderStatus);

//ADMIN REPORTS 
app.get('/admin/report', checkAdmin, controller.getAdminReport);

app.get("/admin/download-report", controller.downloadAdminReport);




// User routes
app.get('/categories', controller.getCategories);
app.get('/products/:categoryId', controller.getProductsByCategory);


// USER CART 
app.post('/cart/add/:productId', cartController.addToCart);
app.get('/cart', cartController.renderShoppingCart);
app.get('/cart_copy', cartController.renderShoppingCart);
app.post('/product/:id/update', cartController.updateQuantity);
app.get('/product/:id/delete', cartController.deleteShoppingCartItem);
app.get('/product/:id', cartController.renderProduct);



app.get('/success/:sessionId', controller.renderSuccessPage);

// app.get('/success/:paymentId', (req, res) => {
//   const { paymentId } = req.params;

//   if (!paymentId) {
//     return res.status(400).send('Invalid payment ID.');
//   }

//   res.render('success');
// });



app.get('/orders', controller.getOrders);
app.get('/order_history', controller.getOrderHistory);

app.get('/productdescription/:id', controller.getProductDetails);

app.get('/allproducts', controller.getAllProducts);

app.get('/search', controller.searchProducts);

app.post('/submit-review', upload.single('reviewImage'), controller.submitReview);

// app.get('/download-admin-report', controller.downloadAdminReport);

//errors
app.get('/401', (req, res) => {
  res.render('401', { errors: req.flash('error') });
});


app.listen(3000, () => console.log('Server started on http://localhost:3000'));
