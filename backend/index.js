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

const allowedOrigins = [
  'https://whatsapp-clone-taupe-nu.vercel.app', // Your main "Taupe" URL
  /\.vercel\.app$/                             // Any URL ending in .vercel.app (Regex)
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps) 
    // or if the origin is in our allowed list/regex
    if (!origin || allowedOrigins.some(pattern => 
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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
