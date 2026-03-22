const response = require("../utils/responseHandler");
const Message = require("../models/Message");
const Status = require("../models/Status");

exports.createStatus = async (req, res) => {
  console.log("Sending message");
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "failed to upload media");
      }
      imageOrVideoUrl = uploadFile?.secure_url;

      if (file.mimetype.startswith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startswith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message Content is required");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    createdAt = new Date();
    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
      createdAt,
    });

    await status.save();

    const populatedStatus = await Status.findById(status?._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    // emit socket image
    if (req.io && req.socketUserMap) {
      // Brodcast to all connected user
      for (const [connectedUserId, sockedId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(res, 200, "Status created successfully", populatedStatus);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Status retrive successfully", statuses);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");

      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user._id.toString(),
        );
        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updateStatus.viewers,
          };
          res.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else {
          console.log("Status owner are not connected");
        }
      }
    } else {
      console.log("Status already viewed by user");
    }
    return response(res, 200, "Status viewed successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (!status.user.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this status");
    }

    await status.deleteOne();

    if (req.io && req.socketUserMap) {
      // Brodcast to all connected user
      for (const [connectedUserId, sockedId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }
    return response("Status deleted successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
