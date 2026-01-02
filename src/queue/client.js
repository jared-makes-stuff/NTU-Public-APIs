const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
require('dotenv').config();

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'scrape-queue';

const scrapeQueue = new Queue(QUEUE_NAME, { connection });

async function addJob(name, data, opts = {}) {
  return scrapeQueue.add(name, data, opts);
}

async function clearQueue() {
  // Clears all jobs from the queue
  await scrapeQueue.obliterate({ force: true });
  logger.info('Queue obliterated (cleared all jobs)');
}

function createWorker(processor, concurrency = 1) {
  const worker = new Worker(QUEUE_NAME, processor, {
    connection,
    concurrency,
    limiter: {
      max: 10, // Rate limit: max 10 jobs per second
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} (${job.name}) failed`, err);
  });

  return worker;
}

module.exports = {
  addJob,
  clearQueue,
  createWorker,
  connection,
};
