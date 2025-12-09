const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const chatController = require("../controllers/chatController");
const { auth } = require("../middleware/auth");

/**
 * POST /communities/:communityId/messages
 * Send a message
 */
router.post(
  "/communities/:communityId/messages",
  [
    body("text").optional().isLength({ max: 5000 }).withMessage("Message text cannot exceed 5000 characters"),
    body("attachments").optional().isArray().withMessage("Attachments must be an array")
  ],
  auth,
  chatController.sendMessage
);

/**
 * GET /communities/:communityId/messages
 * Query: ?limit=50&before=<ISO date>
 */
router.get(
  "/communities/:communityId/messages",
  auth,
  chatController.getMessages
);

/**
 * POST /messages/:messageId/read
 * Mark message as read by current user
 */
router.post("/messages/:messageId/read", auth, chatController.markMessageAsRead);

/**
 * GET /communities/:communityId/unread
 * Get unread count for current user
 */
router.get(
  "/communities/:communityId/unread",
  auth,
  chatController.getUnreadCount
);

/**
 * PATCH /messages/:messageId
 * Edit own message
 */
router.patch(
  "/messages/:messageId",
  [
    body("text").isLength({ min: 1, max: 5000 }).withMessage("Message text must be between 1 and 5000 characters")
  ],
  auth,
  chatController.editMessage
);

/**
 * DELETE /messages/:messageId
 * Soft delete message (sender or admin)
 * For now: only sender can delete
 */
router.delete("/messages/:messageId", auth, chatController.deleteMessage);

module.exports = router;