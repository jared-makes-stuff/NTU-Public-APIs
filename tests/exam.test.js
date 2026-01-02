/**
 * Unit tests for exam timetable API routes
 */

const request = require('supertest');
const express = require('express');

// Mock the repository module
jest.mock('../src/database/repository');
const repo = require('../src/database/repository');

// Import route
const examRoutes = require('../src/routes/exam');

// Create test app
const app = express();
app.use(express.json());
app.use('/exam-timetable', examRoutes);

describe('Exam Timetable API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /exam-timetable', () => {
    const mockExamData = {
      total: 25,
      count: 2,
      rows: [
        {
          course_code: 'AB0403',
          acadsem: '2025_1',
          exam_date: '2025-11-20',
          exam_time: '09:00-11:00',
          exam_duration: '2 hours',
          venue: 'SPMS LT3',
          seat_no: 'A12',
          student_type: 'UE',
          exam_type: 'Open Book',
          academic_session: 'Semester 1 Academic Year 2025-2026',
          plan_no: '113',
          created_at: '2025-12-06T10:00:00Z',
          updated_at: '2025-12-07T10:00:00Z'
        },
        {
          course_code: 'AB0501',
          acadsem: '2025_1',
          exam_date: '2025-11-22',
          exam_time: '14:00-16:00',
          exam_duration: '2 hours',
          venue: 'LT19A',
          seat_no: 'B05',
          student_type: 'UE',
          exam_type: 'Closed Book',
          academic_session: 'Semester 1 Academic Year 2025-2026',
          plan_no: '113',
          created_at: '2025-12-06T10:00:00Z',
          updated_at: '2025-12-07T10:00:00Z'
        }
      ]
    };

    test('should return exam timetable without filters', async () => {
      repo.getExamTimetable.mockResolvedValue(mockExamData);

      const response = await request(app)
        .get('/exam-timetable')
        .expect(200);

      expect(response.body).toEqual(mockExamData);
      expect(repo.getExamTimetable).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        student_type: undefined,
        limit: 100,
        offset: 0
      });
    });

    test('should return exam timetable with course_code filter', async () => {
      repo.getExamTimetable.mockResolvedValue({
        total: 1,
        count: 1,
        rows: [mockExamData.rows[0]]
      });

      const response = await request(app)
        .get('/exam-timetable?course_code=AB0403')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.rows[0].course_code).toBe('AB0403');
      expect(repo.getExamTimetable).toHaveBeenCalledWith({
        course_code: 'AB0403',
        acadsem: undefined,
        student_type: undefined,
        limit: 100,
        offset: 0
      });
    });

    test('should return exam timetable with acadsem filter', async () => {
      repo.getExamTimetable.mockResolvedValue(mockExamData);

      const response = await request(app)
        .get('/exam-timetable?acadsem=2025_1')
        .expect(200);

      expect(response.body).toEqual(mockExamData);
      expect(repo.getExamTimetable).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: '2025_1',
        student_type: undefined,
        limit: 100,
        offset: 0
      });
    });

    test('should return exam timetable with student_type filter', async () => {
      repo.getExamTimetable.mockResolvedValue(mockExamData);

      const response = await request(app)
        .get('/exam-timetable?student_type=UE')
        .expect(200);

      expect(response.body).toEqual(mockExamData);
      expect(repo.getExamTimetable).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        student_type: 'UE',
        limit: 100,
        offset: 0
      });
    });

    test('should support pagination with offset', async () => {
      repo.getExamTimetable.mockResolvedValue(mockExamData);

      await request(app)
        .get('/exam-timetable?limit=10&offset=20')
        .expect(200);

      expect(repo.getExamTimetable).toHaveBeenCalledWith({
        course_code: undefined,
        acadsem: undefined,
        student_type: undefined,
        limit: 10,
        offset: 20
      });
    });

    test('should support combined filters and pagination', async () => {
      repo.getExamTimetable.mockResolvedValue(mockExamData);

      await request(app)
        .get('/exam-timetable?course_code=AB0403&acadsem=2025_1&student_type=UE&limit=5&offset=0')
        .expect(200);

      expect(repo.getExamTimetable).toHaveBeenCalledWith({
        course_code: 'AB0403',
        acadsem: '2025_1',
        student_type: 'UE',
        limit: 5,
        offset: 0
      });
    });

    test('should return correct response structure', async () => {
      repo.getExamTimetable.mockResolvedValue(mockExamData);

      const response = await request(app)
        .get('/exam-timetable')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('rows');
      expect(Array.isArray(response.body.rows)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.count).toBe('number');
    });

    test('should verify exam_type field values', async () => {
      repo.getExamTimetable.mockResolvedValue(mockExamData);

      const response = await request(app)
        .get('/exam-timetable')
        .expect(200);

      const examTypes = response.body.rows.map(r => r.exam_type);
      examTypes.forEach(type => {
        expect(['Open Book', 'Closed Book', 'Restricted Open Book']).toContain(type);
      });
    });

    test('should handle repository errors', async () => {
      repo.getExamTimetable.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/exam-timetable')
        .expect(500);
    });
  });

  describe('Response Data Validation', () => {
    test('should have all required fields in response', async () => {
      const mockData = {
        total: 1,
        count: 1,
        rows: [{
          course_code: 'AB0403',
          acadsem: '2025_1',
          exam_date: '2025-11-20',
          exam_time: '09:00-11:00',
          exam_duration: '2 hours',
          venue: 'SPMS LT3',
          seat_no: 'A12',
          student_type: 'UE',
          exam_type: 'Open Book',
          academic_session: 'Semester 1 Academic Year 2025-2026',
          plan_no: '113'
        }]
      };

      repo.getExamTimetable.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/exam-timetable?course_code=AB0403')
        .expect(200);

      const exam = response.body.rows[0];
      expect(exam).toHaveProperty('course_code');
      expect(exam).toHaveProperty('acadsem');
      expect(exam).toHaveProperty('exam_date');
      expect(exam).toHaveProperty('exam_time');
      expect(exam).toHaveProperty('exam_duration');
      expect(exam).toHaveProperty('venue');
      expect(exam).toHaveProperty('seat_no');
      expect(exam).toHaveProperty('student_type');
      expect(exam).toHaveProperty('exam_type');
      expect(exam).toHaveProperty('academic_session');
      expect(exam).toHaveProperty('plan_no');
    });

    test('should handle graduate student type', async () => {
      const mockData = {
        total: 1,
        count: 1,
        rows: [{
          course_code: 'MH9001',
          acadsem: '2025_1',
          exam_date: '2025-11-25',
          exam_time: '10:00-12:00',
          exam_duration: '2 hours',
          venue: 'SPMS LT4',
          seat_no: '',
          student_type: 'GR',
          exam_type: 'Restricted Open Book',
          academic_session: 'Semester 1 Academic Year 2025-2026',
          plan_no: '114'
        }]
      };

      repo.getExamTimetable.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/exam-timetable?student_type=GR')
        .expect(200);

      expect(response.body.rows[0].student_type).toBe('GR');
    });
  });
});
