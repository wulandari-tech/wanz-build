// src/app.js

// Core Node.js modules
const path = require('path');

// Third-party modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // For persistent sessions
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');

// Application-specific modules
const appConfig = require('./config'); // Load application configuration
const { globalErrorHandler } = require('./middlewares/error.middleware'); // Global error handler

// Route imports
const viewIndexRoutes = require('./routes/view/index.routes');
const viewAuthRoutes = require('./routes/view/auth.routes');
const viewDashboardRoutes = require('./routes/view/dashboard.routes');
// const apiAuthRoutes = require('./routes/api/auth.routes'); // Uncomment if API routes are needed
// const apiWebsiteRoutes = require('./routes/api/website.api.routes'); // Uncomment if API routes are needed
const siteRoutes = require('./routes/site.routes'); // Routes for user-created websites

// Initialize Express app
const app = express();

// Store config in app instance for access in other parts (e.g., controllers, middlewares)
app.set('config', appConfig);

// --- Database Connection ---
// Establish MongoDB connection early.
// The `mongooseConnectionPromise` can be used by MongoStore if desired,
// though MongoStore can also create its own connection via `mongoUrl`.
const mongooseConnectionPromise = mongoose.connect(appConfig.mongodbUri)
  .then((m) => {
    console.log('MongoDB Connected to WanzOFC Site Builder DB...');
    return m.connection; // Return the Mongoose connection object for potential reuse
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    console.error('Exiting application due to database connection failure.');
    process.exit(1); // Exit if database connection fails
  });

// --- View Engine Setup (EJS) ---
app.use(expressLayouts); // Enable EJS layouts
app.set('layout', './layouts/main'); // Specify the default layout file
app.set('view engine', 'ejs'); // Set EJS as the templating engine
app.set('views', path.join(__dirname, 'views')); // Define the directory for view files

// --- Core Middlewares ---
// Enable CORS (Cross-Origin Resource Sharing) - configure appropriately for production
app.use(cors({
    origin: '*', // Be more specific in production, e.g., 'https://yourfrontenddomain.com'
    credentials: true // If you need to send cookies across domains
}));

// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies (e.g., from HTML forms)
app.use(express.urlencoded({ extended: true }));
// Parse cookies attached to the client request
app.use(cookieParser());

// --- Session Management (with MongoStore for persistence) ---
app.use(session({
  secret: appConfig.session.secret, // Secret used to sign the session ID cookie
  resave: appConfig.session.resave, // Don't save session if unmodified
  saveUninitialized: appConfig.session.saveUninitialized, // Don't create session until something stored
  store: MongoStore.create({ // Use MongoStore for persistent session storage
    mongoUrl: appConfig.mongodbUri, // MongoDB connection string
    // clientPromise: mongooseConnectionPromise, // Optional: Reuse existing Mongoose connection
    collectionName: 'app_sessions', // Custom name for the sessions collection in MongoDB
    ttl: 14 * 24 * 60 * 60, // Session TTL (Time To Live) in seconds (e.g., 14 days)
    autoRemove: 'native', // Use MongoDB's native TTL feature to remove expired sessions
    crypto: { // Optional: Encrypt session data in the database
        // secret: appConfig.session.encryptionSecret || 'fallback-secret-for-session-encryption' // Provide a strong secret
    }
  }),
  cookie: appConfig.session.cookie // Configure session cookie properties (secure, httpOnly, maxAge)
}));

// --- Flash Messages ---
// Enable flash messages (requires session middleware)
app.use(flash());

// --- Global Variables for Views (EJS) ---
// Middleware to make flash messages and user data available in all EJS templates
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error'); // General error flash
  // `req.user` is set by `protectView` middleware upon successful authentication.
  // `currentUser` is a safer name to use in `res.locals` to avoid potential conflicts.
  res.locals.currentUser = req.user || null;
  res.locals.currentYear = new Date().getFullYear(); // Make current year available
  res.locals.appName = "WanzOFC Site Builder"; // Application name
  next();
});

// --- Static Assets ---
// Serve static files (CSS, client-side JavaScript, images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// --- Application Routes ---

// View routes for the main application (builder interface)
app.use('/', viewIndexRoutes); // Landing page, etc.
app.use('/auth', viewAuthRoutes); // Login, register, logout
app.use('/dashboard', viewDashboardRoutes); // User dashboard, website editor

// API routes (if your frontend EJS pages make AJAX calls, or for a separate SPA/mobile app)
// app.use('/api/v1/auth', apiAuthRoutes);
// app.use('/api/v1/websites', apiWebsiteRoutes);

// Routes for serving user-created websites
// IMPORTANT: This should typically be placed after application-specific routes
// to avoid conflicts (e.g., if a user creates a site with slug 'dashboard').
// Using a prefix like '/s/' (for sites) is a good practice.
app.use('/s', siteRoutes);


// --- 404 Not Found Handler ---
// This middleware will catch any requests that don't match any of the defined routes.
app.use((req, res, next) => {
  const error = new Error(`Oops! The page you are looking for at '${req.originalUrl}' was not found on WanzOFC Site Builder.`);
  error.statusCode = 404;

  // Respond with JSON if the request was for an API endpoint
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      status: 'fail',
      message: 'API endpoint not found.'
    });
  }

  // Otherwise, render the 404 EJS page
  res.status(404).render('pages/errors/404', {
    title: '404 Not Found - WanzOFC Site Builder',
    layout: 'layouts/main', // Ensure the main layout is used for the 404 page
    message: error.message,
    statusCode: 404
  });
});

// --- Global Error Handler ---
// This middleware will catch any errors passed to `next(err)` from other parts of the application.
// It MUST be the last piece of middleware defined.
app.use(globalErrorHandler);

// Export the configured Express app
module.exports = app;