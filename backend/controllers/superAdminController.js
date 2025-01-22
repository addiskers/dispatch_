// controllers/superAdminController.js
const User = require("../models/User");
const Log = require("../models/Log");



  exports.getFilteredLogs = async (req, res) => {
    try {
      const { leadId, userId, startDate, endDate, action } = req.query;

      const filter = {};

      if (req.user.role === "sales") {
        filter.user = req.user.userId; 
      } else if (req.user.role === "uploader") {
        if (leadId) {
          filter.leadId = leadId;
        }
      } else if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }

      if (leadId) filter.leadId = leadId;
      if (userId) filter.user = userId;
      if (action) filter.action = action;
      if (startDate && endDate) {
        filter.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const logs = await Log.find(filter).populate("user", "username role").sort({ timestamp: -1 });
      res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Error fetching logs", error });
    }
  };

  

  exports.getAllUsers = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied: Only superadmin can access this route" });
      }
  
      const users = await User.find({}, "username email role _id");      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  };

  exports.getActivityLogs = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied" });
      }
  
      const logs = await Log.find().populate("user", "username role");
      res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Error fetching activity logs", error });
    }
  };


  exports.getSalesUsers = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied: Only superadmin can access this route" });
      }
  
      const salesUsers = await User.find({ role: "sales" }, "username _id role");
      res.status(200).json(salesUsers);
    } catch (error) {
      console.error("Error fetching sales users:", error);
      res.status(500).json({ message: "Error fetching sales users", error });
    }
  };
  