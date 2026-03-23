import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null;

export const initializeSocket = () => {
  // 1. Singleton check: If already connected, don't create a new one
  if (socket && socket.connected) {
    return socket;
  }

  // 2. Get the latest User & Token at the MOMENT of initialization
  const user = useUserStore.getState().user;
  const token = localStorage.getItem("auth_token");

  // Safety checks
  if (!user) {
    console.warn("Socket initialization skipped: No user found in store.");
    return null;
  }

  if (!token) {
    console.error(
      "Socket initialization skipped: No auth_token found in localStorage.",
    );
    return null;
  }

  const BACKEND_URL = import.meta.env.VITE_API_URL;

  // 3. Create Connection
  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnectionAttempts: 10, // Increase for mobile users on weak networks
    reconnectionDelay: 2000, // Wait 2s before retrying to give Render time to breathe
    timeout: 45000, // IMPORTANT: Render Free Tier can take 30s+ to "wake up"
    withCredentials: true,
  });

  // 4. Setup Core Listeners
  socket.on("connect", () => {
    // Inform backend which user this socket belongs to
    // Use user?._id to prevent crashes if user object is malformed
    if (user?._id) {
      socket.emit("user_connected", user._id);
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);

    // If the backend middleware throws "Unauthorized", it means the token expired or is missing
    if (error.message === "Unauthorized access. Token missing.") {
      console.warn("Token is invalid. You might need to log in again.");
      // Optional: localStorage.removeItem("auth_token");
    }
  });

  socket.on("disconnect", (reason) => {
    // 'io server disconnect' means the server kicked us out (likely auth error)
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
