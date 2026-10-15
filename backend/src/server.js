// Fix local ISP DNS timeout for MongoDB Atlas shard hostnames
const { setupDnsFallback } = require('./dns-resolver');
setupDnsFallback();

const path = require('path');
// .env lives in backend/src/.env (same folder as this file)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 30000;

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Missing MONGO_URI or JWT_SECRET. Copy src/.env.example to src/.env and fill it in.');
  process.exit(1);
}

function findDnsError(error) {
  const pending = [error];
  const seen = new Set();

  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    if (current.code === 'ENOTFOUND' || current.code === 'EAI_AGAIN') return current;
    if (current.cause) pending.push(current.cause);
    if (current.reason && typeof current.reason === 'object') pending.push(current.reason);

    const servers = current.reason && current.reason.servers;
    if (servers instanceof Map) {
    for (const server of servers.values()) {
      if (server.error) pending.push(server.error);
    }
    }
  }

  return null;
}

async function connectToMongo() {
  let attempt = 0;

  while (true) {
    try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    return;
    } catch (err) {
    attempt += 1;
    console.error('MongoDB connection failed:', err.message);

    const dnsError = findDnsError(err);
    if (dnsError) {
      console.error(
        `MongoDB DNS lookup failed (${dnsError.code}). Check the exact hostname in src/.env and your DNS/network. Atlas IP access rules do not fix DNS lookup failures.`
      );
    }

    const delay = Math.min(RETRY_DELAY_MS * 2 ** Math.min(attempt - 1, 3), MAX_RETRY_DELAY_MS);
    console.error(`Retrying MongoDB connection in ${delay / 1000} seconds (attempt ${attempt + 1}).`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

connectToMongo().then(() => {
  // 0.0.0.0 so a phone on the same Wi-Fi can reach the API
  app.listen(PORT, '0.0.0.0', () => console.log(`Vedakaru API running on port ${PORT}`));
});
