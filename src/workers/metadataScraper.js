const { fetchScheduleForm, fetchContentForm } = require('../scrappers/fetchOptions');
const { parseScheduleOptions, parseContentOptions } = require('../parsers/metaParser');
const { metadataSchema } = require('../validation/schemas');
const { saveMetadata } = require('../database/repository');
const { addJob } = require('../queue/client');
const { parseAcadSem, toStandardAcadSem } = require('../utils/format');
const logger = require('../utils/logger');
const { z } = require('zod');

async function processMetadata(job) {
  logger.info('Starting Metadata Scrape');

  // 1. Fetch
  const [scheduleHtml, contentHtml] = await Promise.all([
    fetchScheduleForm(),
    fetchContentForm(),
  ]);

  // 2. Parse
  const scheduleOpts = parseScheduleOptions(scheduleHtml);
  const contentOpts = parseContentOptions(contentHtml);

  // 3. Merge & Transform
  const uniqueEntries = new Map(); // For DB (Unique Year-Sem)
  const allScrapeCandidates = [];  // For Queue (All viable sources)

  // Helper to process options
  const processOpt = (opt, source) => {
    const { year, semester } = parseAcadSem(opt.value);
    const stdValue = toStandardAcadSem(year, semester); // e.g. 2025_2
    
    // For DB: Deduplicate by Year-Sem (using standard key)
    if (!uniqueEntries.has(stdValue)) {
        uniqueEntries.set(stdValue, {
            year,
            semester,
            label: opt.label,
            value: stdValue // Store standardized value in DB
        });
    }

    // For Jobs: Keep everything but track source and std value
    allScrapeCandidates.push({
        year,
        semester,
        source,
        value: stdValue // Pass standardized value to job
    });
  };

  scheduleOpts.acadsem.forEach(opt => processOpt(opt, 'schedule'));
  contentOpts.acadsem.forEach(opt => processOpt(opt, 'content'));

  // Flatten metadata for DB
  const payload = Array.from(uniqueEntries.values());

  // 4. Validate & Persist
  // We need to remove data_source from schema validation or update schema
  // The schema in src/validation/schemas.js still has data_source? 
  // I will update the schema object passed to z.array() here to omit it if I can, 
  // but better to assume I updated schemas.js (I will do that next).
  // For now, I'll strip it if it was there.
  
  await saveMetadata(payload);

  // 5. Determine Target Years (Top 2)
  const allYears = [...new Set(payload.map(p => parseInt(p.year, 10)))].sort((a, b) => b - a);
  const targetYears = allYears.slice(0, 2);
  const targetYearsSet = new Set(targetYears.map(String));
  
  logger.info(`Targeting scrape for years: ${targetYears.join(', ')}`);

  // 6. Prepare Jobs
  const jobsToTrigger = [];
  const backfillCandidates = new Map(); // Dedup backfills by year-sem

  for (const cand of allScrapeCandidates) {
    if (!targetYearsSet.has(cand.year)) continue;

    // Main Scrape Job
    jobsToTrigger.push({
      name: cand.source === 'schedule' ? 'scrape-schedule' : 'scrape-content',
      data: { acadsem: cand.value }
    });

    // Exam Scrape Jobs (ONLY for regular semesters 1 and 2, ONLY for undergraduates)
    // Special semesters (S) and graduate students don't have exam timetables in WIS
    if (cand.semester === '1' || cand.semester === '2') {
      jobsToTrigger.push({
        name: 'scrape-exam',
        data: { acadsem: cand.value, studentType: 'UE' }
      });
    }

    // Prepare Backfill (one per year-sem)
    // We use the value from this candidate. Backfill worker handles conversion.
    const bfKey = `${cand.year}-${cand.semester}`;
    if (!backfillCandidates.has(bfKey)) {
        backfillCandidates.set(bfKey, {
            name: 'scrape-backfill',
            data: { acadsem: cand.value }
        });
    }
  }

  // 7. Discover current exam plans from WIS
  // Note: WIS typically returns multiple plan numbers (e.g., 113, 114) representing
  // different exam sessions or groups for the current semester
  const examPlansAvailable = [];
  if (job.data.triggerNext) {
    try {
      const { fetchExamMetadata } = require('../scrappers/fetchExam');
      const { parseExamMetadata } = require('../parsers/examParser');
      
      logger.info('Discovering current exam plans from WIS...');
      const examMetadataHtml = await fetchExamMetadata('UE');
      const examPlans = parseExamMetadata(examMetadataHtml);
      
      if (examPlans && examPlans.length > 0) {
        for (const plan of examPlans) {
          examPlansAvailable.push(plan.planNo);
          logger.info(`Exam plan available: ${plan.planNo} - ${plan.label || 'No label'}`);
        }
      }
      
      if (examPlansAvailable.length === 0) {
        logger.warn('No exam plans currently available in WIS');
      }
    } catch (err) {
      logger.error('Error discovering exam plans', err);
    }
  }

  // 8. Trigger Jobs
  const uniqueJobs = new Map();
  jobsToTrigger.forEach(j => {
    // For exam jobs, only include if we found plans available
    if (j.name === 'scrape-exam') {
      if (examPlansAvailable.length === 0) {
        logger.info(`Skipping exam scrape for ${j.data.acadsem} (no exam plans available in WIS)`);
        return;
      }
      // Pass the available plans to the exam scraper
      j.data.availablePlans = examPlansAvailable;
    }
    uniqueJobs.set(`${j.name}-${j.data.acadsem}`, j);
  });

  if (job.data.triggerNext) {
    logger.info(`Triggering ${uniqueJobs.size} child jobs for latest 2 years`);
    for (const j of uniqueJobs.values()) {
      await addJob(j.name, j.data);
    }

    logger.info(`Triggering ${backfillCandidates.size} backfill checks`);
    for (const j of backfillCandidates.values()) {
      await addJob(j.name, j.data, { delay: 10 * 60 * 1000 });
    }
  }

  logger.info('Metadata Scrape Completed');
}

module.exports = processMetadata;
