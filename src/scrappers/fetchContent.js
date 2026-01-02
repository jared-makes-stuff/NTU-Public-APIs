const { httpClient } = require('./httpClient');

const CONTENT_URL = 'https://wis.ntu.edu.sg/webexe/owa/AUS_SUBJ_CONT.main_display1';
const HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' };

const splitAcadsem = (acadsem) => {
  const [year = '', sem = ''] = String(acadsem).split('_');
  return { acad: year, semester: sem };
};

const buildPayload = ({ acadsem, rCourseYr = '', rSubjCode = '', boption }) => {
  const form = new URLSearchParams();
  const { acad, semester } = splitAcadsem(acadsem);
  
  form.set('acadsem', acadsem);
  form.set('acad', acad);
  form.set('semester', semester);
  const mode = boption || (rSubjCode ? 'Search' : 'CLoad');
  form.set('boption', mode);
  form.set('r_course_yr', rCourseYr);
  form.set('r_subj_code', rSubjCode);

  return form;
};

async function fetchCourseContent(params) {
  const { acadsem } = params;
  if (!acadsem) throw new Error('acadsem is required');

  const body = buildPayload(params);
  const res = await httpClient.post(CONTENT_URL, body, { headers: HEADERS });
  return res.data;
}

module.exports = {
  fetchCourseContent,
};
