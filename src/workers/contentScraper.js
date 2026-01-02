const { fetchCourseContent } = require('../scrappers/fetchContent');
const { parseContent } = require('../parsers/contentParser');
const { courseContentSchema } = require('../validation/schemas');
const { saveCourseContent } = require('../database/repository');
const logger = require('../utils/logger');
const { z } = require('zod');

async function processContent(job) {
  const { acadsem } = job.data;
  if (!acadsem) throw new Error('acadsem is missing in job data');

  logger.info(`Starting Content Scrape for ${acadsem}`);

  // 1. Fetch (Search Mode to get ALL)
  const html = await fetchCourseContent({
    acadsem,
    boption: 'Search',
    rSubjCode: '', // Empty means all
  });

  // 2. Parse
  const rawCourses = parseContent(html, acadsem);
  logger.info(`Parsed ${rawCourses.length} courses for ${acadsem}`);

  if (rawCourses.length === 0) {
    logger.warn(`No courses found for ${acadsem}. Check if sem is valid.`);
    return;
  }

  // 3. Validate
  // Some parsing might yield empty strings where schema expects something else.
  // Transform empty strings to nulls if needed, or rely on schema.
  // Our schema expects strings for most fields, so raw strings are fine.
  // au might be null.
  
  const validated = z.array(courseContentSchema).parse(rawCourses);

  // 4. Persist
  await saveCourseContent(validated);

  logger.info(`Content Scrape Completed for ${acadsem}`);
}

module.exports = processContent;
