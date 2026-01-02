const { parseScheduleOptions } = require('../src/parsers/metaParser');
const { parseContent } = require('../src/parsers/contentParser');
const { parseSchedule } = require('../src/parsers/scheduleParser');
const { parseExamDetails } = require('../src/parsers/examParser');

describe('Parsers', () => {
  describe('Meta Parser', () => {
    it('should parse acadsem options', () => {
      const html = `
        <select name="acadsem">
          <option value="2025_1">2025 Sem 1</option>
          <option value="">Select...</option>
        </select>
      `;
      const res = parseScheduleOptions(html);
      expect(res.acadsem).toHaveLength(1);
      expect(res.acadsem[0]).toEqual({ value: '2025_1', label: '2025 Sem 1' });
    });
  });

  describe('Content Parser', () => {
    it('should parse course content table', () => {
      const html = `
        <table>
          <tr><td>COURSE CODE</td><td>TITLE</td><td>AU</td><td>PROGRAMME/(DEPT MAINTAIN*)</td></tr>
          <tr><td>AB1234</td><td>Test Course</td><td>3.0</td><td>ACC</td></tr>
          <tr><td>Prerequisite:</td><td>AB1233</td><td></td><td></td></tr>
          <tr><td>description</td><td>This is a test course.</td><td></td><td></td></tr>
        </table>
      `;
      const res = parseContent(html, '2025_1');
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('AB1234');
      expect(res[0].title).toBe('Test Course');
      expect(res[0].au).toBe(3.0);
      expect(res[0].prerequisites).toBe('AB1233');
      expect(res[0].description).toBe('This is a test course.');
      expect(res[0].department_code).toBe('ACC');
      expect(res[0].is_unrestricted_elective).toBe(true);
    });

    it('should parse course with 0.0 AU correctly (not as null)', () => {
      const html = `
        <table>
          <tr><td>COURSE CODE</td><td>TITLE</td><td>AU</td><td>PROGRAMME/(DEPT MAINTAIN*)</td></tr>
          <tr><td>E3014L</td><td>Zero AU Course</td><td>0.0</td><td>EEE</td></tr>
          <tr><td>description</td><td>This course has zero AU.</td><td></td><td></td></tr>
        </table>
      `;
      const res = parseContent(html, '2025_1');
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('E3014L');
      expect(res[0].title).toBe('Zero AU Course');
      expect(res[0].au).toBe(0.0);
      expect(res[0].au).not.toBeNull();
      expect(res[0].department_code).toBe('EEE');
    });

    it('should handle missing AU as null', () => {
      const html = `
        <table>
          <tr><td>COURSE CODE</td><td>TITLE</td><td>AU</td><td>PROGRAMME/(DEPT MAINTAIN*)</td></tr>
          <tr><td>XY9999</td><td>No AU Course</td><td></td><td>MISC</td></tr>
        </table>
      `;
      const res = parseContent(html, '2025_1');
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('XY9999');
      expect(res[0].au).toBeNull();
    });

    it('should parse course with BDE/UE restriction (SC2008 example)', () => {
      const html = `
        <table>
          <tr><td>COURSE CODE</td><td>TITLE</td><td>AU</td><td>PROGRAMME/(DEPT MAINTAIN*)</td></tr>
          <tr><td>SC2008</td><td>COMPUTER NETWORK</td><td>3.0</td><td>CSC(CE)</td></tr>
          <tr><td>Prerequisite:</td><td colspan="2">SC1004 & SC2000</td></tr>
          <tr><td>Not available to Programme:</td><td colspan="2">EEE, ENG(EEE)</td></tr>
          <tr><td>Not available as BDE/UE to Programme:</td><td colspan="2">BCE</td></tr>
          <tr><td colspan="4">This course serves as a foundation for computer networks.</td></tr>
        </table>
      `;
      const res = parseContent(html, '2025_1');
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('SC2008');
      expect(res[0].title).toBe('COMPUTER NETWORK');
      expect(res[0].prerequisites).toBe('SC1004 & SC2000');
      expect(res[0].not_available_to_programme).toBe('EEE, ENG(EEE)');
      expect(res[0].not_available_as_bde_ue_to_programme).toBe('BCE');
      expect(res[0].description).toBe('This course serves as a foundation for computer networks.');
      // Ensure BDE/UE restriction is NOT in the description
      expect(res[0].description).not.toContain('BCE');
      expect(res[0].description).not.toContain('BDE/UE');
    });
  });

  describe('Schedule Parser', () => {
    it('should parse schedule table', () => {
      const html = `
        <table>
          <tr><td>AB1234</td><td>Test Course</td><td>3.0</td></tr>
        </table>
        <table>
          <tr><th>INDEX</th><th>TYPE</th><th>GROUP</th><th>DAY</th><th>TIME</th><th>VENUE</th><th>REMARK</th></tr>
          <tr><td>10001</td><td>LEC</td><td>L1</td><td>MON</td><td>0930-1030</td><td>LT1</td><td></td></tr>
        </table>
      `;
      const res = parseSchedule(html, '2025;1');
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('AB1234');
      expect(res[0].sections).toHaveLength(1);
      expect(res[0].sections[0].index).toBe('10001');
      expect(res[0].sections[0].day).toBe('MON');
    });

    it('should parse multiple sessions for same index (SC2008 example)', () => {
      const html = `
        <table>
          <tr><td>SC2008</td><td>COMPUTER NETWORK</td><td>3.0</td></tr>
        </table>
        <table border>
          <tr><th>INDEX</th><th>TYPE</th><th>GROUP</th><th>DAY</th><th>TIME</th><th>VENUE</th><th>REMARK</th></tr>
          <tr><td>10284</td><td>LEC/STUDIO</td><td>SCL2</td><td>MON</td><td>1130-1220</td><td>LT19A</td><td></td></tr>
          <tr><td></td><td>LEC/STUDIO</td><td>SCL2</td><td>WED</td><td>1530-1620</td><td>LT1</td><td>Teaching Wk2-13</td></tr>
          <tr><td></td><td>LEC/STUDIO</td><td>SCL2</td><td>WED</td><td>1530-1620</td><td>LT19A</td><td>Teaching Wk1</td></tr>
          <tr><td></td><td>TUT</td><td>SCEZ</td><td>FRI</td><td>1530-1620</td><td>TR+16</td><td>Teaching Wk2-13</td></tr>
          <tr><td></td><td>LAB</td><td>SCEZ</td><td>FRI</td><td>1330-1520</td><td>SWLAB2</td><td>Teaching Wk1,3,5,7,9,11,13</td></tr>
        </table>
      `;
      const res = parseSchedule(html, '2025_2');
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('SC2008');
      expect(res[0].sections).toHaveLength(5);
      
      // All sections should have the same index
      expect(res[0].sections[0].index).toBe('10284');
      expect(res[0].sections[1].index).toBe('10284');
      expect(res[0].sections[2].index).toBe('10284');
      expect(res[0].sections[3].index).toBe('10284');
      expect(res[0].sections[4].index).toBe('10284');
      
      // Verify each session details
      expect(res[0].sections[0].type).toBe('LEC/STUDIO');
      expect(res[0].sections[0].day).toBe('MON');
      expect(res[0].sections[0].time).toBe('1130-1220');
      expect(res[0].sections[0].venue).toBe('LT19A');
      
      expect(res[0].sections[1].type).toBe('LEC/STUDIO');
      expect(res[0].sections[1].day).toBe('WED');
      expect(res[0].sections[1].venue).toBe('LT1');
      expect(res[0].sections[1].remark).toBe('Teaching Wk2-13');
      
      expect(res[0].sections[3].type).toBe('TUT');
      expect(res[0].sections[3].venue).toBe('TR+16');
      
      expect(res[0].sections[4].type).toBe('LAB');
      expect(res[0].sections[4].venue).toBe('SWLAB2');
      expect(res[0].sections[4].remark).toBe('Teaching Wk1,3,5,7,9,11,13');
    });

    it('should handle duplicate sessions in HTML gracefully', () => {
      const html = `
        <table>
          <tr><td>AB2008</td><td>Test Course</td><td>3.0</td></tr>
        </table>
        <table border>
          <tr><th>INDEX</th><th>TYPE</th><th>GROUP</th><th>DAY</th><th>TIME</th><th>VENUE</th><th>REMARK</th></tr>
          <tr><td>01175</td><td>SEM</td><td>G1</td><td>FRI</td><td>1430-1620</td><td>S4-SR17</td><td></td></tr>
          <tr><td></td><td>SEM</td><td>G1</td><td>FRI</td><td>1430-1620</td><td>S4-SR17</td><td></td></tr>
        </table>
      `;
      const res = parseSchedule(html, '2024_1');
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('AB2008');
      // Parser returns both duplicate rows (it doesn't deduplicate)
      expect(res[0].sections).toHaveLength(2);
      expect(res[0].sections[0].index).toBe('01175');
      expect(res[0].sections[1].index).toBe('01175');
      // Both sessions have identical data
      expect(res[0].sections[0]).toEqual(res[0].sections[1]);
    });
  });

  describe('Exam Parser', () => {
    it('should parse exam timetable with exam type legend', () => {
      const html = `
        <body>
        <p>* - Restricted Open Book, # - Open Book, + - Open Book</p>
        <table>
          <tr><th>Date</th><th>Day</th><th>Time</th><th>Course Code</th><th>Course Title</th><th>Duration</th><th>Venue</th></tr>
          <tr>
            <td>20 NOVEMBER 2025</td>
            <td>THURSDAY</td>
            <td>9.00 AM</td>
            <td>AB1234*</td>
            <td>TEST COURSE</td>
            <td>2 hr 0 min</td>
            <td>LT1</td>
          </tr>
          <tr>
            <td>21 NOVEMBER 2025</td>
            <td>FRIDAY</td>
            <td>2.00 PM</td>
            <td>AB5678#</td>
            <td>ANOTHER COURSE</td>
            <td>2 hr 0 min</td>
            <td>LT2</td>
          </tr>
          <tr>
            <td>22 NOVEMBER 2025</td>
            <td>SATURDAY</td>
            <td>9.00 AM</td>
            <td>AB9999</td>
            <td>CLOSED BOOK COURSE</td>
            <td>2 hr 0 min</td>
            <td>LT3</td>
          </tr>
        </table>
        </body>
      `;
      const res = parseExamDetails(html, '2025_1', 'UE', 'Semester 1 Academic Year 2025-2026', '113');
      
      expect(res.length).toBeGreaterThan(0);
      
      // Find exams by course code
      const ab1234 = res.find(e => e.course_code === 'AB1234');
      const ab5678 = res.find(e => e.course_code === 'AB5678');
      const ab9999 = res.find(e => e.course_code === 'AB9999');
      
      expect(ab1234).toBeDefined();
      expect(ab1234.exam_type).toBe('Restricted Open Book');
      expect(ab1234.course_title).toBe('TEST COURSE');
      
      expect(ab5678).toBeDefined();
      expect(ab5678.exam_type).toBe('Open Book');
      
      expect(ab9999).toBeDefined();
      expect(ab9999.exam_type).toBe('Closed Book');
    });

    it('should parse exam timetable without exam type legend (NULL exam_type)', () => {
      const html = `
        <body>
        <table>
          <tr><th>Date</th><th>Day</th><th>Time</th><th>Course Code</th><th>Course Title</th><th>Duration</th><th>Venue</th></tr>
          <tr>
            <td>27 APRIL 2026</td>
            <td>MONDAY</td>
            <td>9.00 AM</td>
            <td>CD1234</td>
            <td>FUTURE EXAM</td>
            <td>2 hr 0 min</td>
            <td>LT5</td>
          </tr>
        </table>
        </body>
      `;
      const res = parseExamDetails(html, '2025_2', 'UE', 'Semester 2 Academic Year 2025-2026', '114');
      
      expect(res).toHaveLength(1);
      expect(res[0].course_code).toBe('CD1234');
      expect(res[0].exam_type).toBeNull();
      // Date is left as-is from the table
      expect(res[0].exam_date).toBeTruthy();
      expect(res[0].course_title).toBe('FUTURE EXAM');
      expect(res[0].acadsem).toBe('2025_2');
    });

    it('should handle missing course title gracefully', () => {
      const html = `
        <body>
        <p>* - Restricted Open Book, # - Open Book, + - Open Book</p>
        <table>
          <tr><th>Date</th><th>Day</th><th>Time</th><th>Course Code</th><th>Course Title</th><th>Duration</th><th>Venue</th></tr>
          <tr>
            <td>20 NOVEMBER 2025</td>
            <td>THURSDAY</td>
            <td>9.00 AM</td>
            <td>EF1234</td>
            <td></td>
            <td>2 hr 0 min</td>
            <td>LT1</td>
          </tr>
        </table>
        </body>
      `;
      const res = parseExamDetails(html, '2025_1', 'UE', 'Semester 1 Academic Year 2025-2026', '113');
      
      expect(res.length).toBeGreaterThan(0);
      const exam = res.find(e => e.course_code === 'EF1234');
      expect(exam).toBeDefined();
      // Empty string should become null in the parser
      expect(exam.course_title === null || exam.course_title === '').toBe(true);
      expect(exam.exam_type).toBe('Closed Book');
    });

    it('should handle course code suffixes correctly', () => {
      const html = `
        <body>
        <p>* - Restricted Open Book, # - Open Book, + - Open Book</p>
        <table>
          <tr><th>Date</th><th>Day</th><th>Time</th><th>Course Code</th><th>Course Title</th><th>Duration</th><th>Venue</th></tr>
          <tr>
            <td>20 NOVEMBER 2025</td>
            <td>THURSDAY</td>
            <td>9.00 AM</td>
            <td>GH1234*</td>
            <td>TEST</td>
            <td>2 hr 0 min</td>
            <td>LT1</td>
          </tr>
          <tr>
            <td>21 NOVEMBER 2025</td>
            <td>FRIDAY</td>
            <td>2.00 PM</td>
            <td>IJ5678+</td>
            <td>TEST 2</td>
            <td>2 hr 0 min</td>
            <td>LT2</td>
          </tr>
        </table>
        </body>
      `;
      const res = parseExamDetails(html, '2025_1', 'UE', 'Semester 1 Academic Year 2025-2026', '113');
      
      const gh1234 = res.find(e => e.course_code === 'GH1234');
      const ij5678 = res.find(e => e.course_code === 'IJ5678');
      
      expect(gh1234).toBeDefined();
      expect(gh1234.exam_type).toBe('Restricted Open Book');
      
      expect(ij5678).toBeDefined();
      expect(ij5678.exam_type).toBe('Open Book');
    });
  });
});
