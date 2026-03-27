import { create } from "zustand";
import { persist } from "zustand/middleware";
import { checkUserAuth } from "../services/user_services";

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      isCheckingAuth: true, // App starts in a "checking" state

      // Add the checkAuth action here
      checkAuth: async () => {
        try {
          set({ isCheckingAuth: true });
          const result = await checkUserAuth();

          set({
            user: result.user,
            isAuthenticated: result.isAuthenticated,
            isCheckingAuth: false,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isCheckingAuth: false,
          });
        }
      },

      setUser: (userData) => set({ user: userData, isAuthenticated: true }),

      clearUser: () => {
  // 1. Remove the token from the physical storage
  localStorage.removeItem("auth_token"); 

  // 2. Update the app state
  set({ user: null, isAuthenticated: false });
},

    }),
    {
      name: "user-storeage",
      getStorage: () => localStorage,
    },
  ),
);

export default useUserStore;
