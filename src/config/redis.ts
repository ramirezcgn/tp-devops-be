import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // password: process.env.REDIS_PASS, // descomenta si usas autenticación
  family: 0, // 4 (IPv4) o 6 (IPv6)
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready to accept commands');
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

export default redis;
