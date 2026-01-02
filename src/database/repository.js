/**
 * Data Access Object (DAO) / Repository layer.
 * Handles all direct interactions with the PostgreSQL database.
 */
const { getPool } = require('./client');
const logger = require('../utils/logger');

// --- Write Operations ---

/**
 * Saves semester metadata to the database using an upsert strategy.
 * @param {Array<object>} metaList - List of metadata objects { year, semester, label, value }.
 * @returns {Promise<void>}
 */
async function saveMetadata(metaList) {
  if (!metaList.length) return;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const query = `
      INSERT INTO semester_metadata (year, semester, label, value, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (year, semester) DO UPDATE
      SET label = EXCLUDED.label,
          value = EXCLUDED.value,
          updated_at = NOW();
    `;

    for (const item of metaList) {
      await client.query(query, [item.year, item.semester, item.label, item.value]);
    }
    await client.query('COMMIT');
    logger.info(`Saved ${metaList.length} metadata items`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error saving metadata', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Saves course content records using an upsert strategy.
 * Preserves existing records not present in the input list.
 * @param {Array<object>} courses - List of course content objects.
 * @returns {Promise<void>}
 */
async function saveCourseContent(courses) {
  if (!courses.length) return;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Upsert Strategy:
    // We use INSERT ... ON CONFLICT DO UPDATE to ensure that:
    // 1. New courses (unique by course_code + acadsem) are added.
    // 2. Existing courses are updated with the latest data (title, description, etc.) and 'updated_at' is refreshed.
    // 3. Courses removed from the source (not present in this scrape) are NOT touched, complying with the requirement to preserve history.
    const query = `
      INSERT INTO course_content (
        course_code, acadsem, title, au, description, prerequisites, mutual_exclusions,
        department_code, not_available_to_programme, not_available_to_all_programme_with,
        not_available_as_bde_ue_to_programme, is_unrestricted_elective, is_broadening_deepening_elective, grade_type, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (course_code, acadsem) DO UPDATE
      SET title = EXCLUDED.title,
          au = EXCLUDED.au,
          description = EXCLUDED.description,
          prerequisites = EXCLUDED.prerequisites,
          mutual_exclusions = EXCLUDED.mutual_exclusions,
          department_code = EXCLUDED.department_code,
          not_available_to_programme = EXCLUDED.not_available_to_programme,
          not_available_to_all_programme_with = EXCLUDED.not_available_to_all_programme_with,
          not_available_as_bde_ue_to_programme = EXCLUDED.not_available_as_bde_ue_to_programme,
          is_unrestricted_elective = EXCLUDED.is_unrestricted_elective,
          is_broadening_deepening_elective = EXCLUDED.is_broadening_deepening_elective,
          grade_type = EXCLUDED.grade_type,
          updated_at = NOW();
    `;

    for (const c of courses) {
      await client.query(query, [
        c.course_code, c.acadsem, c.title, c.au, c.description,
        c.prerequisites, c.mutual_exclusions, c.department_code,
        c.not_available_to_programme, c.not_available_to_all_programme_with,
        c.not_available_as_bde_ue_to_programme, c.is_unrestricted_elective, c.is_broadening_deepening_elective, c.grade_type
      ]);
    }
    await client.query('COMMIT');
    logger.info(`Saved ${courses.length} course content records`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error saving course content', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Saves course schedule records using a "Delete-then-Insert" strategy.
 * Replaces all sections for a specific course and semester.
 * @param {Array<object>} courses - List of courses with nested 'sections' array.
 * @returns {Promise<void>}
 */
async function saveCourseSchedule(courses) {
  if (!courses.length) return;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Refresh Strategy:
    // For each course found in the scrape, we wipe its existing schedule sections and replace them with the new ones.
    const deleteSql = `DELETE FROM course_schedule WHERE course_code = $1 AND acadsem = $2`;
    const insertSql = `
      INSERT INTO course_schedule (
        index, course_code, acadsem, type, "group", day, time, venue, remark, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (index, course_code, acadsem, type, day, time, venue) DO NOTHING
    `;

    let sectionCount = 0;

    for (const c of courses) {
      // Delete existing sections for this course/sem
      await client.query(deleteSql, [c.course_code, c.acadsem]);

      // Deduplicate sections based on unique key (index, course_code, acadsem, type, day, time, venue)
      const uniqueSections = [];
      const seenKeys = new Set();
      
      for (const s of c.sections) {
        const key = `${s.index}|${c.course_code}|${c.acadsem}|${s.type}|${s.day}|${s.time}|${s.venue}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueSections.push(s);
        }
      }

      for (const s of uniqueSections) {
        await client.query(insertSql, [
          s.index, c.course_code, c.acadsem,
          s.type, s.group, s.day, s.time, s.venue, s.remark
        ]);
        sectionCount++;
      }
    }

    await client.query('COMMIT');
    logger.info(`Saved schedules for ${courses.length} courses (${sectionCount} sections)`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error saving course schedule', err);
    throw err;
  } finally {
    client.release();
  }
}

// --- Read Operations ---

/**
 * Retrieves unique semester metadata.
 * @returns {Promise<Array<object>>} List of semesters.
 */
async function getMetadata() {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM semester_metadata ORDER BY year DESC, semester DESC');
  return res.rows;
}

/**
 * Retrieves a lightweight list of all courses with pagination.
 * @param {object} params - Query parameters { limit, offset }.
 * @returns {Promise<object>} { total, count, rows }.
 */
async function getAllCourses({ limit = 100, offset = 0 } = {}) {
  const pool = getPool();
  
  // Get total count
  const countRes = await pool.query('SELECT COUNT(*) FROM course_content');
  const total = parseInt(countRes.rows[0].count, 10);
  
  // Get paginated results
  const res = await pool.query(
    'SELECT course_code, acadsem, title, au, prerequisites, mutual_exclusions FROM course_content ORDER BY course_code, acadsem LIMIT $1 OFFSET $2',
    [Math.min(limit, 500), offset]
  );
  
  return { total, count: res.rowCount, rows: res.rows };
}

/**
 * Retrieves detailed course content with filtering and pagination.
 * @param {object} params - Query parameters { course_code, acadsem, limit, offset }.
 * @returns {Promise<object>} { total, count, rows }.
 */
async function getCourseContent({ course_code, acadsem, limit = 100, offset = 0 }) {
  const pool = getPool();
  let countQuery = 'SELECT COUNT(*) FROM course_content WHERE 1=1';
  let query = 'SELECT * FROM course_content WHERE 1=1';
  const params = [];
  const countParams = [];
  let idx = 1;

  if (course_code) {
    countQuery += ` AND course_code = $${idx}`;
    query += ` AND course_code = $${idx}`;
    params.push(course_code);
    countParams.push(course_code);
    idx++;
  }
  if (acadsem) {
    countQuery += ` AND acadsem = $${idx}`;
    query += ` AND acadsem = $${idx}`;
    params.push(acadsem);
    countParams.push(acadsem);
    idx++;
  }

  // Get total count
  const countRes = await pool.query(countQuery, countParams);
  const total = parseInt(countRes.rows[0].count, 10);

  query += ` ORDER BY course_code ASC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(Math.min(limit, 500), offset);

  const res = await pool.query(query, params);
  return { total, count: res.rowCount, rows: res.rows };
}

/**
 * Retrieves course schedules with filtering and pagination.
 * @param {object} params - Query parameters { course_code, acadsem, limit, offset }.
 * @returns {Promise<object>} { total, count, rows }.
 */
async function getCourseSchedule({ course_code, acadsem, limit = 100, offset = 0 }) {
  const pool = getPool();
  let countQuery = 'SELECT COUNT(*) FROM course_schedule WHERE 1=1';
  let query = 'SELECT * FROM course_schedule WHERE 1=1';
  const params = [];
  const countParams = [];
  let idx = 1;

  if (course_code) {
    countQuery += ` AND course_code = $${idx}`;
    query += ` AND course_code = $${idx}`;
    params.push(course_code);
    countParams.push(course_code);
    idx++;
  }
  if (acadsem) {
    countQuery += ` AND acadsem = $${idx}`;
    query += ` AND acadsem = $${idx}`;
    params.push(acadsem);
    countParams.push(acadsem);
    idx++;
  }

  // Get total count
  const countRes = await pool.query(countQuery, countParams);
  const total = parseInt(countRes.rows[0].count, 10);

  query += ` ORDER BY course_code, index ASC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(Math.min(limit, 500), offset);

  const res = await pool.query(query, params);
  return { total, count: res.rowCount, rows: res.rows };
}

/**
 * Helper to get a Set of existing course codes for a specific semester.
 * Used for backfilling/diffing.
 * @param {string} tableName - Table to query.
 * @param {string} acadsem - Semester string.
 * @returns {Promise<Set<string>>} Set of course codes.
 */
async function getCourseCodes(tableName, acadsem) {
  const pool = getPool();
  // Validate tableName to prevent SQL injection
  if (!['course_content', 'course_schedule'].includes(tableName)) {
    throw new Error('Invalid table name');
  }
  
  const res = await pool.query(`SELECT DISTINCT course_code FROM ${tableName} WHERE acadsem = $1`, [acadsem]);
  return new Set(res.rows.map(r => r.course_code));
}

/**
 * Saves exam timetable records using an upsert strategy.
 * @param {Array<object>} exams - List of exam timetable objects.
 * @param {string} academicSession - Academic session string.
 * @param {string} planNo - Plan number.
 * @returns {Promise<void>}
 */
async function saveExamTimetable(exams, academicSession, planNo) {
  if (!exams.length) return;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO exam_timetable (
        course_code, acadsem, course_title, exam_date, exam_time, exam_duration,
        venue, seat_no, student_type, exam_type, academic_session, plan_no, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (course_code, acadsem, student_type) DO UPDATE
      SET course_title = EXCLUDED.course_title,
          exam_date = EXCLUDED.exam_date,
          exam_time = EXCLUDED.exam_time,
          exam_duration = EXCLUDED.exam_duration,
          venue = EXCLUDED.venue,
          seat_no = EXCLUDED.seat_no,
          exam_type = EXCLUDED.exam_type,
          academic_session = EXCLUDED.academic_session,
          plan_no = EXCLUDED.plan_no,
          updated_at = NOW();
    `;

    for (const exam of exams) {
      await client.query(query, [
        exam.course_code,
        exam.acadsem,
        exam.course_title || null,
        exam.exam_date || null,
        exam.exam_time || null,
        exam.exam_duration || null,
        exam.venue || null,
        exam.seat_no || null,
        exam.student_type || 'UE',
        exam.exam_type || null,
        academicSession || null,
        planNo || null
      ]);
    }
    
    await client.query('COMMIT');
    logger.info(`Saved ${exams.length} exam timetable records`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error saving exam timetable', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieves exam timetable with filtering and pagination.
 * @param {object} params - Query parameters { course_code, acadsem, student_type, limit, offset }.
 * @returns {Promise<object>} { total, count, rows }.
 */
async function getExamTimetable({ course_code, acadsem, student_type, limit = 100, offset = 0 }) {
  const pool = getPool();
  let countQuery = 'SELECT COUNT(*) FROM exam_timetable WHERE 1=1';
  let query = 'SELECT * FROM exam_timetable WHERE 1=1';
  const params = [];
  const countParams = [];
  let idx = 1;

  if (course_code) {
    countQuery += ` AND course_code = $${idx}`;
    query += ` AND course_code = $${idx}`;
    params.push(course_code);
    countParams.push(course_code);
    idx++;
  }
  if (acadsem) {
    countQuery += ` AND acadsem = $${idx}`;
    query += ` AND acadsem = $${idx}`;
    params.push(acadsem);
    countParams.push(acadsem);
    idx++;
  }
  if (student_type) {
    countQuery += ` AND student_type = $${idx}`;
    query += ` AND student_type = $${idx}`;
    params.push(student_type);
    countParams.push(student_type);
    idx++;
  }

  // Get total count
  const countRes = await pool.query(countQuery, countParams);
  const total = parseInt(countRes.rows[0].count, 10);

  query += ` ORDER BY course_code ASC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(Math.min(limit, 500), offset);

  const res = await pool.query(query, params);
  return { total, count: res.rowCount, rows: res.rows };
}

module.exports = {
  saveMetadata,
  saveCourseContent,
  saveCourseSchedule,
  saveExamTimetable,
  getMetadata,
  getAllCourses,
  getCourseContent,
  getCourseSchedule,
  getExamTimetable,
  getCourseCodes,
};