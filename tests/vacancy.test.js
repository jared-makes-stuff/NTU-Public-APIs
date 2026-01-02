const { parseVacancyHtml, parseNumber, formatIndexDisplay, formatCourseDisplay } = require('../src/parsers/vacancyParser');

describe('Vacancy Parser', () => {
  describe('parseNumber', () => {
    it('should parse valid numbers', () => {
      expect(parseNumber('5')).toBe(5);
      expect(parseNumber('0')).toBe(0);
      expect(parseNumber('123')).toBe(123);
    });

    it('should handle empty or invalid strings', () => {
      expect(parseNumber('')).toBe(0);
      expect(parseNumber('   ')).toBe(0);
      expect(parseNumber('&nbsp;')).toBe(0);
      expect(parseNumber('-')).toBe(0);
      expect(parseNumber('N/A')).toBe(0);
    });

    it('should handle invalid input gracefully', () => {
      expect(parseNumber('abc')).toBe(0);
      expect(parseNumber('12.5')).toBe(12);
    });
  });

  describe('parseVacancyHtml', () => {
    it('should parse vacancy HTML correctly', () => {
      const html = `
        <table border="1">
          <tr><th>INDEX</th><th>VACANCY</th><th>WAITLIST</th><th>TYPE</th><th>GROUP</th><th>DAY</th><th>TIME</th><th>VENUE</th></tr>
          <tr>
            <td>10294</td>
            <td>5</td>
            <td>2</td>
            <td>LEC</td>
            <td>LE1</td>
            <td>MON</td>
            <td>0830-1030</td>
            <td>LT1A</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>TUT</td>
            <td>T01</td>
            <td>WED</td>
            <td>1330-1430</td>
            <td>TR+12</td>
          </tr>
          <tr>
            <td>10295</td>
            <td>0</td>
            <td>10</td>
            <td>LEC</td>
            <td>LE1</td>
            <td>TUE</td>
            <td>1430-1630</td>
            <td>LT2</td>
          </tr>
        </table>
      `;

      const result = parseVacancyHtml(html, 'SC2103');

      expect(result.error).toBeNull();
      expect(result.indexes).toHaveLength(2);
      
      // First index
      expect(result.indexes[0].index).toBe('10294');
      expect(result.indexes[0].vacancy).toBe(5);
      expect(result.indexes[0].waitlist).toBe(2);
      expect(result.indexes[0].classes).toHaveLength(2);
      expect(result.indexes[0].classes[0].type).toBe('LEC');
      expect(result.indexes[0].classes[0].day).toBe('MON');
      expect(result.indexes[0].classes[1].type).toBe('TUT');
      
      // Second index
      expect(result.indexes[1].index).toBe('10295');
      expect(result.indexes[1].vacancy).toBe(0);
      expect(result.indexes[1].waitlist).toBe(10);
      expect(result.indexes[1].classes).toHaveLength(1);
    });

    it('should return empty array when no table found', () => {
      const html = '<html><body>No table here</body></html>';
      const result = parseVacancyHtml(html, 'SC9999');
      expect(result.indexes).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should handle rows with insufficient columns', () => {
      const html = `
        <table border="1">
          <tr><th>INDEX</th><th>VACANCY</th></tr>
          <tr><td>10294</td><td>5</td></tr>
        </table>
      `;
      const result = parseVacancyHtml(html, 'SC2103');
      expect(result.indexes).toEqual([]);
    });

    it('should extract error message from alert', () => {
      const html = `
        <head></head>
        <SCRIPT>
        alert(" Check Vacancies is only available from 9.00 am to 10.00pm daily !")
        </SCRIPT>
        <SCRIPT>
        window.close()
        </SCRIPT>
      `;
      const result = parseVacancyHtml(html, 'SC2103');
      expect(result.indexes).toEqual([]);
      expect(result.error).toBe('Check Vacancies is only available from 9.00 am to 10.00pm daily !');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<table><tr><td>broken</td></tr>';
      const result = parseVacancyHtml(html, 'SC2103');
      expect(result.indexes).toEqual([]);
    });
  });

  describe('formatIndexDisplay', () => {
    it('should format index information correctly', () => {
      const indexInfo = {
        index: '10294',
        vacancy: 5,
        waitlist: 2,
        classes: [
          { type: 'LEC', group: 'LE1', day: 'MON', time: '0830-1030', venue: 'LT1A' },
          { type: 'TUT', group: 'T01', day: 'WED', time: '1330-1430', venue: 'TR+12' }
        ]
      };

      const result = formatIndexDisplay(indexInfo);
      
      expect(result).toContain('Index 10294');
      expect(result).toContain('Vacancies: 5');
      expect(result).toContain('Waitlist: 2');
      expect(result).toContain('LEC (LE1) - MON 0830-1030 @ LT1A');
      expect(result).toContain('TUT (T01) - WED 1330-1430 @ TR+12');
    });

    it('should handle missing index gracefully', () => {
      const indexInfo = { classes: [] };
      const result = formatIndexDisplay(indexInfo);
      expect(result).toContain('Index undefined');
    });
  });

  describe('formatCourseDisplay', () => {
    it('should format course with indexes correctly', () => {
      const indexes = [
        {
          index: '10294',
          vacancy: 5,
          waitlist: 2,
          classes: [
            { type: 'LEC', group: 'LE1', day: 'MON', time: '0830-1030', venue: 'LT1A' }
          ]
        }
      ];

      const result = formatCourseDisplay('SC2103', indexes);
      
      expect(result).toContain('Course: SC2103');
      expect(result).toContain('Index 10294');
    });

    it('should handle empty indexes array', () => {
      const result = formatCourseDisplay('SC2103', []);
      expect(result).toBe('No indexes found for course SC2103');
    });

    it('should handle null indexes', () => {
      const result = formatCourseDisplay('SC2103', null);
      expect(result).toBe('No indexes found for course SC2103');
    });
  });
});
