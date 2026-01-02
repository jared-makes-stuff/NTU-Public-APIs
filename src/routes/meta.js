const express = require('express');
const { getMetadata } = require('../database/repository');
const router = express.Router();

/**
 * @swagger
 * /semesters:
 *   get:
 *     summary: Retrieve available semesters
 *     description: Returns a list of academic semesters discovered by the scraper, normalized by year and semester.
 *     responses:
 *       200:
 *         description: A list of semesters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   year:
 *                     type: string
 *                     example: "2025"
 *                   semester:
 *                     type: string
 *                     example: "2"
 *                   label:
 *                     type: string
 *                     example: "2025 Semester 2"
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await getMetadata();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
