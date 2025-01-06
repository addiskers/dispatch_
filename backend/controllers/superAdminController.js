// controllers/superAdminController.js
const User = require("../models/User");
exports.getActivityLogs = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied: Only superadmin can view activity logs" });
      }
  
      const users = await User.find({}, "username activityLogs");
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ message: "Error fetching activity logs", error });
    }
  };

  

  exports.getAllUsers = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied: Only superadmin can access this route" });
      }
  
      const users = await User.find({}, "username role _id");
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  };
  