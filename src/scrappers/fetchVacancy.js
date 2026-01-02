const logger = require('../utils/logger');

/**
 * Fetch vacancy information from NTU Vacancy Service API
 * @param {string} courseCode - Course code (e.g., 'SC2103')
 * @returns {Promise<string>} HTML response from the vacancy API
 */
async function fetchVacancy(courseCode) {
  const url = 'https://wish.wis.ntu.edu.sg/webexe/owa/aus_vacancy.check_vacancy2';
  
  try {
    logger.info(`Fetching vacancy for course: ${courseCode}`);
    
    const formData = {
      subj: courseCode.trim().toUpperCase()
    };
    
    // Use custom headers for vacancy endpoint (as per NTU requirements)
    const { httpClient } = require('./httpClient');
    const response = await httpClient.post(url, new URLSearchParams(formData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://wish.wis.ntu.edu.sg/webexe/owa/aus_vacancy.check_vacancy',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    logger.info(`Successfully fetched vacancy data for ${courseCode}`);
    return response.data;
    
  } catch (error) {
    logger.error(`Failed to fetch vacancy for ${courseCode}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  fetchVacancy
};
