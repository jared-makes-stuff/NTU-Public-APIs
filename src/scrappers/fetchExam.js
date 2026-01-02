/**
 * Scraper for NTU Exam Timetable
 * Fetches exam schedule data from WIS (Web Information System)
 */
const { postRequest } = require('./httpClient');
const logger = require('../utils/logger');

const EXAM_BASE_URL = 'https://wis.ntu.edu.sg/webexe/owa/exam_timetable_und';

/**
 * Step 1: Fetch exam metadata (plan number and academic session details)
 * @param {string} studentType - 'UE' for undergraduate, '' for graduate
 * @returns {Promise<string>} HTML response containing plan number and academic details
 */
async function fetchExamMetadata(studentType = 'UE') {
  const url = `${EXAM_BASE_URL}.MainSubmit`;
  const formData = {
    p_type: studentType,
    bOption: 'Next'
  };

  try {
    logger.info(`Fetching exam metadata for student type: ${studentType || 'Graduate'}`);
    const html = await postRequest(url, formData);
    return html;
  } catch (err) {
    logger.error('Error fetching exam metadata', err);
    throw err;
  }
}

/**
 * Step 1.5: Select a specific plan number to get detailed session information
 * @param {string} planNo - Plan number to select
 * @param {string} studentType - 'UE' for undergraduate, '' for graduate
 * @returns {Promise<string>} HTML response containing academic session details for the selected plan
 */
async function fetchExamPlanDetails(planNo, studentType = 'UE') {
  const url = `${EXAM_BASE_URL}.query_page`;
  const formData = {
    p_plan_no: planNo,
    p_type: studentType,
    bOption: 'Next'
  };

  try {
    logger.info(`Fetching exam plan details for plan ${planNo}, student type: ${studentType || 'Graduate'}`);
    const html = await postRequest(url, formData);
    return html;
  } catch (err) {
    logger.error(`Error fetching exam plan details for plan ${planNo}`, err);
    throw err;
  }
}

/**
 * Step 2: Fetch detailed exam timetable
 * @param {object} params - Query parameters
 * @param {string} params.academicSession - e.g., "Semester 1 Academic Year 2025-2026"
 * @param {string} params.planNo - Plan number from step 1
 * @param {string} params.examYear - Exam year (e.g., "2025")
 * @param {string} params.semester - Semester number (e.g., "1" or "2")
 * @param {string} params.studentType - 'UE' for undergraduate, '' for graduate
 * @param {string} params.examDate - Optional filter for exam date
 * @param {string} params.startTime - Optional filter for start time
 * @param {string} params.dept - Optional filter for department
 * @param {string} params.subject - Optional filter for subject
 * @param {string} params.venue - Optional filter for venue
 * @param {string} params.matric - Optional filter for matriculation number
 * @returns {Promise<string>} HTML response containing exam timetable details
 */
async function fetchExamDetails({
  academicSession,
  planNo,
  examYear,
  semester,
  studentType = 'UE',
  examDate = '',
  startTime = '',
  dept = '',
  subject = '',
  venue = '',
  matric = ''
}) {
  const url = `${EXAM_BASE_URL}.Get_detail`;
  const formData = {
    p_exam_dt: examDate,
    p_start_time: startTime,
    p_dept: dept,
    p_subj: subject,
    p_venue: venue,
    p_matric: matric,
    academic_session: academicSession,
    p_plan_no: planNo,
    p_exam_yr: examYear,
    p_semester: semester,
    p_type: studentType,
    bOption: 'Next'
  };

  try {
    logger.info(`Fetching exam details for ${academicSession}, plan: ${planNo}`);
    const html = await postRequest(url, formData);
    return html;
  } catch (err) {
    logger.error('Error fetching exam details', err);
    throw err;
  }
}

module.exports = {
  fetchExamMetadata,
  fetchExamPlanDetails,
  fetchExamDetails
};
