import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useLoginStore = create(
    persist(
        (set) => ({
            step: 1,
            userPhoneData: null, // Start as null or {}
            setStep: (step) => set({ step }),
            
            // FIX: Map the argument 'data' to the key 'userPhoneData'
            setUserPhoneData: (data) => set({ userPhoneData: data }), 
            
            // Note: Fixed the typo 'nulll' to 'null' here too
            resetLoginState: () => set({ step: 1, userPhoneData: null }) 
        }),
        {
            name: "login-storage", // Fixed typo "storeage"
            partialize: (state) => ({
                step: state.step,
                userPhoneData: state.userPhoneData
            })
        }
    )
);

export default useLoginStore;