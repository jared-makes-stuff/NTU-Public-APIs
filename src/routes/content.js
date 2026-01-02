const express = require('express');
const { getCourseContent } = require('../database/repository');
const router = express.Router();

/**
 * @swagger
 * /course-content:
 *   get:
 *     summary: Retrieve course content details
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
 *         description: A list of course content
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
 *                   description: Number of records returned in this response
 *                 rows:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       course_code:
 *                         type: string
 *                       acadsem:
 *                         type: string
 *                       title:
 *                         type: string
 *                       au:
 *                         type: number
 *                       description:
 *                         type: string
 *                       prerequisites:
 *                         type: string
 *                       mutual_exclusions:
 *                         type: string
 *                       department_code:
 *                         type: string
 *                       not_available_to_programme:
 *                         type: string
 *                         description: Programmes for which this course is not available
 *                       not_available_to_all_programme_with:
 *                         type: string
 *                         description: Programme restrictions with specific conditions
 *                       not_available_as_bde_ue_to_programme:
 *                         type: string
 *                         description: Programmes for which this course is not available as BDE/UE (Broadening and Deepening Elective / Unrestricted Elective)
 *                       is_unrestricted_elective:
 *                         type: boolean
 *                         description: Whether this course is offered as an Unrestricted Elective (true = offered, false = not offered)
 *                       is_broadening_deepening_elective:
 *                         type: boolean
 *                         description: Whether this course is offered as a Broadening and Deepening Elective (true = offered, false = not offered)
 *                       grade_type:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 */
router.get('/', async (req, res, next) => {
  try {
    const { course_code, acadsem, limit = 100, offset = 0 } = req.query;
    const result = await getCourseContent({ 
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
