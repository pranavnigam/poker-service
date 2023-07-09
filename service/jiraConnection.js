const { default: axios } = require('axios');

const baseUrl = '';



async function loginToJira() {
  try {
    const url = `${baseUrl}/rest/auth/1/session`;
    const body = {
      "username": "username",
      "password": "password"
    }
    const response = await axios.post(url, body);
    console.log("Login Response: ", response);
    return response.data.session;
  } catch (error) {
    console.error('Error logging into Jira:', error);
    throw error;
  }
}

async function fetchIssue(issueKey, session) {
  try {
      const url = `${baseUrl}/rest/api/2/issue/${issueKey}`;
      const response = await axios.get(url, {
      headers: {
        Cookie: `${session.name}=${session.value}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Jira issue:', error);
    throw error;
  }
}

module.exports = {
    loginToJira,
    fetchIssue
}