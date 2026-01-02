/**
 * Parser for NTU Exam Timetable HTML responses
 * Extracts exam schedule information from WIS HTML pages
 */
const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Parses exam metadata from the first step response
 * Extracts available plan numbers with their details
 * @param {string} html - HTML response from MainSubmit
 * @returns {Array} Array of { planNo, label } objects for available exam plans
 */
function parseExamMetadata(html) {
  const $ = cheerio.load(html);
  
  try {
    // Check if there are multiple plan numbers (radio buttons)
    const planRadios = $('input[name="p_plan_no"][type="radio"]');
    
    if (planRadios.length > 0) {
      // Multiple plans available - extract all
      const plans = [];
      
      // Find the form that contains these radio buttons
      const form = planRadios.first().closest('form');
      const formAction = form.attr('action');
      logger.info(`Form action for plan selection: ${formAction}`);
      
      planRadios.each((i, elem) => {
        const value = $(elem).val();
        // Try to find label text near the radio button
        const label = $(elem).parent().text().trim() || 
                     $(elem).next('label').text().trim() ||
                     `Plan ${value}`;
        plans.push({ planNo: value, label });
      });
      
      logger.info(`Found ${plans.length} available exam plans:`, plans);
      return plans;
    }
    
    // Single plan or result page with hidden fields
    const planNo = $('input[name="p_plan_no"]').val() || 
                   $('input[name="r_plan_no"]').val();
    
    // Check for hidden academic_session field first (from query_page response)
    const academicSessionHidden = $('input[name="academic_session"]').val();
    const academicSession = academicSessionHidden ||
                           $('select[name="academic_session"] option[selected]').text().trim() ||
                           $('select[name="academic_session"] option').first().text().trim();
    
    const examYear = $('input[name="p_exam_yr"]').val() ||
                     $('input[name="r_exam_yr"]').val();
    
    const semester = $('input[name="p_semester"]').val() ||
                    $('input[name="r_semester"]').val();
    
    // If not found in inputs, try to parse from academic session string
    // e.g., "Semester 1 Academic Year 2025-2026"
    let parsedYear = examYear;
    let parsedSemester = semester;
    
    if (!examYear || !semester) {
      const sessionMatch = academicSession.match(/Semester (\d+) Academic Year (\d{4})-(\d{4})/);
      if (sessionMatch) {
        parsedSemester = sessionMatch[1];
        parsedYear = sessionMatch[2];
      }
    }
    
    logger.info(`Parsed exam metadata: Plan ${planNo}, Session: ${academicSession}`);
    
    // If this is a result page with session details, return single object in array
    if (academicSession && parsedYear && parsedSemester) {
      return [{
        planNo: planNo || '',
        academicSession,
        examYear: parsedYear,
        semester: parsedSemester
      }];
    }
    
    // No valid data found
    return [];
  } catch (err) {
    logger.error('Error parsing exam metadata', err);
    return [];
  }
}

/**
 * Parses exam timetable details from the second step response
 * Extracts course code, date, time, venue, and exam type
 * @param {string} html - HTML response from Get_detail
 * @param {string} acadsem - Academic semester in YYYY_S format
 * @param {string} studentType - 'UE' for undergraduate, 'GR' for graduate
 * @returns {Array<object>} Array of exam records
 */
function parseExamDetails(html, acadsem, studentType = 'UE') {
  const $ = cheerio.load(html);
  const exams = [];
  
  // Check if the page contains the exam type legend
  // Only set exam types if the legend is explicitly present
  const pageText = $('body').text();
  const hasExamTypeLegend = pageText.includes('Open Book') && 
                           pageText.includes('Restricted Open Book') &&
                           (pageText.includes('*') || pageText.includes('+'));
  
  if (!hasExamTypeLegend) {
    logger.info('Exam type legend not found on page - exam types will be left blank');
  }
  
  try {
    // Look for the exam timetable table
    // The structure may vary, so we'll look for common patterns
    $('table').each((_, table) => {
      const $table = $(table);
      const headers = [];
      
      // Extract headers
      $table.find('tr').first().find('th, td').each((i, cell) => {
        headers.push($(cell).text().trim().toLowerCase());
      });
      
      // Check if this is the exam timetable table
      const hasRelevantHeaders = headers.some(h => 
        h.includes('course') || h.includes('date') || h.includes('time') || h.includes('venue')
      );
      
      if (!hasRelevantHeaders) return;
      
      // Extract data rows (skip first row which is likely the header)
      $table.find('tr').slice(1).each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td').map((i, cell) => $(cell).text().trim()).get();
        
        if (cells.length < 3) return; // Skip empty rows
        
        // Skip header rows that contain generic header text
        const firstCell = cells[0] ? cells[0].toUpperCase() : '';
        if (firstCell === 'DATE' || firstCell === 'COURSE CODE' || firstCell === 'COURSE' || 
            firstCell === 'TIME' || firstCell === 'DAY' || firstCell === 'VENUE') {
          return; // Skip this row, it's a header
        }
        
        // Map cells to data based on headers or position
        let courseCode = '';
        let courseTitle = '';
        let examDate = '';
        let examTime = '';
        let examDuration = '';
        let venue = '';
        let seatNo = '';
        let examType = null; // Initialize as null
        
        // Try to find course code (usually first column or column with course pattern)
        cells.forEach((cell, idx) => {
          const header = headers[idx] || '';
          const headerLower = header.toLowerCase();
          
          // Match course code specifically (not course title)
          if ((headerLower.includes('course') && !headerLower.includes('title')) || 
              headerLower.includes('code') || 
              headerLower.includes('subject')) {
            courseCode = cell;
          } else if (headerLower.includes('date')) {
            examDate = cell;
          } else if (headerLower.includes('time')) {
            examTime = cell;
          } else if (headerLower.includes('duration')) {
            examDuration = cell;
          } else if (headerLower.includes('venue') || headerLower.includes('hall') || headerLower.includes('location')) {
            venue = cell;
          } else if (headerLower.includes('seat')) {
            seatNo = cell;
          } else if (headerLower.includes('type') || headerLower.includes('mode')) {
            examType = cell;
          }
        });
        
        // ALWAYS use positional mapping for WIS exam table (header matching is unreliable)
        // Based on the ACTUAL WIS table structure (confirmed with debugging):
        // Column 0: DATE (exam date like "27 APRIL 2026")
        // Column 1: Day (day of week like "Monday")
        // Column 2: Time (exam time like "5.00 pm")
        // Column 3: Course Code (like "AAE18D", "SC4000", "SC4000+", "SC4000*")
        // Column 4: Course Title (like "EXPLORING THE WORDS & SOUNDS OF ENGLISH")
        // Column 5: Duration (like "2 hr 30 min")
        // Column 6+: Possibly venue or other info
        if (cells.length >= 5) {
          examDate = cells[0] || '';
          // cells[1] is day of week, we can skip it
          examTime = cells[2] || '';
          courseCode = cells[3] || ''; // Course code is in column 3!
          courseTitle = cells[4] || ''; // Course title in column 4
          examDuration = cells[5] || ''; // Duration like "2 hr 30 min"
          venue = cells[6] || ''; // If there's a 7th column, it might be venue
        }
        
        // Extract exam type from course code suffix and clean the course code
        // Only set exam type if the legend is present on the page
        // * = Restricted Open Book, # or + = Open Book, no suffix = Closed Book
        if (courseCode && hasExamTypeLegend) {
          if (courseCode.endsWith('*')) {
            examType = 'Restricted Open Book';
            courseCode = courseCode.slice(0, -1); // Remove the * suffix
          } else if (courseCode.endsWith('+') || courseCode.endsWith('#')) {
            examType = 'Open Book';
            courseCode = courseCode.slice(0, -1); // Remove the suffix
          } else {
            examType = 'Closed Book';
          }
        } else if (courseCode) {
          // Remove suffix if present, but don't set exam type
          if (courseCode.endsWith('*') || courseCode.endsWith('+') || courseCode.endsWith('#')) {
            courseCode = courseCode.slice(0, -1);
          }
          examType = null; // Use null when legend not present
          
          // Debug: Log for first exam (removed after verification)
          if (exams.length === 0) {
            logger.info(`First exam without legend: courseCode="${courseCode}", courseTitle="${courseTitle}", examType=${examType}, hasExamTypeLegend=${hasExamTypeLegend}`);
          }
        }
        
        // Fallback: Detect exam type from venue or other text (only if legend is present and exam type not already set)
        if (!examType && hasExamTypeLegend) {
          const rowText = $row.text().toLowerCase();
          if (rowText.includes('open book') || rowText.includes('openbook')) {
            examType = 'Open Book';
          } else if (rowText.includes('restricted open book') || rowText.includes('restricted')) {
            examType = 'Restricted Open Book';
          } else if (rowText.includes('closed book') || rowText.includes('closedbook')) {
            examType = 'Closed Book';
          } else {
            examType = 'Closed Book'; // Default assumption when legend present
          }
        }
        
        if (courseCode && courseCode.length > 2) {
          exams.push({
            course_code: courseCode.toUpperCase(),
            course_title: courseTitle,
            acadsem,
            exam_date: examDate,
            exam_time: examTime,
            exam_duration: examDuration,
            venue,
            seat_no: seatNo,
            student_type: studentType,
            exam_type: examType
          });
        }
      });
    });
    
    logger.info(`Parsed ${exams.length} exam records`);
    return exams;
  } catch (err) {
    logger.error('Error parsing exam details', err);
    return [];
  }
}

module.exports = {
  parseExamMetadata,
  parseExamDetails
};
