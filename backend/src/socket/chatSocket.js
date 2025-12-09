const Message = require("../models/Message");
const MessageBatch = require("../models/MessageBatch");
const Community = require("../models/Community");
const chatController = require("../controllers/chatController");
const ChatService = require("../services/chatService");
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
      // Handle both userId and id fields for compatibility
      socket.user = { id: decoded.userId || decoded.id };
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

      try {
        // Load previous messages using batching system for better performance
        const result = await ChatService.getMessagesBatched(communityId, userId, { limit: 50 });

        // Send previous messages to the newly joined user
        socket.emit("load-messages", {
          success: true,
          data: result.data,
          communityId
        });

        console.log(`Sent ${result.data.length} previous messages to user ${userId}`);
      } catch (error) {
        console.error('Error loading previous messages:', error);
        // Still send success callback even if message loading fails
      }

      if (callback) callback({ success: true, message: `Joined community ${communityId}` });
    });

    // Send message using batching system
    socket.on("send-message", async (payload, callback) => {
      try {
        const { communityId, text, attachments } = payload;

        // Use batched message service for better performance
        const message = await ChatService.sendMessageBatched(communityId, userId, text, attachments);

        // Manually populate sender information since message might not have populate method
        const User = require("../models/User");
        const populatedMessage = await User.findById(message.senderId, 'username firstName lastName avatar');
        message.senderId = populatedMessage;

        // Broadcast to room (including sender)
        io.to(communityId).emit("receive-message", {
          success: true,
          data: message
        });

        // Send only success status to callback to avoid duplicate messages
        if (callback) callback({ success: true });
      } catch (err) {
        console.error(err);
        if (callback) callback({ success: false, error: err.message || "Server error" });
      }
    });

    // Typing indicator
    socket.on("typing", ({ communityId, isTyping }) => {
      io.to(communityId).emit("typing-update", {
        userId,
        isTyping
      });
    });

    // Read receipt using batching system
    socket.on("read-message", async ({ messageId, communityId }) => {
      try {
        // Use batched service for better performance
        await ChatService.markMessageAsReadBatched(messageId, userId);

        io.to(communityId).emit("message-read", {
          messageId,
          userId,
          success: true
        });
      } catch (err) {
        console.error('Error marking message as read:', err);
        // Silently fail for unauthorized users or errors
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", userId);
    });
  });
};

module.exports = initChatSocket;