const express = require('express');
const { getExamTimetable } = require('../database/repository');
const router = express.Router();

/**
 * @swagger
 * /exam-timetable:
 *   get:
 *     summary: Retrieve exam timetable details
 *     description: |
 *       Returns exam schedule information including date, time, venue, seat number, course title, and exam type.
 *       
 *       **Exam Types:**
 *       - `Open Book`: Students can refer to any materials during the exam
 *       - `Closed Book`: No materials allowed during the exam  
 *       - `Restricted Open Book`: Limited materials allowed (e.g., one A4 sheet)
 *       - `null`: Exam type information is not available from the source (e.g., legend not yet published for future semesters)
 *       
 *       **NULL Value Handling:**
 *       Fields may return `null` to represent unavailable information (not empty strings).
 *       This properly distinguishes between "information unavailable" and "known to be empty".
 *       Common NULL fields include exam_type, course_title, venue, and seat_no when not provided by the source.
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
 *         description: Filter by academic semester (e.g. 2025_1)
 *       - in: query
 *         name: student_type
 *         schema:
 *           type: string
 *           enum: [UE, GR]
 *         description: Filter by student type (UE for undergraduate, GR for graduate)
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
 *         description: A list of exam timetable entries
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
 *                         example: "AB0403"
 *                       acadsem:
 *                         type: string
 *                         example: "2025_1"
 *                       course_title:
 *                         type: string
 *                         nullable: true
 *                         example: "DECISION MAKING WITH PROGRAMMING & ANALYTICS"
 *                         description: The full title of the course. May be null if unavailable.
 *                       exam_date:
 *                         type: string
 *                         nullable: true
 *                         example: "2025-11-20"
 *                         description: Exam date in YYYY-MM-DD format. May be null if not scheduled.
 *                       exam_time:
 *                         type: string
 *                         nullable: true
 *                         example: "09:00-11:00"
 *                         description: Exam time range. May be null if not scheduled.
 *                       exam_duration:
 *                         type: string
 *                         nullable: true
 *                         example: "2 hours"
 *                         description: Duration of the exam. May be null if not specified.
 *                       venue:
 *                         type: string
 *                         nullable: true
 *                         example: "SPMS LT3"
 *                         description: Exam venue/location. May be null if not assigned.
 *                       seat_no:
 *                         type: string
 *                         nullable: true
 *                         example: "A12"
 *                         description: Assigned seat number. May be null if not assigned.
 *                       student_type:
 *                         type: string
 *                         example: "UE"
 *                         description: Student type (UE for undergraduate, GR for graduate)
 *                       exam_type:
 *                         type: string
 *                         nullable: true
 *                         example: "Open Book"
 *                         description: |
 *                           Type of exam: "Open Book", "Closed Book", or "Restricted Open Book".
 *                           Returns null when exam type legend is not present on the source page
 *                           (common for future semesters where exam details are not yet finalized).
 *                       academic_session:
 *                         type: string
 *                         nullable: true
 *                         example: "Semester 1 Academic Year 2025-2026"
 *                         description: Full academic session name. May be null if unavailable.
 *                       plan_no:
 *                         type: string
 *                         nullable: true
 *                         example: "113"
 *                         description: Internal exam plan number. May be null if unavailable.
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp when the record was first created
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp when the record was last updated
 */
router.get('/', async (req, res, next) => {
  try {
    const { course_code, acadsem, student_type, limit = 100, offset = 0 } = req.query;
    const result = await getExamTimetable({ 
      course_code, 
      acadsem,
      student_type,
      limit: parseInt(limit, 10), 
      offset: parseInt(offset, 10) 
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
