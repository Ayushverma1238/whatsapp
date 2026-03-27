const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");
const handleVideoCallEvents = require("./video-call-events");
const socketMiddleware = require("../middleware/socketMiddleware");

// map to store online users -> userId socketId
const onlineUsers = new Map();
// map to store typing users -> userId coversation:boolean
const typingUsers = new Map();

const initilizeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      method: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000, //Disconnect inactive user or sockets after 60 s
  });

  io.use(socketMiddleware)
  

  io.on("connection", (socket) => {
    console.log(`User Connected ${socket.id}`)
    let userId = null;

    socket.on("user_connected", async (connectingUserId) => {
      try {

        userId = connectingUserId;
        socket.userId = userId
        onlineUsers.set(userId, socket.id);
        socket.join(userId);

        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // 1. Tell everyone else I'm online
        io.emit("user_status", {
          userId,
          isOnline: true,
        });

      } catch (error) {
        console.error("Error handling user connection", error);
      }
    });

    socket.on("get_user_status", (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    // Forword message to receiver
    socket.on("send_message", async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?._id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }
      } catch (error) {
        console.error("Error sending message", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // Update message as read and notify sender
    socket.on("message_read", async ({messageIds, senderId}) => {
      try {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
          },
          { $set: { messageStatus: "read" } },
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.error("Error updating message read status", error);
      }
    });

    // handle typing start event and auto-stop
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (!typingUsers.has(userId)) typingUsers.set(userId, {});

      const userTyping = typingUsers.get(userId);

      userTyping[conversationId] = true;

      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      // auto-stop after 3s
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 3000);

      // Notify reciver
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    // manually typing stop
    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (typingUsers.has(userId)) {
        const userTypingData = typingUsers.get(userId);

        if (userTypingData) {
          userTypingData[conversationId] = false;

          if (userTypingData[`${conversationId}_timeout`]) {
            clearTimeout(userTypingData[`${conversationId}_timeout`]); // Better than just 'delete'
            delete userTypingData[`${conversationId}_timeout`];
          }
        }
      }
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    // Add or update reaction on a message
    socket.on("add_reaction", async ({ messageId, emoji, userId, reactionUserId }) => {
      try {

        const message = await Message.findById(messageId);
        if (!message) return;

        const existingIndex = message.reactions.findIndex(
          (r) => r.user && r.user.toString() === reactionUserId,
        );

        if (existingIndex > -1) {
          // Toggle logic
          if (message.reactions[existingIndex].emoji === emoji) {
            message.reactions.splice(existingIndex, 1);
          } else {
            message.reactions[existingIndex].emoji = emoji;
          }
        } else {
          message.reactions.push({
           user:reactionUserId,emoji
          });
        }

        await message.save();

        const populatedMessage = await Message.findById(message?._id)
        .populate("sender", "username profilePicture")
        .populate("receiver", "username profilePicture")
        .populate("reactions.user", "username");

        const reactionUpdated = {
          messageId: populatedMessage._id.toString(),
          reactions: populatedMessage.reactions,
        };

        // Get the socket IDs for both users
        const senderSocket = onlineUsers.get(
          populatedMessage.sender?._id.toString(),
        );
        const receiverSocket = onlineUsers.get(
          populatedMessage.receiver?._id.toString(),
        );

        // Send to both parties
        if (senderSocket) {
          io.to(senderSocket).emit("reaction_update", reactionUpdated);
        }
        if (receiverSocket) {
          io.to(receiverSocket).emit("reaction_update", reactionUpdated);
        }
      } catch (error) {
        console.error("Reaction Error:", error.message);
      }
    });

    // handle video call evenst
    handleVideoCallEvents(socket, io, onlineUsers);

    const handleDisconnected = async () => {
      if (!userId) return;
      try {
        onlineUsers.delete(userId);
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
          });
          typingUsers.delete(userId);
        }
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.leave(userId);
        console.log(`User ${userId} disconnected`)
      } catch (error) {
        console.error("Error handling disconnection", error);
      }
    };
    socket.on("disconnect", handleDisconnected);
  });
  // attach the online user map to the socket server for exteral use
  io.socketUserMap = onlineUsers;
  return io;
};

module.exports = initilizeSocket;
