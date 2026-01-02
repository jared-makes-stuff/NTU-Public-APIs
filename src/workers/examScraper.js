/**
 * Worker for scraping exam timetable data
 * Orchestrates fetching exam data for all available plans
 */
const { fetchExamMetadata, fetchExamPlanDetails, fetchExamDetails } = require('../scrappers/fetchExam');
const { parseExamMetadata, parseExamDetails } = require('../parsers/examParser');
const { saveExamTimetable } = require('../database/repository');
const { toStandardAcadSem } = require('../utils/format');
const logger = require('../utils/logger');

/**
 * Main worker function for exam timetable scraping
 * @param {object} job - Job data from queue
 * @param {string} job.data.acadsem - Academic semester (e.g., "2025_1")
 * @param {string} job.data.studentType - 'UE' for undergraduate, '' for graduate
 * @param {Array} job.data.availablePlans - Array of available plan numbers from WIS
 */
async function examScraper(job) {
  const { acadsem, studentType = 'UE', availablePlans = [] } = job.data;
  const studentTypeLabel = studentType === 'UE' ? 'Undergraduate' : 'Graduate';
  
  try {
    logger.info(`Starting exam scraper for ${acadsem} (${studentTypeLabel})`);
    
    // If no plans were provided, try to discover them
    let plansToTry = availablePlans;
    if (plansToTry.length === 0) {
      logger.info('No plans provided, fetching from WIS...');
      const metadataHtml = await fetchExamMetadata(studentType);
      const examPlans = parseExamMetadata(metadataHtml);
      plansToTry = examPlans.map(p => p.planNo);
    }
    
    if (plansToTry.length === 0) {
      logger.warn(`No exam plans available for ${acadsem} (${studentTypeLabel})`);
      return { success: false, message: 'No exam plans available' };
    }
    
    logger.info(`Found ${plansToTry.length} exam plans to try: ${plansToTry.join(', ')}`);
    
    // Try each plan and collect all exam records
    let allExams = [];
    let successfulPlan = null;
    
    for (const planNo of plansToTry) {
      try {
        logger.info(`Trying plan ${planNo}...`);
        
        // Fetch plan details to get academic session info
        const planDetailsHtml = await fetchExamPlanDetails(planNo, studentType);
        const planDetails = parseExamMetadata(planDetailsHtml);
        
        if (!planDetails || planDetails.length === 0) {
          logger.warn(`Could not get details for plan ${planNo}`);
          continue;
        }
        
        const planInfo = planDetails[0];
        
        // Check if this plan matches our target semester
        if (planInfo.examYear && planInfo.semester) {
          const planAcadsem = toStandardAcadSem(planInfo.examYear, planInfo.semester);
          
          if (planAcadsem !== acadsem) {
            logger.info(`Plan ${planNo} is for ${planAcadsem}, skipping (looking for ${acadsem})`);
            continue;
          }
        }
        
        logger.info(`Plan ${planNo} matches ${acadsem}, fetching exam details...`);
        
        // Fetch exam timetable for this plan
        const detailsHtml = await fetchExamDetails({
          academicSession: planInfo.academicSession || '',
          planNo: planInfo.planNo || planNo,
          examYear: planInfo.examYear || '',
          semester: planInfo.semester || '',
          studentType
        });
        
        // Parse exam details
        const exams = parseExamDetails(detailsHtml, acadsem, studentType);
        
        if (exams.length > 0) {
          logger.info(`Plan ${planNo} returned ${exams.length} exams`);
          allExams.push(...exams);
          successfulPlan = planInfo;
        }
        
      } catch (err) {
        logger.warn(`Error processing plan ${planNo}:`, err.message);
        // Continue to next plan
      }
    }
    
    if (allExams.length === 0) {
      logger.warn(`No exam data found for ${acadsem} (${studentTypeLabel})`);
      return { success: true, message: 'No exams found', count: 0 };
    }
    
    // Save all collected exams
    logger.info(`Saving ${allExams.length} exam records to database...`);
    await saveExamTimetable(
      allExams,
      successfulPlan?.academicSession || `Exams for ${acadsem}`,
      plansToTry.join(',')
    );
    
    logger.info(`Exam scraping completed for ${acadsem} (${studentTypeLabel}): ${allExams.length} exams`);
    return { success: true, count: allExams.length };
    
  } catch (err) {
    logger.error(`Error in exam scraper for ${acadsem} (${studentTypeLabel})`, err);
    throw err;
  }
}

/**
 * Scrapes exam timetables for both undergraduate and graduate students
 * @param {string} acadsem - Academic semester (e.g., "2025_1")
 */
async function scrapeExamsForSemester(acadsem) {
  logger.info(`Scraping exams for semester: ${acadsem}`);
  
  const results = {
    undergraduate: null,
    graduate: null
  };
  
  // Scrape undergraduate exams
  try {
    results.undergraduate = await examScraper({
      data: { acadsem, studentType: 'UE' }
    });
  } catch (err) {
    logger.error('Error scraping undergraduate exams', err);
    results.undergraduate = { success: false, error: err.message };
  }
  
  // Scrape graduate exams
  try {
    results.graduate = await examScraper({
      data: { acadsem, studentType: '' }
    });
  } catch (err) {
    logger.error('Error scraping graduate exams', err);
    results.graduate = { success: false, error: err.message };
  }
  
  logger.info(`Exam scraping completed for ${acadsem}`, results);
  return results;
}

module.exports = {
  examScraper,
  scrapeExamsForSemester
};
