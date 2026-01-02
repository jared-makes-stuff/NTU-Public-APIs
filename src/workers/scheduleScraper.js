const { fetchCourseSchedule } = require('../scrappers/fetchSchedule');
const { parseSchedule } = require('../parsers/scheduleParser');
const { courseScheduleSchema } = require('../validation/schemas');
const { saveCourseSchedule } = require('../database/repository');
const logger = require('../utils/logger');
const { z } = require('zod');

async function processSchedule(job) {
  const { acadsem } = job.data;
  if (!acadsem) throw new Error('acadsem is missing in job data');

  logger.info(`Starting Schedule Scrape for ${acadsem}`);

  // 1. Fetch
  const html = await fetchCourseSchedule({
    acadsem,
    boption: 'Search',
    rSubjCode: '', // Empty means all
    rSearchType: 'F',
  });

  // 2. Parse
  const rawCourses = parseSchedule(html, acadsem);
  logger.info(`Parsed ${rawCourses.length} courses with schedules for ${acadsem}`);

  if (rawCourses.length === 0) {
    logger.warn(`No schedules found for ${acadsem}.`);
    return;
  }

  // 3. Validate
  const validated = z.array(courseScheduleSchema).parse(rawCourses);

  // 4. Persist
  await saveCourseSchedule(validated);

  logger.info(`Schedule Scrape Completed for ${acadsem}`);
}

module.exports = processSchedule;
