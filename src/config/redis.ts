import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // password: process.env.REDIS_PASS, // descomenta si usas autenticación
  family: 0, // 4 (IPv4) o 6 (IPv6)
});

export default redis;
