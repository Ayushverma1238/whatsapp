import { create } from "zustand";
import { getSocket } from "../services/chat_service";
import axiosInstance from "../services/url_service";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),

 initsocketListeners: () => {
  const socket = getSocket();
  const { currentUser } = get();
  if (!socket || !currentUser) return;

  // 1. Clean up existing listeners to prevent memory leaks and "Insufficient Resources"
  const events = [
    "receive_message",
    "user_typing",
    "message_send",
    "user_status",
    "message_error",
    "message_deleted",
    "message_status_update",
    "reaction_update",
    "online_users_list"
  ];
  events.forEach((event) => socket.off(event));

  // 2. Handle the initial "Full List" of online users
  socket.on("online_users_list", (userIds) => {
    set((state) => {
      const newOnlineUsers = new Map(state.onlineUsers);
      userIds.forEach((id) => {
        const stringId = typeof id === "object" ? id._id : id;
        newOnlineUsers.set(stringId, {
          isOnline: true,
          lastSeen: new Date(),
        });
      });
      return { onlineUsers: newOnlineUsers };
    });
  });

  // 3. Handle specific User Status changes (Join/Leave)
  socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
    set((state) => {
      const newOnlineUsers = new Map(state.onlineUsers);
      newOnlineUsers.set(userId, { isOnline, lastSeen });
      return { onlineUsers: newOnlineUsers };
    });
  });

  // 4. Listen for incoming messages
  socket.on("receive_message", (message) => {
    const { currentConversation, messages } = get();
    
    // Safety check: ensure we don't add duplicate messages
    const messageExist = messages.some((msg) => msg._id === message._id);
    if (messageExist) return;

    if (message.conversation === currentConversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
      
      // If we are the receiver, mark it as read
      if (message.receiver?._id === currentUser._id) {
        get().maskMessagesAsRead();
      }
    }

    // Update conversation list last message preview
    set((state) => {
      const updatedData = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount: (message.receiver?._id === currentUser._id && message.conversation !== currentConversation)
              ? (conv.unreadCount || 0) + 1 
              : conv.unreadCount || 0
          };
        }
        return conv;
      });
      return { conversations: { ...state.conversations, data: updatedData } };
    });
  });

  // 5. Typing Indicators
  socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      if (!newTypingUsers.has(conversationId)) {
        newTypingUsers.set(conversationId, new Set());
      }

      const typingSet = new Set(newTypingUsers.get(conversationId));
      isTyping ? typingSet.add(userId) : typingSet.delete(userId);
      
      newTypingUsers.set(conversationId, typingSet);
      return { typingUsers: newTypingUsers };
    });
  });

  // 6. Message Status Updates (Sent/Delivered/Read)
  socket.on("message_status_update", ({ messageId, messageStatus }) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId ? { ...msg, messageStatus } : msg
      ),
    }));
  });

  // 7. Manual Status Check for Conversations (The Sync Fix)
  const { conversations } = get();
  if (conversations?.data?.length > 0) {
    conversations.data.forEach((conv) => {
      const otherUser = conv.participants.find((p) => p._id !== currentUser._id);
      
      if (otherUser?._id) {
        // Ask server for the specific status of this participant
        socket.emit("get_user_status", otherUser._id, (status) => {
          if (status) {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(otherUser._id, {
                isOnline: status.isOnline,
                lastSeen: status.lastSeen,
              });
              return { onlineUsers: newOnlineUsers };
            });
          }
        });
      }
    });
  }

  // 8. Reactions and Deletions
  socket.on("reaction_update", ({ messageId, reactions }) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId ? { ...msg, reactions } : msg
      ),
    }));
  });

  socket.on("message_deleted", ({ deletedMessageId }) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
    }));
  });
},

  setCurrentUser: (user) => set({ currentUser: user }),
  resetSelectedChat: () => set({ selectedContact: null, messages: [] }),

  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/chats/conversations");
      set({ conversations: data, loading: false });

      // Initialize listeners after data is fetched
      get().initsocketListeners();
      return data;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return null;
    }
  },

  setCurrentConversation: (conv) => set({ currentConversation: conv }),

  // Helper to get typing status for a specific conversation
  getTypingInConversation: (conversationId) => {
    const typingSet = get().typingUsers.get(conversationId);
    return typingSet ? Array.from(typingSet) : [];
  },

  fetchMessages: async (conversationId) => {
    // 1. FIX: Only return if conversationId is MISSING
    if (!conversationId) return;

    set({ loading: true });
    try {
      const { data } = await axiosInstance.get(
        `/chats/conversations/${conversationId}/messages`,
      );
      const messageArray = data.data || data || [];
      set({
        messages: messageArray, // 4. FIX: Matches 'messages' used in ChatWindow
        currentConversation: conversationId,
        loading: false,
      });

      const { maskMessagesAsRead } = get();
      if (maskMessagesAsRead) maskMessagesAsRead();

      return messageArray;
    } catch (error) {
      console.error("Fetch Messages Error:", error);
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
        messages: [],
      });
      return [];
    }
  },
  sendMessage: async (formData) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus");

    const socket = getSocket();

    const { conversations } = get();
    let conversationId = null;
    if (conversations?.data?.length > 0) {
      const conversation = conversations.data.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId),
      );
      if (conversation) {
        conversationId = conversation?._id;
        set({ currentConversation: conversationId });
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      conversation: conversationId,
      imageOrVideoUrl:
        media && typeof media !== "string" ? URL.createObjectURL(media) : null,
      content: content,
      contentType: media
        ? media.type.startsWith("image")
          ? "image"
          : "video"
        : "text",
      createdAt: new Date().toISOString(),
      messageStatus,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      const { data } = await axiosInstance.post(
        "/chats/send-message",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const messageData = data.data || data;
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg,
        ),
      }));

      return messageData;
    } catch (error) {
      console.error("Error sending message", error);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "failed" } : msg,
        ),
        error: error?.response?.data?.message || error?.message,
      }));
      throw error;
    }
  },

  receiveMessage: async (message) => {
    if (!message) return;
    const { currentConversation, currentUser, messages } = get();
    const messageExist = messages.some((msg) => msg._id === message._id);
    if (messageExist) return;

    if (message.conversation === currentConversation) {
      set((state) => ({
        messages: [...state, messages, message],
      }));
      if (message.receiverId?._id === currentUser?._id) {
        get().maskMessagesAsRead();
      }
    }

    set((state) => {
      const updateConversations = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount:
              message?.receiver?._id === currentUser?._id
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0,
          };
        }
        return conv;
      });
      return {
        conversations: {
          ...state.conversations,
          data: updateConversations,
        },
      };
    });
  },

  maskMessagesAsRead: async () => {
    const { messages, currentUser } = get();

    if (!messages.length || !currentUser) return;
    const unreadIds = messages
      .filter(
        (msg) => msg.messageStatus !== "read" && msg.receiver?._id === currentUser._id,
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    try {
      const { data } = await axiosInstance.put("/chats/messages/read", {
        messageIds: unreadIds,
      });
      const updatedMessages = messages.map((msg) =>
        unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg,
      );
      console.log("Message mark as read", data);

      set({ messages: updatedMessages });
      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageIds: unreadIds,
          senderId: messages[0]?.sender?._id,
        });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chats/messages/${messageId}`);
      set((state) => ({
        messages: state.messages?.filter((msg) => msg?._id !== messageId),
      }));
      return true;
    } catch (error) {
      console.error("Failed to delete message", error);
      set({ error: error.response?.data?.message || error?.message });
      return false;
    }
  },

  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();
    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
      });
    }
  },
  startTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation) {
      socket.emit("typing_start", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },
  stopTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation) {
      socket.emit("typing_stop", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  // ... inside create
  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (
      !currentConversation ||
      !typingUsers.has(currentConversation) ||
      !userId
    )
      return false;
    return typingUsers.get(currentConversation).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return false;
    const { onlineUsers } = get();
    // userId should be the string ID
    const status = onlineUsers.get(userId);
    return status ? status.isOnline : false;
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  cleanup: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },
}));
