// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");


const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const logRoutes = require("./routes/logRoutes");
// Connect to Mongo

connectDB(process.env.MONGO_URI);
const helmet = require("helmet");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cors({
    origin: "http://64.227.130.93:3001", 
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
app.use(helmet());  
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/chats", chatRoutes);
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
