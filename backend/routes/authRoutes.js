const express = require("express");
const router = express.Router();
const {
  login,
  registerUser,
  updatePassword,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const {
  getAllUsers,
  getActivityLogs, // Import the missing function
} = require("../controllers/superAdminController");

// Auth Routes
router.post("/login", login);

// Super Admin Routes
router.post("/register", authMiddleware, registerUser);
router.patch("/update-password", authMiddleware, updatePassword);
router.get("/activity-logs", authMiddleware, getActivityLogs);
router.get("/users", authMiddleware, getAllUsers);

module.exports = router;
