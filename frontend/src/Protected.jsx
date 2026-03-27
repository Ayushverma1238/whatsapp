import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkUserAuth } from "./services/user_services";
import Loader from "./utils/Loader";

export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkUserAuth();
        // If the API succeeds
        if (result?.isAuthenticated) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch (error) {
        // This catches the 401 error!
        // Instead of crashing, we just clear the user.
        console.warn("User is not authenticated (expected if logged out)");
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verifyAuth();
  }, [setUser, clearUser]); // Removed isAuthenticated from deps to avoid loops

  if (isChecking) return <Loader />;

  // FIX: Added 'return' keyword
  if (!isAuthenticated) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const PublicRoute = () => {
  const { isAuthenticated } = useUserStore();
  const [isChecking, setIsChecking] = useState(true);
  const { setUser, clearUser } = useUserStore();

  // Public route ALSO needs to check auth on first load
  // to prevent "flickering" or skipping login
  useEffect(() => {
    const verify = async () => {
      try {
        const result = await checkUserAuth();
        result?.isAuthenticated ? setUser(result.user) : clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verify();
  }, [setUser, clearUser]);

  if (isChecking) return <Loader />;

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
