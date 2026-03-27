import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null; // Defined outside the function

const token = () => localStorage.getItem('auth_token')



export const initializeSocket = () => {
  // 1. If socket already exists, DON'T create a new one.
  // Just return the existing instance (even if it's currently connecting)
  if (socket) {
    return socket; 
  }

  const user = useUserStore.getState().user;
  const BACKEND_URL = import.meta.env.VITE_API_URL;

  // 2. Create Connection ONLY if socket is null
  socket = io(BACKEND_URL, {
    auth:{token},
    // withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 45000,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    if (user?._id) {
      socket.emit("user_connected", user._id);
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    // If the server disconnected us, we might want to clear the instance
    if (reason === "io server disconnect") {
       socket.connect(); // Manually reconnect if kicked by server
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
