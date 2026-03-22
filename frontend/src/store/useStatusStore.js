import { create } from "zustand";
import { getSocket } from "../services/chat_service";
import axiosInstance from "../services/url_service";

const useStatusStore = create((set, get) => ({
  statuses: [],
  loading: false,
  error: null,

  // Setters
  setStatuses: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Initialize Socket
  initializeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("new_status", (newStatus) => {
      set((state) => ({
        statuses: state.statuses.some((s) => s._id === newStatus._id)
          ? state.statuses
          : [newStatus, ...state.statuses],
      }));
    });

    socket.on("status_deleted", (statusId) => {
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
    });

    socket.on("status_viewed", (statusId, viewers) => {
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status, viewers } : status
        ),
      }));
    });
  },

  cleanupSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("new_status");
      socket.off("status_deleted");
      socket.off("status_viewed");
    }
  },

  // API Actions
  fetchStatuses: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("status");
      set({ statuses: data.data || [], loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, loading: false });
    }
  },

  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      if (statusData.file) formData.append("media", statusData.file);
      if (statusData.content?.trim()) formData.append("content", statusData.content.trim());

      const { data } = await axiosInstance.post("status", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.data) {
        set((state) => ({
          statuses: state.statuses.some((s) => s._id === data.data._id)
            ? state.statuses
            : [data.data, ...state.statuses],
          loading: false,
        }));
      }
      return data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },

  viewStatus: async (statusId) => {
    try {
      set({loading:true, error: null})
      await axiosInstance.put(`status/${statusId}/view`);
     set((state) => ({
      statuses: state.statuses.map((status) =>
        status._id === statusId ? {...status}: status),
     }))
     set({loading:false})
    } catch (error) {
      set({ error: error.message, loading:false });
      throw error;
    }
  },

  deleteStatus: async (statusId) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`status/${statusId}`);
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
        loading: false,
      }));
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },

  // Helper Functions// Helper Functions
 getGroupedStatus: () => {
  const { statuses } = get();
  
  return statuses.reduce((acc, status) => {
    const userObject = Array.isArray(status?.user) ? status.user[0] : status?.user;
    const statusUserId = userObject?._id;


    if (!statusUserId) return acc;

    if (!acc[statusUserId]) {
      acc[statusUserId] = {
        _id: statusUserId,
        id: statusUserId,
        username: userObject?.username, // Use userObject here
        avatar: userObject?.profilePicture,
        statuses: []
      };
    }
    
    acc[statusUserId].statuses.push({
      id: status._id,
      media: status.content,
      contentType: status.contentType,
      timestamp: status.createdAt,
      viewers: status.viewers,
    });
    
    return acc;
  }, {});
},

  getUserStatuses: (userId) => {
    if (!userId) return null;
    const grouped = get().getGroupedStatus();
    return grouped[userId] || null; // Returns null instead of undefined if user has no status
  },

  getOtherStatuses: (userId) => {
    const groupedStatus = get().getGroupedStatus();
    return Object.values(groupedStatus).filter(
      (contact) => contact.id !== userId
    );
  },

  clearError: () => set({ error: null }),

  reset: () => set({ statuses: [], loading: false, error: null }),
}));

export default useStatusStore;