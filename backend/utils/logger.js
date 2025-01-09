const Log = require("../models/Log");

const logActivity = async (userId, action, details) => {
  try {
    await Log.create({
      user: userId,
      action,
      ...details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

module.exports = { logActivity };
