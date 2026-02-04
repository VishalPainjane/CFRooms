import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// BullMQ requires a standard Redis connection (TCP), not HTTP.
// Using REDIS_URL for the worker connection.
const connection = new Redis(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL?.replace('https://', 'rediss://') || '');

export const submissionQueue = new Queue('submission-checks', {
    connection
});
