import { io } from 'socket.io-client';
import useUserStore from '../store/useUserStore';

let socket = null;

/**
 * Initializes the socket connection.
 * Fetches the latest token from localStorage every time to avoid 'Unauthorized' errors.
 */
export const initializeSocket = () => {
    // 1. Singleton check: If already connected, don't create a new one
    if (socket && socket.connected) {
        console.log("Status: Socket already connected.");
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
        console.error("Socket initialization skipped: No auth_token found in localStorage.");
        return null;
    }

    const BACKEND_URL = import.meta.env.VITE_API_URL;

    // 3. Create Connection
    // Note: We pull 'token' here so it's fresh after login
    socket = io(BACKEND_URL, {
        auth: { token }, 
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000, // Higher timeout for Render 'cold starts'
        withCredentials: true,
    });

    // 4. Setup Core Listeners
    socket.on("connect", () => {
        console.log("✅ Socket Connected to Render:", socket.id);
        
        // Inform backend which user this socket belongs to
        // Use user?._id to prevent crashes if user object is malformed
        if (user?._id) {
            socket.emit("user_connected", user._id);
        }
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        
        // If the backend middleware throws "Unauthorized", it means the token expired or is missing
        if (error.message === "Unauthorized access. Token missing.") {
            console.warn("Token is invalid. You might need to log in again.");
            // Optional: localStorage.removeItem("auth_token");
        }
    });

    socket.on('disconnect', (reason) => {
        console.log("🔌 Socket disconnected:", reason);
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
        console.log("🛑 Socket manually destroyed and cleared.");
    }
};