const axios = require('axios');

const client = axios.create({
  timeout: Number(process.env.HTTP_TIMEOUT_MS || 10000),
  headers: {
    'User-Agent': 'NTU-Scraper/2.0',
  },
});

/**
 * Makes a POST request with form-encoded data
 * @param {string} url - Target URL
 * @param {object} data - Form data to send
 * @returns {Promise<string>} Response HTML
 */
async function postRequest(url, data) {
  const response = await client.post(url, new URLSearchParams(data), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
}

module.exports = {
  httpClient: client,
  postRequest,
};
