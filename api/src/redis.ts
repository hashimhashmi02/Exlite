import { Redis } from 'ioredis';
import { env } from './env.js';

export const redisSub = new Redis(env.REDIS_URL);
export const redisPub = new Redis(env.REDIS_URL);

redisSub.on('error', (e) => console.error('redisSub error:', e));
redisPub.on('error', (e) => console.error('redisPub error:', e));
