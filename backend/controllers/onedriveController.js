const onedriveService = require("../services/onedriveService");

const searchFilesController = async (req, res) => {
  try {
    const searchQuery = req.query.query;
    if (!searchQuery) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const results = await onedriveService.searchFiles(searchQuery);
    return res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const downloadFileController = async (req, res) => {
  try {
    const fileId = req.query.fileId;
    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    await onedriveService.downloadFile(fileId, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { searchFilesController, downloadFileController };
