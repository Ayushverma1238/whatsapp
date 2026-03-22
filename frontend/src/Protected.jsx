import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkUserAuth } from "./services/user_services";
import Loader  from "./utils/Loader";

/**
 * ProtectedRoute
 * Prevents unauthorized users from accessing private pages.
 * Includes a loading state to verify authentication on refresh.
 */
export const ProtectedRoute = () => {
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);

    // Using selectors to prevent unnecessary re-renders
    const isAuthenticated = useUserStore((state) => state.isAuthenticated);
    const setUser = useUserStore((state) => state.setUser);
    const clearUser = useUserStore((state) => state.clearUser);

    useEffect(() => {
        let isMounted = true;

        const verifyAuth = async () => {
            try {
                const result = await checkUserAuth();
                if (isMounted) {
                    if (result?.isAuthenticated) {
                        setUser(result.user);
                    } else {
                        clearUser();
                    }
                }
            } catch (error) {
                console.error("Auth verification failed:", error);
                if (isMounted) clearUser();
            } finally {
                if (isMounted) setIsChecking(false);
            }
        };

        // If we already know the user is logged in (state exists), skip the API call
        if (!isAuthenticated) {
            verifyAuth();
        } else {
            setIsChecking(false);
        }

        // Cleanup function to prevent state updates on unmounted component
        return () => {
            isMounted = false;
        };
    }, [setUser, clearUser, isAuthenticated]);

    if (isChecking) {
        return <Loader />;
    }

    return isAuthenticated ? (
        <Outlet />
    ) : (
        <Navigate to="/user-login" state={{ from: location }} replace />
    );
};

/**
 * PublicRoute
 * Redirects authenticated users away from login/signup pages back to home.
 */
export const PublicRoute = () => {
    const isAuthenticated = useUserStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};