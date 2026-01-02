const cheerio = require('cheerio');

const clean = (text) => text.replace(/\s+/g, ' ').trim();

const isScheduleTable = ($table, $) => {
  const headers = $table
    .find('th')
    .map((_, th) => clean($(th).text()).toUpperCase())
    .get();
  return headers.includes('INDEX') && headers.includes('TYPE');
};

const parseScheduleRows = ($table, $) => {
  const rows = [];
  const rowElements = $table.find('tr').slice(1); // skip header
  let currentIndex = null;

  rowElements.each((_, row) => {
    const cells = $(row).find('td');
    if (!cells.length) return;
    
    const idxText = clean(cells.eq(0).text());
    // If index is empty, it inherits from the previous row (same index, multiple sessions)
    if (idxText) currentIndex = idxText;

    rows.push({
      index: currentIndex || '',
      type: clean(cells.eq(1).text()),
      group: clean(cells.eq(2).text()),
      day: clean(cells.eq(3).text()),
      time: clean(cells.eq(4).text()),
      venue: clean(cells.eq(5).text()),
      remark: clean(cells.eq(6).text()),
    });
  });

  return rows;
};

function parseSchedule(html, acadsem) {
  const $ = cheerio.load(html);
  const courses = [];
  let currentCourse = null;

  $('table').each((_, table) => {
    const $table = $(table);

    if (isScheduleTable($table, $)) {
      if (!currentCourse) return;
      const sections = parseScheduleRows($table, $);
      // Filter out empty rows if any
      currentCourse.sections = sections.filter(s => s.index);
      courses.push(currentCourse);
      currentCourse = null;
      return;
    }

    // Check for Course Header Table
    const firstRowCells = $table.find('tr').first().find('td');
    if (firstRowCells.length >= 2) {
      const code = clean(firstRowCells.eq(0).text());
      const title = clean(firstRowCells.eq(1).text());
      // Regex check to ensure it looks like a course code (e.g. AB1234)
      // and not some random table
      if (code && title && /^[A-Za-z0-9]+$/.test(code)) {
        currentCourse = { 
            course_code: code, 
            acadsem, 
            sections: [] 
        };
      }
    }
  });

  return courses;
}

module.exports = {
  parseSchedule,
};
