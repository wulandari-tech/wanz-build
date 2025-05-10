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
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  },
  isProduction: process.env.NODE_ENV === 'production',
  appHostname: process.env.APP_HOSTNAME || 'localhost', // Domain utama builder
  cloudflare: {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    mainAppCnameTarget: process.env.MAIN_APP_CNAME_TARGET // Target CNAME untuk subdomain pengguna
  }
};

// Validasi variabel environment penting
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET', 'APP_HOSTNAME'];
if (config.isProduction) { // Cloudflare hanya relevan jika bukan localhost murni
    requiredEnvVars.push('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID', 'MAIN_APP_CNAME_TARGET');
}

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`FATAL ERROR: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

module.exports = config;