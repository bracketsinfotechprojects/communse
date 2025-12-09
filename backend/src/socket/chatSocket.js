const Message = require("../models/Message");
const Community = require("../models/Community");
const chatController = require("../controllers/chatController");
const jwt = require("jsonwebtoken");

// Attach this in server.js
const initChatSocket = (io) => {
  // Auth at socket level
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("No token"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.userId };
      next();
    } catch (err) {
      next(new Error("Auth error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log("Socket connected:", userId);

    // Join a community room
    socket.on("join-community", async (data, callback) => {
      const { communityId } = data;
      socket.join(communityId);
      console.log(`User ${userId} joined community ${communityId}`);
      if (callback) callback({ success: true, message: `Joined community ${communityId}` });
    });

    // Send message
    socket.on("send-message", async (payload, callback) => {
      try {
        const { communityId, text, attachments } = payload;

        // Check membership using controller method
        const isMember = await chatController.isCommunityMember(communityId, userId);
        if (!isMember) {
          return callback({ success: false, error: "Not authorized to send messages in this community" });
        }

        // Create message directly using model for socket efficiency
        const message = await Message.create({
          communityId,
          senderId: userId,
          text: text || "",
          attachments: attachments || [],
          readBy: [userId]
        });

        // Populate sender information
        await message.populate('senderId', 'username firstName lastName avatar');

        // Broadcast to room (including sender)
        io.to(communityId).emit("receive-message", {
          success: true,
          data: message
        });

        // Send only success status to callback to avoid duplicate messages
        if (callback) callback({ success: true });
      } catch (err) {
        console.error(err);
        if (callback) callback({ success: false, error: "Server error" });
      }
    });

    // Typing indicator
    socket.on("typing", ({ communityId, isTyping }) => {
      io.to(communityId).emit("typing-update", {
        userId,
        isTyping
      });
    });

    // Read receipt
    socket.on("read-message", async ({ messageId, communityId }) => {
      try {
        // Check if user is member of community
        const isMember = await chatController.isCommunityMember(communityId, userId);
        if (!isMember) {
          return; // silently fail for unauthorized users
        }

        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: userId }
        });

        io.to(communityId).emit("message-read", {
          messageId,
          userId,
          success: true
        });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", userId);
    });
  });
};

module.exports = initChatSocket;