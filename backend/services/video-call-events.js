const handleVideoCallEvents = (socket, io, onlineUsers) => {
  
  // 1. INITIATE CALL
  socket.on("initiate_call", ({ callerId, receiverId, callType, callerInfo, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      // Use the callId passed from frontend for consistency
      io.to(receiverSocketId).emit("incoming_call", {
        callerId,
        callerName: callerInfo.username,
        callerAvatar: callerInfo.profilePicture,
        callId,
        callType,
      });
    } else {
      socket.emit("call_failed", { reason: "user is offline" });
    }
  });

  // 2. ACCEPT CALL
  socket.on("accept_call", ({ callerId, callId, receiverInfo }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call_accepted", {
        receiverName: receiverInfo.username,
        receiverAvatar: receiverInfo.profilePicture,
        callId,
      });
    }
  });

  // 3. REJECT CALL
  socket.on("reject_call", ({ callerId, callId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call_rejected", { callId });
    }
  });

  // 4. END CALL
  socket.on("end_call", ({ callId, participantId }) => {
    const participantSocketId = onlineUsers.get(participantId);
    if (participantSocketId) {
      io.to(participantSocketId).emit("call_ended", { callId });
    }
  });

  // --- WEB RTC SIGNALING (Fixed typos and logic) ---

  // 5. WEBRTC OFFER
  socket.on("webrtc_offer", ({ offer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_offer", {
        offer,
        senderId: Array.from(onlineUsers.keys()).find(key => onlineUsers.get(key) === socket.id),
        callId,
      });
    }
  });

  // 6. WEBRTC ANSWER
  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_answer", {
        answer,
        senderId: Array.from(onlineUsers.keys()).find(key => onlineUsers.get(key) === socket.id),
        callId,
      });
    }
  });

  // 7. ICE CANDIDATES
  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_ice_candidate", {
        candidate,
        senderId: Array.from(onlineUsers.keys()).find(key => onlineUsers.get(key) === socket.id),
        callId,
      });
    }
  });
};

module.exports = handleVideoCallEvents;