const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Parse HTML response from NTU Vacancy Service API to extract vacancy information
 * @param {string} html - HTML response from the vacancy API
 * @param {string} courseCode - Course code being parsed
 * @returns {Object} Object with indexes array and optional error message
 *                   { indexes: [...], error: null } or { indexes: [], error: "message" }
 */
function parseVacancyHtml(html, courseCode) {
  try {
    // Check for alert message (error from NTU)
    const alertMatch = html.match(/alert\s*\(\s*["']([^"']*)["']\s*\)/);
    if (alertMatch) {
      const errorMessage = alertMatch[1].trim();
      logger.warn(`NTU Vacancy Service returned error for ${courseCode}: ${errorMessage}`);
      return { indexes: [], error: errorMessage };
    }
    
    const $ = cheerio.load(html);
    
    // Find the vacancy table
    const table = $('table[border]').first();
    if (!table.length) {
      logger.warn(`No vacancy table found for course ${courseCode}`);
      return { indexes: [], error: null };
    }

    const indexes = [];
    let currentIndex = null;
    
    // Skip header row, process data rows
    const rows = table.find('tr').slice(1);
    
    rows.each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 8) {
        return; // Skip rows with insufficient columns
      }
      
      // Extract cell values
      const indexNum = $(cells[0]).text().trim();
      const vacancyText = $(cells[1]).text().trim();
      const waitlistText = $(cells[2]).text().trim();
      const classType = $(cells[3]).text().trim();
      const group = $(cells[4]).text().trim();
      const day = $(cells[5]).text().trim();
      const time = $(cells[6]).text().trim();
      const venue = $(cells[7]).text().trim();
      
      // Check if this is a new index or continuation of previous
      if (indexNum && indexNum !== '' && indexNum !== '&nbsp;') {
        // New index found
        const vacancy = parseNumber(vacancyText);
        const waitlist = parseNumber(waitlistText);
        
        currentIndex = {
          index: indexNum,
          vacancy,
          waitlist,
          classes: []
        };
        indexes.push(currentIndex);
      }
      
      // Add class session to current index
      if (currentIndex && classType) {
        currentIndex.classes.push({
          type: classType,
          group,
          day,
          time,
          venue
        });
      }
    });
    
    logger.info(`Parsed ${indexes.length} indexes for course ${courseCode}`);
    return { indexes, error: null };
    
  } catch (error) {
    logger.error(`Error parsing vacancy HTML for ${courseCode}: ${error.message}`);
    return { indexes: [], error: `Failed to parse response: ${error.message}` };
  }
}

/**
 * Parse a text value to an integer, defaulting to 0 if invalid
 * @param {string} text - Text to parse
 * @returns {number} Parsed number or 0
 */
function parseNumber(text) {
  try {
    const trimmed = text.trim();
    if (!trimmed || trimmed === '' || trimmed === '&nbsp;' || trimmed === '-' || trimmed === 'N/A') {
      return 0;
    }
    const num = parseInt(trimmed, 10);
    return isNaN(num) ? 0 : num;
  } catch (error) {
    return 0;
  }
}

/**
 * Format index information for human-readable display
 * @param {Object} indexInfo - Index information object
 * @returns {string} Formatted string
 */
function formatIndexDisplay(indexInfo) {
  try {
    const lines = [
      `Index ${indexInfo.index}`,
      `  Vacancies: ${indexInfo.vacancy} | Waitlist: ${indexInfo.waitlist}`,
      '  Classes:'
    ];
    
    indexInfo.classes.forEach(cls => {
      lines.push(
        `    • ${cls.type} (${cls.group}) - ${cls.day} ${cls.time} @ ${cls.venue}`
      );
    });
    
    return lines.join('\n');
  } catch (error) {
    logger.error(`Error formatting index display: ${error.message}`);
    return `Index ${indexInfo.index || 'Unknown'}`;
  }
}

/**
 * Format all indexes of a course for human-readable display
 * @param {string} courseCode - Course code
 * @param {Array<Object>} indexes - List of index objects
 * @returns {string} Formatted string
 */
function formatCourseDisplay(courseCode, indexes) {
  if (!indexes || indexes.length === 0) {
    return `No indexes found for course ${courseCode}`;
  }
  
  const lines = [`Course: ${courseCode}`, ''];
  
  indexes.forEach(indexInfo => {
    lines.push(formatIndexDisplay(indexInfo));
    lines.push(''); // Empty line between indexes
  });
  
  return lines.join('\n');
}

module.exports = {
  parseVacancyHtml,
  parseNumber,
  formatIndexDisplay,
  formatCourseDisplay
};
