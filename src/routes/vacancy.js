const express = require('express');
const { fetchVacancy } = require('../scrappers/fetchVacancy');
const { parseVacancyHtml } = require('../parsers/vacancyParser');
const { vacancyResponseSchema } = require('../validation/schemas');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /vacancy:
 *   get:
 *     summary: Check course vacancy and waitlist information
 *     description: |
 *       Fetches real-time vacancy and waitlist data for a given course from NTU Vacancy Service.
 *       This endpoint does NOT store data in the database - it returns live data directly from NTU.
 *       
 *       **Important Notes:**
 *       - Service availability is determined by NTU Vacancy Service (typically 9:00 AM to 10:00 PM Singapore time)
 *       - Data is fetched in real-time from NTU Vacancy Service API
 *       - Response time may vary depending on NTU server load
 *       - Course code must be valid and currently offered
 *       - Error messages from NTU are passed through directly
 *     parameters:
 *       - in: query
 *         name: course_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Course code to check vacancy for (e.g., SC2103, CZ2006)
 *         example: SC2103
 *       - in: query
 *         name: index
 *         required: false
 *         schema:
 *           type: string
 *         description: Specific index number to filter (optional, returns all indexes if omitted)
 *         example: "10294"
 *     responses:
 *       200:
 *         description: Vacancy information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course_code:
 *                   type: string
 *                   description: Course code
 *                   example: "SC2103"
 *                 indexes:
 *                   type: array
 *                   description: List of course indexes with vacancy information
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: string
 *                         description: Course index number
 *                         example: "10294"
 *                       vacancy:
 *                         type: integer
 *                         description: Number of available slots
 *                         example: 5
 *                       waitlist:
 *                         type: integer
 *                         description: Number of students on waitlist
 *                         example: 2
 *                       classes:
 *                         type: array
 *                         description: List of class sessions for this index
 *                         items:
 *                           type: object
 *                           properties:
 *                             type:
 *                               type: string
 *                               description: Class type (LEC, TUT, LAB, etc.)
 *                               example: "LEC"
 *                             group:
 *                               type: string
 *                               description: Group identifier
 *                               example: "LE1"
 *                             day:
 *                               type: string
 *                               description: Day of the week
 *                               example: "MON"
 *                             time:
 *                               type: string
 *                               description: Time slot in 24-hour format
 *                               example: "0830-1030"
 *                             venue:
 *                               type: string
 *                               description: Venue/location
 *                               example: "LT1A"
 *       400:
 *         description: Bad request - missing or invalid course_code parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INVALID_REQUEST"
 *                     message:
 *                       type: string
 *                       example: "course_code parameter is required"
 *       404:
 *         description: Course not found or no indexes available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "No indexes found for course SC9999"
 *       503:
 *         description: Service unavailable - outside operating hours or NTU server down
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "SERVICE_UNAVAILABLE"
 *                     message:
 *                       type: string
 *                       example: "NTU Vacancy Service is only available from 8:00 AM to 10:00 PM (Singapore time)"
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res, next) => {
  try {
    const { course_code, index } = req.query;
    
    // Validate required parameter
    if (!course_code) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'course_code parameter is required'
        }
      });
    }
    
    // Fetch vacancy data from NTU
    const courseCodeUpper = course_code.trim().toUpperCase();
    logger.info(`Processing vacancy request for course: ${courseCodeUpper}${index ? ` (index: ${index})` : ''}`);
    
    const html = await fetchVacancy(courseCodeUpper);
    
    // Parse HTML response
    const result = parseVacancyHtml(html, courseCodeUpper);
    
    // Check if NTU returned an error (e.g., service hours)
    if (result.error) {
      // Determine the appropriate status code based on the error message
      if (result.error.includes('only available from')) {
        logger.warn(`NTU service unavailable: ${result.error}`);
        return res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: result.error,
            source: 'NTU_VACANCY_SERVICE'
          }
        });
      }
      
      // Generic error from NTU
      logger.error(`NTU returned error for ${courseCodeUpper}: ${result.error}`);
      return res.status(500).json({
        error: {
          code: 'UPSTREAM_ERROR',
          message: result.error,
          source: 'NTU_VACANCY_SERVICE'
        }
      });
    }
    
    const indexes = result.indexes;
    
    if (indexes.length === 0) {
      logger.info(`No indexes found for course ${courseCodeUpper}`);
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `No indexes found for course ${courseCodeUpper}. Course may not exist or not be offered this semester.`
        }
      });
    }
    
    // Filter by specific index if requested
    let filteredIndexes = indexes;
    if (index) {
      filteredIndexes = indexes.filter(idx => idx.index === index.trim());
      
      if (filteredIndexes.length === 0) {
        return res.status(404).json({
          error: {
            code: 'INDEX_NOT_FOUND',
            message: `Index ${index} not found for course ${courseCodeUpper}`
          }
        });
      }
    }
    
    // Construct response
    const response = {
      course_code: courseCodeUpper,
      indexes: filteredIndexes
    };
    
    // Validate response against schema
    const validated = vacancyResponseSchema.parse(response);
    
    logger.info(`Successfully retrieved vacancy for ${courseCodeUpper} with ${filteredIndexes.length} index(es)`);
    res.json(validated);
    
  } catch (error) {
    logger.error(`Error in vacancy endpoint: ${error.message}`);
    
    // Handle specific error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Unable to connect to NTU Vacancy Service server. The service may be temporarily unavailable.'
        }
      });
    }
    
    if (error.name === 'ZodError') {
      return res.status(500).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Response validation failed',
          details: error.errors
        }
      });
    }
    
    // Pass to error handler
    next(error);
  }
});

module.exports = router;
