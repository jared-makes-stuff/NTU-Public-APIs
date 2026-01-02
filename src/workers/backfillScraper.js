const { fetchCourseContent } = require('../scrappers/fetchContent');
const { fetchCourseSchedule } = require('../scrappers/fetchSchedule');
const { parseContent } = require('../parsers/contentParser');
const { parseSchedule } = require('../parsers/scheduleParser');
const { courseContentSchema, courseScheduleSchema } = require('../validation/schemas');
const { saveCourseContent, saveCourseSchedule, getCourseCodes } = require('../database/repository');
const logger = require('../utils/logger');
const { z } = require('zod');

async function processBackfill(job) {
  const acadsem = job.data.acadsem; 
  if (!acadsem) throw new Error('acadsem is missing');

  logger.info(`Starting Backfill Check for ${acadsem}`);

  // 1. Get existing codes (DB uses standard YYYY_S)
  const scheduleCodes = await getCourseCodes('course_schedule', acadsem);
  const contentCodes = await getCourseCodes('course_content', acadsem);

  logger.info(`Stats: Schedule has ${scheduleCodes.size} courses, Content has ${contentCodes.size} courses`);

  // 2. Identify Missing
  const missingInContent = [...scheduleCodes].filter(code => !contentCodes.has(code));
  const missingInSchedule = [...contentCodes].filter(code => !scheduleCodes.has(code));

  // 3. Backfill Content
  if (missingInContent.length > 0) {
    logger.info(`Backfilling ${missingInContent.length} courses missing in Content`);
    for (const code of missingInContent) {
      try {
        // Fetcher handles NTU format conversion if needed
        const html = await fetchCourseContent({ acadsem, rSubjCode: code, boption: 'Search' });
        const courses = parseContent(html, acadsem);
        if (courses.length) {
          const validated = z.array(courseContentSchema).parse(courses);
          await saveCourseContent(validated);
        }
      } catch (err) {
        logger.error(`Failed backfill content for ${code}`, err);
      }
    }
  }

  // 4. Backfill Schedule
  if (missingInSchedule.length > 0) {
    logger.info(`Backfilling ${missingInSchedule.length} courses missing in Schedule`);
    for (const code of missingInSchedule) {
      try {
        // Fetcher handles NTU format conversion
        const html = await fetchCourseSchedule({ acadsem, rSubjCode: code, boption: 'Search' });
        const courses = parseSchedule(html, acadsem);
        if (courses.length) {
          const validated = z.array(courseScheduleSchema).parse(courses);
          await saveCourseSchedule(validated);
        }
      } catch (err) {
        logger.error(`Failed backfill schedule for ${code}`, err);
      }
    }
  }

  logger.info(`Backfill Completed for ${acadsem}`);
}

module.exports = processBackfill;
