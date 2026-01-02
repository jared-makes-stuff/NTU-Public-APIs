const cron = require('node-cron');
const { addJob } = require('../queue/client');
const logger = require('../utils/logger');

function startScheduler() {
  logger.info('Starting Cron Scheduler');

  // Run every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Cron: Triggering Hourly Metadata Scrape');
    try {
      await addJob('scrape-metadata', { triggerNext: true });
    } catch (err) {
      logger.error('Cron: Failed to add job', err);
    }
  });
}

// If run directly
if (require.main === module) {
  startScheduler();
}

module.exports = {
  startScheduler,
};
