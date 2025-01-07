const Log = require("../models/Log");

async function logActivity(userId, action, details) {
  try {
    await Log.create({
      user: userId,
      action,
      ...details,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

module.exports = logActivity;
