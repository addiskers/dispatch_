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
 * @param {string} date - Date of the event 
 * @param {string[]} attendees - List of attendee email addresses
 */
const createOutlookEvent = async (subject, body, dateTime, attendees) => {
    try {
      const graphClient = await getGraphClient();
      const calendarUser = process.env.OUTLOOK_USER_EMAIL;
  
      const eventDate = new Date(dateTime);
      eventDate.setHours(9, 30, 0);
  
      const event = {
        subject,
        body: {
          contentType: "HTML",
          content: body,
        },
        start: {
          dateTime: eventDate.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: new Date(eventDate.getTime() + 3600000).toISOString(),
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

module.exports = { createOutlookEvent };
