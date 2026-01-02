const { createWorker } = require('../queue/client');
const processMetadata = require('./metadataScraper');
const processContent = require('./contentScraper');
const processSchedule = require('./scheduleScraper');
const processBackfill = require('./backfillScraper');
const { examScraper } = require('./examScraper');
const logger = require('../utils/logger');

function startWorkers() {
  logger.info('Initializing Workers...');

  createWorker(async (job) => {
    if (job.name === 'scrape-metadata') {
      return processMetadata(job);
    } else if (job.name === 'scrape-content') {
      return processContent(job);
    } else if (job.name === 'scrape-schedule') {
      return processSchedule(job);
    } else if (job.name === 'scrape-backfill') {
      return processBackfill(job);
    } else if (job.name === 'scrape-exam') {
      return examScraper(job);
    }
  });
  
  logger.info('Workers listening for jobs');
}

module.exports = {
  startWorkers,
};
