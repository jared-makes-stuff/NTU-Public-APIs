const { parseContent } = require('../src/parsers/contentParser');

describe('Broadening and Deepening Elective Parser', () => {
  it('should parse course with "Not offered as Broadening and Deepening Elective"', () => {
    const html = `
      <table>
        <tr><td>COURSE CODE</td><td>TITLE</td><td>AU</td><td>PROGRAMME/(DEPT MAINTAIN*)</td></tr>
        <tr><td>MA0218</td><td>MATH COURSE</td><td>3.0</td><td>MATH</td></tr>
        <tr><td>Prerequisite:</td><td colspan="2">MA0001</td></tr>
        <tr><td>Not available as BDE/UE to Programme:</td><td colspan="2">ACBS, ACC, ADM</td></tr>
        <tr><td colspan="3"><b>Not offered as Broadening and Deepening Elective</b></td></tr>
        <tr><td colspan="4">This is a math course description.</td></tr>
      </table>
    `;
    const res = parseContent(html, '2025_1');
    expect(res).toHaveLength(1);
    expect(res[0].course_code).toBe('MA0218');
    expect(res[0].title).toBe('MATH COURSE');
    expect(res[0].prerequisites).toBe('MA0001');
    expect(res[0].not_available_as_bde_ue_to_programme).toBe('ACBS, ACC, ADM');
    expect(res[0].is_broadening_deepening_elective).toBe(false);
    expect(res[0].description).toBe('This is a math course description.');
    // Ensure BDE text is NOT in the description
    expect(res[0].description).not.toContain('Broadening and Deepening');
  });

  it('should default to true if "Not offered as Broadening and Deepening Elective" is absent', () => {
    const html = `
      <table>
        <tr><td>COURSE CODE</td><td>TITLE</td><td>AU</td><td>PROGRAMME/(DEPT MAINTAIN*)</td></tr>
        <tr><td>AB1234</td><td>Test Course</td><td>3.0</td><td>ACC</td></tr>
        <tr><td>description</td><td>This is a test course.</td><td></td><td></td></tr>
      </table>
    `;
    const res = parseContent(html, '2025_1');
    expect(res).toHaveLength(1);
    expect(res[0].course_code).toBe('AB1234');
    expect(res[0].is_broadening_deepening_elective).toBe(true);
  });

  it('should handle both UE and BDE restrictions in the same course', () => {
    const html = `
      <table>
        <tr><td>COURSE CODE</td><td>TITLE</td><td>AU</td><td>PROGRAMME/(DEPT MAINTAIN*)</td></tr>
        <tr><td>SC1003</td><td>COMPUTER COURSE</td><td>3.0</td><td>CSC</td></tr>
        <tr><td colspan="3"><b>Not offered as Unrestricted Elective</b></td></tr>
        <tr><td colspan="3"><b>Not offered as Broadening and Deepening Elective</b></td></tr>
        <tr><td colspan="4">Programming course.</td></tr>
      </table>
    `;
    const res = parseContent(html, '2025_1');
    expect(res).toHaveLength(1);
    expect(res[0].course_code).toBe('SC1003');
    expect(res[0].is_unrestricted_elective).toBe(false);
    expect(res[0].is_broadening_deepening_elective).toBe(false);
  });
});
