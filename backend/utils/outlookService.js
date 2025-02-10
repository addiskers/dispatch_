const { Client } = require("@microsoft/microsoft-graph-client");
const axios = require("axios");
require("isomorphic-fetch");

const getAccessToken = async () => {
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Token error:", error.response?.data);
    throw error;
  }
};

const getGraphClient = async () => {
  const accessToken = await getAccessToken();
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};

/**
 * Create Outlook Event
 * @param {string} subject - Event title
 * @param {string} body - Event description
 * @param {string} dateTime - Date of the event (format: YYYY-MM-DD)
 * @param {string[]} attendees - List of attendee email addresses
 */
const createOutlookEvent = async (subject, body, dateTime, attendees) => {
  try {
    const graphClient = await getGraphClient();
    const calendarUser = process.env.OUTLOOK_USER_EMAIL;
    
    const [year, month, day] = dateTime.split('-');
    
    const startDateTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T09:30:00.000`;
    const endDateTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T10:30:00.000`;

    const event = {
      subject,
      body: {
        contentType: "HTML",
        content: body,
      },
      start: {
        dateTime: startDateTime,
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "Asia/Kolkata",
      },
      attendees: attendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      })),
    };

    return await graphClient
      .api(`/users/${calendarUser}/events`)
      .post(event);
  } catch (error) {
    console.error("Error creating Outlook event:", error);
    throw new Error("Failed to create Outlook event.");
  }
};

module.exports = {
  createOutlookEvent,
};