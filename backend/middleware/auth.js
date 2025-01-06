const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access denied: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 

    if (["/register", "/update-password", "/activity-logs"].includes(req.path) && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied: Only superadmin can access this route" });
    }

    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid token" });
  }
};