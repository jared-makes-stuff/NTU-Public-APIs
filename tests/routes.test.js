/**
 * Unit tests for API routes
 * Tests pagination, filtering, and response formats
 */

const request = require('supertest');
const express = require('express');

// Mock the repository module
jest.mock('../src/database/repository');
const repo = require('../src/database/repository');

// Import routes
const contentRoutes = require('../src/routes/content');
const scheduleRoutes = require('../src/routes/schedule');
const coursesRoutes = require('../src/routes/courses');
const metaRoutes = require('../src/routes/meta');

// Create test app
const app = express();
app.use(express.json());
app.use('/course-content', contentRoutes);
app.use('/course-schedule', scheduleRoutes);
app.use('/courses', coursesRoutes);
app.use('/semesters', metaRoutes);

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /course-content', () => {
    const mockCourseContent = {
      total: 150,
      count: 2,
      rows: [
        {
          course_code: 'AB0403',
          acadsem: '2025_2',
          title: 'DECISION MAKING WITH PROGRAMMING & ANALYTICS',
          au: 3.0,
          description: 'This is an introductory course...',
          prerequisites: 'AB1201',
          mutual_exclusions: 'BC0401',
          department_code: 'ACC',
          not_available_to_programme: 'ADM, AERO',
          not_available_to_all_programme_with: '',
          is_unrestricted_elective: false,
          grade_type: 'Letter Grade',
          updated_at: '2025-12-06T10:00:00Z'
        },
        {
          course_code: 'AB0501',
          acadsem: '2025_2',
          title: 'ACCOUNTING INFORMATION SYSTEMS',
          au: 3.0,
          description: 'Another course...',
          prerequisites: '',
          mutual_exclusions: '',
          department_code: 'ACC',
          not_available_to_programme: '',
          not_available_to_all_programme_with: '',
          is_unrestricted_elective: true,
          grade_type: 'Pass/Fail',
          updated_at: '2025-12-06T11:00:00Z'
        }
      ]
    };

    test('should return course content without filters', async () => {
      repo.getCourseContent.mockResolvedValue(mockCourseContent);

      const response = await request(app)
        .get('/course-content')
        .expect(200);

      expect(response.body).toEqual(mockCourseContent);
      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: 100,
        offset: 0
      });
    });

    test('should return course content with course_code filter', async () => {
      repo.getCourseContent.mockResolvedValue({
        total: 1,
        count: 1,
        rows: [mockCourseContent.rows[0]]
      });

      const response = await request(app)
        .get('/course-content?course_code=AB0403')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.rows[0].course_code).toBe('AB0403');
      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: 'AB0403',
        acadsem: undefined,
        limit: 100,
        offset: 0
      });
    });

    test('should return course content with acadsem filter', async () => {
      repo.getCourseContent.mockResolvedValue(mockCourseContent);

      const response = await request(app)
        .get('/course-content?acadsem=2025_2')
        .expect(200);

      expect(response.body).toEqual(mockCourseContent);
      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: '2025_2',
        limit: 100,
        offset: 0
      });
    });

    test('should support custom limit', async () => {
      repo.getCourseContent.mockResolvedValue(mockCourseContent);

      await request(app)
        .get('/course-content?limit=50')
        .expect(200);

      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: 50,
        offset: 0
      });
    });

    test('should support pagination with offset', async () => {
      repo.getCourseContent.mockResolvedValue(mockCourseContent);

      await request(app)
        .get('/course-content?limit=10&offset=20')
        .expect(200);

      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: 10,
        offset: 20
      });
    });

    test('should support combined filters and pagination', async () => {
      repo.getCourseContent.mockResolvedValue(mockCourseContent);

      await request(app)
        .get('/course-content?course_code=AB0403&acadsem=2025_2&limit=5&offset=0')
        .expect(200);

      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: 'AB0403',
        acadsem: '2025_2',
        limit: 5,
        offset: 0
      });
    });

    test('should return correct response structure', async () => {
      repo.getCourseContent.mockResolvedValue(mockCourseContent);

      const response = await request(app)
        .get('/course-content')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('rows');
      expect(Array.isArray(response.body.rows)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('GET /course-schedule', () => {
    const mockSchedule = {
      total: 50,
      count: 2,
      rows: [
        {
          index: '10001',
          course_code: 'AB0403',
          acadsem: '2025_2',
          type: 'LEC/STUDIO',
          group: 'L1',
          day: 'MON',
          time: '0930-1120',
          venue: 'LT19A',
          remark: '',
          created_at: '2025-12-06T10:00:00Z'
        },
        {
          index: '10002',
          course_code: 'AB0403',
          acadsem: '2025_2',
          type: 'TUT',
          group: 'T1',
          day: 'TUE',
          time: '1430-1620',
          venue: 'TR+12',
          remark: 'Teaching Weeks 2-13',
          created_at: '2025-12-06T10:00:00Z'
        }
      ]
    };

    test('should return course schedule without filters', async () => {
      repo.getCourseSchedule.mockResolvedValue(mockSchedule);

      const response = await request(app)
        .get('/course-schedule')
        .expect(200);

      expect(response.body).toEqual(mockSchedule);
      expect(repo.getCourseSchedule).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: 100,
        offset: 0
      });
    });

    test('should return course schedule with course_code filter', async () => {
      repo.getCourseSchedule.mockResolvedValue(mockSchedule);

      const response = await request(app)
        .get('/course-schedule?course_code=AB0403')
        .expect(200);

      expect(response.body).toEqual(mockSchedule);
      expect(repo.getCourseSchedule).toHaveBeenCalledWith({
        course_code: 'AB0403',
        acadsem: undefined,
        limit: 100,
        offset: 0
      });
    });

    test('should support pagination with offset', async () => {
      repo.getCourseSchedule.mockResolvedValue(mockSchedule);

      await request(app)
        .get('/course-schedule?limit=25&offset=10')
        .expect(200);

      expect(repo.getCourseSchedule).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: 25,
        offset: 10
      });
    });

    test('should return correct response structure', async () => {
      repo.getCourseSchedule.mockResolvedValue(mockSchedule);

      const response = await request(app)
        .get('/course-schedule')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('rows');
      expect(Array.isArray(response.body.rows)).toBe(true);
    });
  });

  describe('GET /courses', () => {
    const mockCourses = {
      total: 5000,
      count: 3,
      rows: [
        {
          course_code: 'AB0403',
          acadsem: '2025_2',
          title: 'DECISION MAKING WITH PROGRAMMING & ANALYTICS',
          au: 3.0,
          prerequisites: 'AB1201',
          mutual_exclusions: 'BC0401'
        },
        {
          course_code: 'AB0501',
          acadsem: '2025_2',
          title: 'ACCOUNTING INFORMATION SYSTEMS',
          au: 3.0,
          prerequisites: '',
          mutual_exclusions: ''
        },
        {
          course_code: 'AB1201',
          acadsem: '2025_2',
          title: 'FINANCIAL ACCOUNTING',
          au: 3.0,
          prerequisites: '',
          mutual_exclusions: ''
        }
      ]
    };

    test('should return all courses with default pagination', async () => {
      repo.getAllCourses.mockResolvedValue(mockCourses);

      const response = await request(app)
        .get('/courses')
        .expect(200);

      expect(response.body).toEqual(mockCourses);
      expect(repo.getAllCourses).toHaveBeenCalledWith({
        limit: 100,
        offset: 0
      });
    });

    test('should support custom limit', async () => {
      repo.getAllCourses.mockResolvedValue(mockCourses);

      await request(app)
        .get('/courses?limit=50')
        .expect(200);

      expect(repo.getAllCourses).toHaveBeenCalledWith({
        limit: 50,
        offset: 0
      });
    });

    test('should support pagination with offset', async () => {
      repo.getAllCourses.mockResolvedValue(mockCourses);

      await request(app)
        .get('/courses?limit=100&offset=200')
        .expect(200);

      expect(repo.getAllCourses).toHaveBeenCalledWith({
        limit: 100,
        offset: 200
      });
    });

    test('should return correct response structure', async () => {
      repo.getAllCourses.mockResolvedValue(mockCourses);

      const response = await request(app)
        .get('/courses')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('rows');
      expect(Array.isArray(response.body.rows)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    test('should parse numeric parameters correctly', async () => {
      repo.getAllCourses.mockResolvedValue(mockCourses);

      await request(app)
        .get('/courses?limit=15&offset=30')
        .expect(200);

      expect(repo.getAllCourses).toHaveBeenCalledWith({
        limit: 15,
        offset: 30
      });
    });
  });

  describe('GET /semesters', () => {
    const mockSemesters = [
      {
        year: '2025',
        semester: '2',
        label: '2025 Semester 2',
        value: '2025_2',
        updated_at: '2025-12-06T10:00:00Z'
      },
      {
        year: '2025',
        semester: '1',
        label: '2025 Semester 1',
        value: '2025_1',
        updated_at: '2025-12-06T09:00:00Z'
      },
      {
        year: '2024',
        semester: '2',
        label: '2024 Semester 2',
        value: '2024_2',
        updated_at: '2025-12-06T08:00:00Z'
      }
    ];

    test('should return all semesters', async () => {
      repo.getMetadata.mockResolvedValue(mockSemesters);

      const response = await request(app)
        .get('/semesters')
        .expect(200);

      expect(response.body).toEqual(mockSemesters);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    test('should return semesters in correct format', async () => {
      repo.getMetadata.mockResolvedValue(mockSemesters);

      const response = await request(app)
        .get('/semesters')
        .expect(200);

      const semester = response.body[0];
      expect(semester).toHaveProperty('year');
      expect(semester).toHaveProperty('semester');
      expect(semester).toHaveProperty('label');
      expect(semester).toHaveProperty('value');
      expect(semester).toHaveProperty('updated_at');
    });

    test('should handle empty semesters list', async () => {
      repo.getMetadata.mockResolvedValue([]);

      const response = await request(app)
        .get('/semesters')
        .expect(200);

      expect(response.body).toEqual([]);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors in course-content', async () => {
      repo.getCourseContent.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/course-content')
        .expect(500);
    });

    test('should handle repository errors in course-schedule', async () => {
      repo.getCourseSchedule.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/course-schedule')
        .expect(500);
    });

    test('should handle repository errors in courses', async () => {
      repo.getAllCourses.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/courses')
        .expect(500);
    });

    test('should handle repository errors in semesters', async () => {
      repo.getMetadata.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/semesters')
        .expect(500);
    });
  });

  describe('Parameter Validation', () => {
    test('should handle non-numeric limit in course-content', async () => {
      repo.getCourseContent.mockResolvedValue({ total: 0, count: 0, rows: [] });

      await request(app)
        .get('/course-content?limit=abc')
        .expect(200);

      // NaN should be passed to repository
      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: NaN,
        offset: 0
      });
    });

    test('should handle negative offset', async () => {
      repo.getCourseContent.mockResolvedValue({ total: 0, count: 0, rows: [] });

      await request(app)
        .get('/course-content?offset=-10')
        .expect(200);

      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: 100,
        offset: -10
      });
    });

    test('should handle very large offset', async () => {
      repo.getCourseContent.mockResolvedValue({ total: 0, count: 0, rows: [] });

      await request(app)
        .get('/course-content?offset=999999')
        .expect(200);

      expect(repo.getCourseContent).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        limit: 100,
        offset: 999999
      });
    });
  });

  describe('Response Headers', () => {
    test('should return JSON content type', async () => {
      repo.getCourseContent.mockResolvedValue({ total: 0, count: 0, rows: [] });

      const response = await request(app)
        .get('/course-content')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
