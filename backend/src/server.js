const { createApp } = require('./app');
const { env, assertProdSecrets } = require('./config/env');
const { connectDb, disconnectDb } = require('./config/db');

let server = null;

async function start() {
  assertProdSecrets();
  if (process.env.SKIP_DB !== '1') {
    await connectDb();
    console.log('MongoDB connected');
  } else {
    console.log('SKIP_DB=1 — starting API without database connection');
  }
  const app = createApp();
  server = app.listen(env.port, () => {
    console.log(`CareConnect API listening on :${env.port} (${env.nodeEnv})`);
  });
  return server;
}

// Graceful shutdown: Render (and Docker/K8s) send SIGTERM before replacing
// the instance. Stop accepting new connections, drain in-flight requests,
// then close the DB pool so deploys don't drop or leak work.
async function shutdown(signal) {
  console.log(`Received ${signal} — shutting down gracefully…`);
  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out — forcing exit');
    process.exit(1);
  }, 10000);
  forceExit.unref();
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    await disconnectDb();
    console.log('Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = { start };
