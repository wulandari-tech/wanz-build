const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');

const appConfig = require('./config'); // ganti nama variabel
const { globalErrorHandler } = require('./middlewares/error.middleware');

const viewIndexRoutes = require('./routes/view/index.routes');
const viewAuthRoutes = require('./routes/view/auth.routes');
const viewDashboardRoutes = require('./routes/view/dashboard.routes');
// const apiAuthRoutes = require('./routes/api/auth.routes'); // Nonaktifkan API jika tidak dipakai
// const apiWebsiteRoutes = require('./routes/api/website.api.routes'); // Nonaktifkan API jika tidak dipakai
const siteRoutes = require('./routes/site.routes');

const app = express();
app.set('config', appConfig); // Simpan config di app instance

mongoose.connect(appConfig.mongodbUri)
  .then(() => console.log('MongoDB Connected to WanzOFC Site Builder DB...'))
  .catch(err => { console.error('MongoDB Connection Error:', err); process.exit(1); });

app.use(expressLayouts);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session(appConfig.session));
app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  // req.user dari protectView akan ada di sini
  // Kita set di protectView menjadi res.locals.currentUser
  // res.locals.currentUser = req.user || null; // Ini sudah dihandle di protectView
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', viewIndexRoutes);
app.use('/auth', viewAuthRoutes);
app.use('/dashboard', viewDashboardRoutes);
// app.use('/api/v1/auth', apiAuthRoutes);
// app.use('/api/v1/websites', apiWebsiteRoutes);

// Rute untuk website pengguna, pastikan ini di bawah rute aplikasi builder
// Gunakan prefix agar tidak bentrok, misal /s/ untuk sites
app.use('/s', siteRoutes);


app.use((req, res, next) => {
  const error = new Error(`Woops! The page you are looking for at '${req.originalUrl}' was not found on WanzOFC Site Builder.`);
  error.statusCode = 404;
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found.' });
  }
  res.status(404).render('pages/errors/404', {
    title: '404 Not Found - WanzOFC Site Builder',
    layout: 'layouts/main',
    message: error.message,
    statusCode: 404
  });
});

app.use(globalErrorHandler);

module.exports = app;