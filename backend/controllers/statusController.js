const response = require("../utils/responseHandler");
const Message = require("../models/Message");
const Status = require("../models/Status");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");

exports.createStatus = async (req, res) => {
  console.log("Creating Status...");
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null; // This will hold the Cloudinary URL
    let finalContentType = contentType || "text";

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "failed to upload media");
      }

      // FIX: Assign to mediaUrl, not imageOrVideoUrl
      mediaUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (
        file.mimetype.startsWith("video") ||
        file.mimetype.endsWith("mp4")
      ) {
        // Fix typo: meamtype -> mimetype
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (!content?.trim()) {
      // If no file and no content
      return response(res, 400, "Message Content is required");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // FIX: Use mediaUrl if it exists, otherwise use content text
    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
      createdAt: new Date(),
    });

    await status.save();

    const populatedStatus = await Status.findById(status._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    // Socket Broadcast
    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        // Fix typo: sockedId -> socketId
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(res, 200, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error("Backend Error:", error);
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

    // Convert BSON IDs to strings for a reliable comparison
    const viewerIds = status.viewers.map((id) => id.toString());

    if (!viewerIds.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      // FIX: Store the result of the population in a variable
      const populatedStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");

      if (req.io && req.socketUserMap) {
        // FIX: Access index [0] because your user field is an Array
        const ownerId = Array.isArray(status.user)
          ? status.user[0].toString()
          : status.user.toString();

        const statusOwnerSocketId = req.socketUserMap.get(ownerId);

        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: populatedStatus.viewers.length,
            viewers: populatedStatus.viewers, // Now using the correct variable
          };

          req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else {
          console.log("Status owner is not online");
        }
      }
    } else {
      console.log("Status already viewed by user");
    }

    return response(res, 200, "Status viewed successfully");
  } catch (error) {
    console.error("View Status Error:", error);
    return response(res, 500, "Internal server error");
  }
};

exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  console.log(statusId);

  try {
    const status = await Status.findById(statusId);
    console.log(status);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (status.user[0].toString() !== userId) {
      return response(res, 403, "Not authorized to delete this status");
    }

    await status.deleteOne();

    if (req.io && req.socketUserMap) {
      // Brodcast to all connected user
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }
    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
