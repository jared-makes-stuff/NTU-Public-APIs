require('dotenv').config();

// Polyfill for Node < 20
if (!global.File) {
  try {
    const { File } = require('node:buffer');
    if (File) global.File = File;
  } catch (e) {
    console.warn('Failed to polyfill global.File:', e.message);
  }
}

const express = require('express');
const { initDatabase } = require('./database/init');
const { startWorkers } = require('./workers/index');
const { addJob, clearQueue } = require('./queue/client');
const logger = require('./utils/logger');

// Routes
const contentRoutes = require('./routes/content');
const scheduleRoutes = require('./routes/schedule');
const coursesRoutes = require('./routes/courses');
const metaRoutes = require('./routes/meta');
const examRoutes = require('./routes/exam');
const vacancyRoutes = require('./routes/vacancy');

// Manual Trigger Imports
const { fetchCourseSchedule } = require('./scrappers/fetchSchedule');
const { parseSchedule } = require('./parsers/scheduleParser');
const { saveCourseSchedule } = require('./database/repository');
const { fetchCourseContent } = require('./scrappers/fetchContent');
const { parseContent } = require('./parsers/contentParser');
const { saveCourseContent } = require('./database/repository');
const { fetchScheduleForm, fetchContentForm } = require('./scrappers/fetchOptions');
const { parseScheduleOptions, parseContentOptions } = require('./parsers/metaParser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Swagger Setup (Conditional)
if (process.env.DISABLE_SWAGGER !== 'true') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerJsdoc = require('swagger-jsdoc');
  
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'NTU Course Scraper API',
        version: '2.0.0',
        description: 'API for accessing NTU Course Content and Schedules',
      },
    },
    apis: ['./src/routes/*.js'], 
  };
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info(`Swagger Docs enabled at http://localhost:${PORT}/api-docs`);
} else {
  logger.info('Swagger Docs disabled for memory optimization');
}

// API Routes
app.use('/course-content', contentRoutes);
app.use('/course-schedule', scheduleRoutes);
app.use('/courses', coursesRoutes);
app.use('/semesters', metaRoutes);
app.use('/exam-timetable', examRoutes);
app.use('/vacancy', vacancyRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Manual Live Scrape Routes (Legacy Support / Debugging)
app.get('/schedule', async (req, res, next) => {
  try {
    const { acadsem, r_course_yr, r_subj_code, r_search_type, boption } = req.query;
    if (!acadsem) throw new Error('acadsem is required');

    const html = await fetchCourseSchedule({
      acadsem,
      rCourseYr: r_course_yr,
      rSubjCode: r_subj_code,
      rSearchType: r_search_type,
      boption: boption || (r_subj_code ? 'Search' : 'CLoad'),
    });
    const courses = parseSchedule(html, acadsem);
    if (courses.length) await saveCourseSchedule(courses);
    
    res.json({ count: courses.length, courses });
  } catch (err) {
    next(err);
  }
});

app.get('/content', async (req, res, next) => {
  try {
    const { acadsem, r_course_yr, r_subj_code, boption } = req.query;
    if (!acadsem) throw new Error('acadsem is required');

    const html = await fetchCourseContent({
      acadsem,
      rCourseYr: r_course_yr,
      rSubjCode: r_subj_code,
      boption: boption || (r_subj_code ? 'Search' : 'CLoad'),
    });
    const courses = parseContent(html, acadsem);
    if (courses.length) await saveCourseContent(courses);

    res.json({ count: courses.length, courses });
  } catch (err) {
    next(err);
  }
});

app.get('/options', async (req, res, next) => {
  try {
    const source = (req.query.source || 'schedule').toLowerCase();
    if (source === 'content') {
        const html = await fetchContentForm();
        res.json(parseContentOptions(html));
    } else {
        const html = await fetchScheduleForm();
        res.json(parseScheduleOptions(html));
    }
  } catch (err) {
    next(err);
  }
});

// Manual Exam Scrape Trigger
app.get('/exam', async (req, res, next) => {
  try {
    const { acadsem, student_type } = req.query;
    if (!acadsem) throw new Error('acadsem is required');

    const { scrapeExamsForSemester } = require('./workers/examScraper');
    
    const studentType = student_type || 'UE';
    logger.info(`Manual exam scrape triggered: ${acadsem}, ${studentType}`);
    
    const result = await scrapeExamsForSemester(acadsem);
    
    res.json({
      acadsem,
      undergraduate: result.undergraduate,
      graduate: result.graduate
    });
  } catch (err) {
    next(err);
  }
});

// Error Handling
// 404 handler - must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found.`,
      timestamp: new Date().toISOString()
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled API Error', err);
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start Server
async function start() {
  try {
    await clearQueue();
    await initDatabase();
    startWorkers();

    // Trigger initial scrape on startup
    await addJob('scrape-metadata', { triggerNext: true });
    logger.info('Initial metadata scrape triggered');
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
