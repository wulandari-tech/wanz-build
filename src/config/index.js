require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1d',
  },
  session: {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // true di produksi (HTTPS)
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 hari
    }
  },
  isProduction: process.env.NODE_ENV === 'production'
};

if (!config.mongodbUri || !config.jwt.secret || !config.session.secret) {
  console.error("FATAL ERROR: Missing required environment variables (MONGODB_URI, JWT_SECRET, SESSION_SECRET).");
  process.exit(1);
}

module.exports = config;