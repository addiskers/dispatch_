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
    console.error("Token error:", error.response?.data || error.message);
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

const getSharedFolderInfo = async () => {
  try {
    const client = await getGraphClient();
    
    const siteResponse = await client
      .api(`/sites/${process.env.SITE_DOMAIN}:/personal/${process.env.USER_EMAIL}`)
      .get();
    const driveResponse = await client
      .api(`/sites/${siteResponse.id}/drives`)
      .get();   
    const driveId = driveResponse.value[0].id;
    const folderResponse = await client
      .api(`/drives/${driveId}/root:${process.env.FOLDER_PATH}`)
      .get();
    
    return {
      siteId: siteResponse.id,
      driveId: driveId,
      folderId: folderResponse.id
    };
  } catch (error) {
    console.error("Error getting shared folder info:", error.message);
    throw error;
  }
};

/**
 * @param {string} searchQuery - Keyword to search for
 */
const searchFiles = async (searchQuery) => {
  try {
    const client = await getGraphClient();
    const { driveId, folderId } = await getSharedFolderInfo();
    
    const response = await client
      .api(`/drives/${driveId}/items/${folderId}/search`)
      .query({ q: searchQuery })
      .get();
    
    const pdfFiles = response.value.filter(file => 
      file.file && file.name.toLowerCase().endsWith(".pdf")
    );
    return pdfFiles;
  } catch (error) {
    console.error("Error searching files:", error.response?.data || error.message);
    throw error;
  }
};


/**
 * @param {string} fileId - The ID of the file to download
 */
const downloadFile = async (fileId, res) => {
  try {
    const client = await getGraphClient();
    const { driveId } = await getSharedFolderInfo();
    
    const fileResponse = await client
      .api(`/drives/${driveId}/items/${fileId}/content`)
      .responseType("arraybuffer") 
      .get();

    res.setHeader("Content-Disposition", `attachment; filename="downloaded-file.pdf"`);
    res.setHeader("Content-Type", "application/pdf"); 
    res.setHeader("Content-Length", fileResponse.byteLength);
    res.send(Buffer.from(fileResponse));
  } catch (error) {
    console.error("Error downloading file:", error.message);
    res.status(500).json({ error: "Failed to download file" });
  }
}; 



module.exports = { searchFiles, downloadFile };
  
console.log("Functions exported");