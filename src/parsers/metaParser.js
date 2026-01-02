const cheerio = require('cheerio');

const clean = (text) => text.replace(/\s+/g, ' ').trim();

const selectOptions = ($, name) =>
  $(`select[name="${name}"] option`)
    .map((_, option) => {
      const el = $(option);
      const value = clean(el.attr('value') || '');
      const label = clean(el.text());
      if (!value) return null;
      return { value, label };
    })
    .get();

const radioOptions = ($, name) =>
  $(`input[name="${name}"][type="radio"]`)
    .map((_, input) => {
      const el = $(input);
      return {
        value: clean(el.attr('value') || ''),
        label: clean(el.parent().text() || ''),
        checked: !!el.attr('checked'),
      };
    })
    .get();

function parseScheduleOptions(html) {
  const $ = cheerio.load(html);
  return {
    acadsem: selectOptions($, 'acadsem'),
    courseYears: selectOptions($, 'r_course_yr'),
    searchTypes: radioOptions($, 'r_search_type'),
  };
}

function parseContentOptions(html) {
  const $ = cheerio.load(html);
  return {
    acadsem: selectOptions($, 'acadsem'),
    courseYears: selectOptions($, 'r_course_yr'),
  };
}

module.exports = {
  parseScheduleOptions,
  parseContentOptions,
};
