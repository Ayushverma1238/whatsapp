import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null; // Defined outside the function

const token = () => localStorage.getItem('auth_token')


export const initializeSocket = () => {
  // 1. If socket already exists, DON'T create a new one.
  if (socket) return socket; 

  // FIX: Get the token here so it's not undefined!
  const token = localStorage.getItem("auth_token");
  const user = useUserStore.getState().user;
  const BACKEND_URL = import.meta.env.VITE_API_URL;

  // 2. Create Connection
  socket = io(BACKEND_URL, {
    auth: { token }, // Now 'token' actually has a value
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 45000,
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
    // Note: Use user?._id or String(user?._id) to be safe
    const userId = user?._id || user?.id;
    if (userId) {
      socket.emit("user_connected", userId);
    }
  });

  socket.on("connect_error", (error) => {
    // If you see 'jwt must be provided' here, check if localStorage has the token
    console.error("❌ Socket connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    if (reason === "io server disconnect") {
      socket.connect(); 
    }
  });

  return socket;
};


/**
 * Returns the existing socket or initializes a new one.
 */
export const getSocket = () => {
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
};

/**
 * Fully destroys the socket instance (Used during Logout).
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
