const Conversation = require("../models/Conversation");
const response = require("../utils/responseHandler");
const Message = require("../models/Message");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");

exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;

    const participants = [senderId, receiverId].sort();

    let conversation = await Conversation.findOne({
      participants: participants,
    });

    if (!conversation) {
      conversation = new Conversation({
        participants,
      });
      await conversation.save();
    }
    let imageOrVideoUrl = null;
    let contentType = null;

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "failed to upload media");
      }
      imageOrVideoUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message Content is required");
    }

    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });

    await message.save();
    if (message?.content) {
      conversation.lastMessage = message?._id;
    }

    conversation.unreadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findOne(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    // emit socket event for real time
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId);
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("received_message", populatedMessage);
        message.messageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 200, "message send successfully", populatedMessage);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.getConversations = async (req, res) => {
  const userId = req.user.userId;
  try {
    let conversation = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(res, 200, "get conversation successfully", conversation);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      return response(res, 404, "Not authorized to view this conversation");
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort("createdAt");

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["send", "delivered"] },
      },
      { $set: { messageStatus: "read" } },
    );

    conversation.unreadCount = 0;
    await conversation.save();
    return response(res, 200, "message retrived", messages);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.markAsRead = async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user.userId;
  try {
    let message = await Message.find({
      _id: { $in: messageId },
      receiver: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageId },
        receiver: userId,
      },
      { $set: { messageStatus: "read" } },
    );

    if (req.io && req.socketUserMap) {
      for(const message of messages){
        const senderSocketId = req.socketUserMap(message.sender.toString());
        if(senderSocketId){
            const updatedMessage = {
                _id:message._id,
                messageStatus:"read",
            };
            req.io.to(senderSocketId).emit("message_read", updatedMessage);
            await message.save()
        }
      }
    }

    return response(res, 200, "Messages mark as read", message);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found");
    }

    if (message.sender.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this message");
    }

    await message.deleteOne();

    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(message.receiver.toString());
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("message_deleted", messageId);
     
      }
    }
    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
