const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDb = require("./config/dbConnect");
const chatRoute = require("./routes/chatRoute.js");
const authRoute = require("./routes/authRoute.js");
const statusRoute = require("./routes/statusRoute.js");
const initilizeSocket = require("./services/socketService.js");
const http = require("http");

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

const corsOption = {
  origin: process.env.FRONTEND_URL,
  credentials: true
};

app.use(cors(corsOption));

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// database
connectDb();

const server = http.createServer(app);
const io = initilizeSocket(server);

app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

// routes
app.use("/api/auth", authRoute);
app.use("/api/chats", chatRoute);
app.use("/api/status", statusRoute);

server.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});