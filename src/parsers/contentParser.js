const cheerio = require('cheerio');

const clean = (text) => text.replace(/\s+/g, ' ').trim();

// Regex helpers
const isPrereqLabel = (label) => /^\s*pre[-\s]?requisite[s]?:?/i.test(label || '');
const isMutualLabel = (label) => /^\s*mutually?\s*exclusive[s]?:?/i.test(label || '');
const isNotAvailableProgLabel = (label) => /^\s*not\s+available\s+to\s+programme/i.test(label || '');
const isNotAvailableAllLabel = (label) => /^\s*not\s+available\s+to\s+all\s+programme\s+with/i.test(label || '');
const isNotAvailableBDEUELabel = (label) => /^\s*not\s+available\s+as\s+BDE\/UE\s+to\s+programme/i.test(label || '');
const isGradeTypeLabel = (label) => /^\s*grade\s+type/i.test(label || '');
const isUnrestrictedLabel = (label) => /^\s*not\s+offered\s+as\s+unrestricted\s+elective/i.test(label || ''); // Usually matches the whole row text
const isBroadeningDeepeningLabel = (label) => /^\s*not\s+offered\s+as\s+broadening\s+and\s+deepening\s+elective/i.test(label || ''); // Usually matches the whole row text
const isDescriptionLabel = (label) => /^\s*description[:\s]*$/i.test(label || '');

const parseCourseTable = ($table, $, acadsem) => {
  const rows = $table.find('tr').toArray();
  if (!rows.length) return [];

  const courses = [];
  let course = null;
  let lastLabel = '';

  rows.forEach((row) => {
    const cells = $(row).find('td');
    if (!cells.length) return;

    const firstText = clean(cells.eq(0).text());
    const cellCount = cells.length;

    // Header row check
    if (cellCount >= 3 && firstText.toUpperCase() === 'COURSE CODE') {
      course = null;
      lastLabel = '';
      return;
    }

    // New Course Start
    if (cellCount >= 3 && firstText && !isPrereqLabel(firstText) && !isMutualLabel(firstText) && !isNotAvailableProgLabel(firstText) && !isNotAvailableAllLabel(firstText) && !isNotAvailableBDEUELabel(firstText) && !isGradeTypeLabel(firstText) && !isUnrestrictedLabel(firstText) && !isBroadeningDeepeningLabel(firstText) && !isDescriptionLabel(firstText)) {
      const code = clean(cells.eq(0).text());
      const title = clean(cells.eq(1).text());
      const auText = clean(cells.eq(2).text() || '');
      const parsedAU = parseFloat(auText.replace('AU', '').trim());
      const au = isNaN(parsedAU) ? null : parsedAU;
      const dept = clean(cells.eq(3).text() || ''); // 4th column is Dept

      if (code && title) {
        course = {
          course_code: code,
          acadsem,
          title,
          au,
          department_code: dept,
          description: '',
          prerequisites: '',
          mutual_exclusions: '',
          not_available_to_programme: '',
          not_available_to_all_programme_with: '',
          not_available_as_bde_ue_to_programme: '',
          is_unrestricted_elective: true,
          is_broadening_deepening_elective: true,
          grade_type: '',
        };
        courses.push(course);
      }
      lastLabel = '';
      return;
    }

    if (!course) return;

    // Process Detail Rows
    // Some rows have Label in col 0, Value in col 1.
    // Some have Label in col 0, Value in col 1 + col 2 (merged).
    // Some just span all cols (like Description or Unrestricted warning).

    const label = clean(cells.eq(0).text());
    const rowText = clean($(row).text());
    
    // Handle "Not offered as Unrestricted Elective" which usually spans
    if (isUnrestrictedLabel(rowText)) {
      course.is_unrestricted_elective = false;
      return;
    }
    
    // Handle "Not offered as Broadening and Deepening Elective" which usually spans
    if (isBroadeningDeepeningLabel(rowText)) {
      course.is_broadening_deepening_elective = false;
      return;
    }

    const valueCol1 = clean(cells.eq(1).text());
    const valueCol2 = clean(cells.eq(2).text() || '');
    let mergedValue = valueCol2 ? `${valueCol1} ${valueCol2}`.trim() : valueCol1;
    
    // If no label, use the raw text of the row/cell for description continuation if applicable
    // But be careful not to capture junk.

    if (isPrereqLabel(label)) {
      course.prerequisites = mergedValue;
      lastLabel = 'prerequisite';
      return;
    }
    if (isMutualLabel(label)) {
      course.mutual_exclusions = mergedValue;
      lastLabel = 'mutual';
      return;
    }
    if (isNotAvailableProgLabel(label)) {
      course.not_available_to_programme = mergedValue;
      lastLabel = 'na_prog';
      return;
    }
    if (isNotAvailableAllLabel(label)) {
      course.not_available_to_all_programme_with = mergedValue;
      lastLabel = 'na_all';
      return;
    }
    if (isNotAvailableBDEUELabel(label)) {
      course.not_available_as_bde_ue_to_programme = mergedValue;
      lastLabel = 'na_bde_ue';
      return;
    }
    if (isGradeTypeLabel(label)) {
      course.grade_type = mergedValue;
      lastLabel = 'grade';
      return;
    }
    
    // Description Logic
    if (isDescriptionLabel(label)) {
      // Usually description starts here.
      course.description = mergedValue; // If any value is here
      lastLabel = 'description';
      return;
    }

    // Continuation logic
    if (!label && mergedValue) {
        if (lastLabel === 'prerequisite') course.prerequisites += ` ${mergedValue}`;
        else if (lastLabel === 'mutual') course.mutual_exclusions += ` ${mergedValue}`;
        else if (lastLabel === 'na_prog') course.not_available_to_programme += ` ${mergedValue}`;
        else if (lastLabel === 'na_all') course.not_available_to_all_programme_with += ` ${mergedValue}`;
        else if (lastLabel === 'na_bde_ue') course.not_available_as_bde_ue_to_programme += ` ${mergedValue}`;
        else if (lastLabel === 'grade') course.grade_type += ` ${mergedValue}`;
        else if (lastLabel === 'description') course.description = course.description ? `${course.description} ${mergedValue}` : mergedValue;
        return;
    }

    // Handle colspan description rows (often just a block of text)
    const colspanCell = cells.filter((_, cell) => cell.attribs && cell.attribs.colspan);
    if (colspanCell.length) {
        const text = clean(colspanCell.text());
        // Filter out the "Not offered..." warnings which we already caught or other labels
        if (text && !isUnrestrictedLabel(text) && !isBroadeningDeepeningLabel(text) && !isPrereqLabel(text) && !isMutualLabel(text)) {
            // Assume it's description if we haven't seen other labels recently or strictly if it looks like text
             course.description = course.description ? `${course.description} ${text}`.trim() : text;
        }
    }
  });

  return courses;
};

function parseContent(html, acadsem) {
  const $ = cheerio.load(html);
  const courses = [];

  $('table').each((_, table) => {
    const parsed = parseCourseTable($(table), $, acadsem);
    if (parsed.length) {
      courses.push(...parsed);
    }
  });

  // Trim all fields final pass
  return courses.map(c => ({
      ...c,
      prerequisites: c.prerequisites.trim(),
      mutual_exclusions: c.mutual_exclusions.trim(),
      not_available_to_programme: c.not_available_to_programme.trim(),
      not_available_to_all_programme_with: c.not_available_to_all_programme_with.trim(),
      not_available_as_bde_ue_to_programme: c.not_available_as_bde_ue_to_programme.trim(),
      description: c.description.trim(),
      grade_type: c.grade_type.trim()
  }));
}

module.exports = {
  parseContent,
};
