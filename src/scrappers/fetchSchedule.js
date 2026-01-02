const { httpClient } = require('./httpClient');
const { toNtuScheduleSem } = require('../utils/format');

const SCHEDULE_URL = 'https://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main_display1';
const HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' };

const buildPayload = ({
  acadsem,
  rCourseYr = '',
  rSubjCode = '',
  rSearchType = 'F',
  boption = 'CLoad',
  staffAccess = 'false',
}) => {
  const form = new URLSearchParams();

  // Convert to NTU format (e.g. 2025_2 -> 2025;2)
  form.set('acadsem', toNtuScheduleSem(acadsem));
  form.set('r_course_yr', rCourseYr);
  form.set('r_subj_code', rSubjCode);
  form.set('r_search_type', rSearchType);
  form.set('boption', boption);
  form.set('staff_access', staffAccess);
  return form;
};

async function fetchCourseSchedule(params) {
  const { acadsem } = params;
  if (!acadsem) throw new Error('acadsem is required');

  const body = buildPayload(params);
  const res = await httpClient.post(SCHEDULE_URL, body, { headers: HEADERS });
  return res.data;
}

module.exports = {
  fetchCourseSchedule,
};
