const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDb = require("./config/dbConnect");
const chatRoute = require("./routes/chatRoute.js");
const authRoute = require("./routes/authRoute.js");
const statusRoute = require("./routes/statusRoute.js");
const initilizeSocket = require("./services/socketService.js");
const http = require("http");
const cookieParser= require('cookie-parser')
const bodyParser = require("body-parser")

dotenv.config();

const PORT = process.env.PORT;
const baseUri = process.env.FRONTEND_URL;
const app = express();

// cors 
const corsOptions = {
  origin: baseUri,
  credentials:true
}
app.use(cors(corsOptions))


// middleware
app.use(express.json());
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }));

// database
connectDb();

const server = http.createServer(app);
const io = initilizeSocket(server);

// apply socket middleware before routes
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
