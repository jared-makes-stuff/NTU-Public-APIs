/**
 * Database initialization module.
 * Responsible for defining the database schema and creating tables.
 */
const { getPool } = require('./client');
const logger = require('../utils/logger');

const createTablesSql = `
  DROP TABLE IF EXISTS semester_metadata CASCADE;
  CREATE TABLE IF NOT EXISTS semester_metadata (
    year TEXT NOT NULL,
    semester TEXT NOT NULL,
    label TEXT,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (year, semester)
  );

  CREATE TABLE IF NOT EXISTS course_content (
    course_code TEXT NOT NULL,
    acadsem TEXT NOT NULL,
    title TEXT,
    au REAL,
    description TEXT,
    prerequisites TEXT,
    mutual_exclusions TEXT,
    department_code TEXT,
    not_available_to_programme TEXT,
    not_available_to_all_programme_with TEXT,
    not_available_as_bde_ue_to_programme TEXT,
    is_unrestricted_elective BOOLEAN,
    is_broadening_deepening_elective BOOLEAN,
    grade_type TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (course_code, acadsem)
  );

  CREATE TABLE IF NOT EXISTS course_schedule (
    index TEXT NOT NULL,
    course_code TEXT NOT NULL,
    acadsem TEXT NOT NULL,
    type TEXT,
    "group" TEXT,
    day TEXT,
    time TEXT,
    venue TEXT,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (index, course_code, acadsem, type, day, time, venue)
  );

  CREATE TABLE IF NOT EXISTS exam_timetable (
    course_code TEXT NOT NULL,
    acadsem TEXT NOT NULL,
    course_title TEXT,
    exam_date TEXT,
    exam_time TEXT,
    exam_duration TEXT,
    venue TEXT,
    seat_no TEXT,
    student_type TEXT NOT NULL,
    exam_type TEXT,
    academic_session TEXT,
    plan_no TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (course_code, acadsem, student_type)
  );
`;

/**
 * Initializes the database by running the schema creation SQL.
 * Uses a transaction to ensure atomicity.
 */
async function initDatabase() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(createTablesSql);
    await client.query('COMMIT');
    logger.info('Database tables initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  initDatabase,
};
