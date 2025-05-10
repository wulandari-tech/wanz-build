const app = require('./app');
const config = app.get('config'); // Ambil config dari app

const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`WanzOFC Site Builder server running on port ${PORT}`);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => { process.exit(1); });
});
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => { console.log('💥 Process terminated!'); });
});