const { httpClient } = require('./httpClient');

const SCHEDULE_FORM_URL = 'https://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main';
const CONTENT_FORM_URL = 'https://wis.ntu.edu.sg/webexe/owa/AUS_SUBJ_CONT.main';

async function fetchScheduleForm() {
  const res = await httpClient.get(SCHEDULE_FORM_URL);
  return res.data;
}

async function fetchContentForm() {
  const res = await httpClient.get(CONTENT_FORM_URL);
  return res.data;
}

module.exports = {
  fetchScheduleForm,
  fetchContentForm,
};
