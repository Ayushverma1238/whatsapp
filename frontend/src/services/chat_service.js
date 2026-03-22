import { io } from 'socket.io-client';
import useUserStore from '../store/useUserStore';

let socket = null;

export const initializeSocket = () => {
    // 1. Singleton check
    if (socket) return socket;

    // 2. Get User State
    const user = useUserStore.getState().user;
    if (!user) {
        console.warn("Socket initialization skipped: No user found in store.");
        return null;
    }

    const BACKEND_URL = import.meta.env.VITE_API_URL;

    // 3. Connect with fixed transport typo
    socket = io(BACKEND_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'], // Fixed 'ploling'
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    // 4. Setup core listeners
    socket.on("connect", () => {
        console.log("✅ Socket Connected:", socket.id);
        // Inform backend which user this socket belongs to
        socket.emit("user_connected", user._id);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
    });

    // Fixed event name from 'disconnected' to 'disconnect'
    socket.on('disconnect', (reason) => {
        console.log("🔌 Socket disconnected:", reason);
    });

    return socket; // Crucial for getSocket() to work
};

export const getSocket = () => {
    if (!socket) {
        return initializeSocket();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log("🛑 Socket manually destroyed.");
    }
};