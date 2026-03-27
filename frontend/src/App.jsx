import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/user-login/Login";

import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import { ProtectedRoute, PublicRoute } from "./Protected.jsx";

import HomePage from "./components/HomePage";
import UserDetails from "./components/UserDetails";

import Status from "./pages/statusSection/Status.jsx";

import Setting from "./pages/settingSection/Setting.jsx";

import useUserStore from "./store/useUserStore.js";

import { useEffect } from "react";

import { disconnectSocket, initializeSocket } from "./services/chat_service.js";

import { useChatStore } from "./store/chatStore.js";

function App() {
  const { user, checkAuth, isCheckingAuth } = useUserStore(); // Add these from your store
  const { setCurrentUser, initsocketListeners, cleanup } = useChatStore();

  useEffect(() => {
    // 1. Check if user is logged in on mount/refresh
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?._id) {
      const socket = initializeSocket();
      if (socket) {
        setCurrentUser(user);
        initsocketListeners();
      }
    }
    // Cleanup stays the same...
  }, [user?._id]);

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111b21]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00a884]"></div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />

            <Route path="/user-profile" element={<UserDetails />} />

            <Route path="/status" element={<Status />} />

            <Route path="/setting" element={<Setting />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
