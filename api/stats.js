import { createClient } from 'redis';

const REDIS_URL = 'redis://default:M1GzHM33qkdIXBO03AlmbQX7p5aMFS0C@prose-bed-rod-77348.db.redis.io:12512';

let redisClient;

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (error) => console.error('Redis error', error));
  }
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

function keys(projectKey) {
  const cleanKey = String(projectKey || 'default').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  return {
    hash: `${cleanKey}:stats`,
    wallets: `${cleanKey}:wallets`,
  };
}

async function readStats(projectKey) {
  const client = await getRedis();
  const storeKeys = keys(projectKey);
  const [stored, walletsConnected] = await Promise.all([
    client.hGetAll(storeKeys.hash),
    client.sCard(storeKeys.wallets),
  ]);

  const metrics = {};
  for (const [key, value] of Object.entries(stored)) {
    if (key.startsWith('metric:')) metrics[key.slice(7)] = Number(value || 0);
  }

  return {
    walletsConnected,
    totalSignIns: Number(stored.totalSignIns || 0),
    metrics,
    lastUpdatedAt: stored.lastUpdatedAt || null,
  };
}

export default async function handler(req, res) {
  try {
    const projectKey = req.method === 'GET' ? req.query?.projectKey : req.body?.projectKey;
    const client = await getRedis();

    if (req.method === 'GET') {
      return res.status(200).json(await readStats(projectKey));
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const storeKeys = keys(body.projectKey);

      if (body.type === 'wallet_connect') {
        if (body.address) await client.sAdd(storeKeys.wallets, String(body.address).toLowerCase());
        await client.hIncrBy(storeKeys.hash, 'totalSignIns', 1);
      }

      if (body.type === 'snapshot' && body.metrics && typeof body.metrics === 'object') {
        const entries = {};
        for (const [key, value] of Object.entries(body.metrics)) {
          entries[`metric:${key}`] = String(Number(value || 0));
        }
        await client.hSet(storeKeys.hash, entries);
      }

      await client.hSet(storeKeys.hash, 'lastUpdatedAt', new Date().toISOString());
      return res.status(200).json(await readStats(body.projectKey));
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Stats API failed' });
  }
}
