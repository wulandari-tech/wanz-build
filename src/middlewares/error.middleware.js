const config = require('../config');

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.message = err.message || 'Something went very wrong!';

  console.error('ERROR 💥:', err.name, err.message, err.stack);

  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: config.isProduction ? undefined : err.stack
    });
  }

  res.status(err.statusCode).render('pages/errors/500', {
    title: `Error ${err.statusCode} - WanzOFC Site Builder`,
    layout: 'layouts/main', // Pastikan layout digunakan untuk error page
    message: err.message,
    statusCode: err.statusCode,
    stack: config.isProduction ? undefined : err.stack
  });
};

const catchAsync = fn => (req, res, next) => fn(req, res, next).catch(next);

module.exports = { globalErrorHandler, catchAsync };