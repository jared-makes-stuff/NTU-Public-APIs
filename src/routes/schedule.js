const express = require('express');
const { getCourseSchedule } = require('../database/repository');
const router = express.Router();

/**
 * @swagger
 * /course-schedule:
 *   get:
 *     summary: Retrieve class schedule details
 *     parameters:
 *       - in: query
 *         name: course_code
 *         schema:
 *           type: string
 *         description: Filter by course code (e.g. AB0403)
 *       - in: query
 *         name: acadsem
 *         schema:
 *           type: string
 *         description: Filter by academic semester (e.g. 2025_2)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 100
 *         description: Maximum number of rows to return (default 100, max 500)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of rows to skip for pagination (default 0)
 *     responses:
 *       200:
 *         description: A list of schedule sections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of records matching the filters
 *                 count:
 *                   type: integer
 *                   description: Total rows returned in this response
 *                 rows:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: string
 *                         description: Course index number for registration
 *                         example: "10001"
 *                       course_code:
 *                         type: string
 *                         description: Course code
 *                         example: "AB0403"
 *                       acadsem:
 *                         type: string
 *                         description: Academic semester in YYYY_S format
 *                         example: "2025_2"
 *                       type:
 *                         type: string
 *                         description: Session type (e.g., LEC, TUT, LAB, SEM)
 *                         example: "LEC/STUDIO"
 *                       group:
 *                         type: string
 *                         description: Group identifier
 *                         example: "L1"
 *                       day:
 *                         type: string
 *                         description: Day of the week
 *                         example: "MON"
 *                       time:
 *                         type: string
 *                         description: Time range in 24-hour format
 *                         example: "0930-1120"
 *                       venue:
 *                         type: string
 *                         description: Location/venue code
 *                         example: "LT19A"
 *                       remark:
 *                         type: string
 *                         example: ""
 */
router.get('/', async (req, res, next) => {
  try {
    const { course_code, acadsem, limit = 100, offset = 0 } = req.query;
    const result = await getCourseSchedule({ 
      course_code, 
      acadsem, 
      limit: parseInt(limit, 10), 
      offset: parseInt(offset, 10) 
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
