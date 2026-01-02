const express = require('express');
const { getAllCourses } = require('../database/repository');
const router = express.Router();

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Retrieve a list of all courses
 *     parameters:
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
 *         description: A lightweight list of all available courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of courses in the database
 *                 count:
 *                   type: integer
 *                   description: Number of courses returned in this response
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
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const result = await getAllCourses({ 
      limit: parseInt(limit, 10), 
      offset: parseInt(offset, 10) 
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
