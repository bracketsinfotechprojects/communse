const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

// @route   GET /api/comments/post/:postId
// @desc    Get comments for a post
// @access  Public
router.get('/post/:postId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const comments = await Comment.find({ 
      post: req.params.postId, 
      parentComment: null,
      isDeleted: false 
    })
      .populate('author', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ 
          parentComment: comment._id,
          isDeleted: false 
        })
          .populate('author', 'username firstName lastName avatar')
          .sort({ createdAt: 1 });
        
        return {
          ...comment.toJSON(),
          replies
        };
      })
    );

    const count = await Comment.countDocuments({ 
      post: req.params.postId, 
      parentComment: null,
      isDeleted: false 
    });

    res.json({
      comments: commentsWithReplies,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalComments: count
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Private
router.post('/', [
  auth,
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters'),
  body('post').isMongoId().withMessage('Valid post ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, post, parentComment } = req.body;

    // Check if post exists
    const postExists = await Post.findById(post);
    if (!postExists) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If parentComment is provided, check if it exists
    if (parentComment) {
      const parentExists = await Comment.findById(parentComment);
      if (!parentExists) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
    }

    const comment = new Comment({
      content,
      post,
      author: req.user.userId,
      parentComment: parentComment || null
    });

    await comment.save();
    await comment.populate('author', 'username firstName lastName avatar');

    // If it's a reply, add to parent comment's replies array
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id }
      });
    }

    // Add comment to post's comments array
    await Post.findByIdAndUpdate(post, {
      $push: { comments: comment._id }
    });

    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private
router.put('/:id', [
  auth,
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    // Check if comment is not deleted
    if (comment.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit a deleted comment' });
    }

    comment.content = req.body.content;
    await comment.save();
    await comment.populate('author', 'username firstName lastName avatar');

    res.json({
      message: 'Comment updated successfully',
      comment
    });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.content = 'This comment has been deleted.';
    await comment.save();

    res.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments/:id/like
// @desc    Like/Unlike a comment
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ message: 'Cannot like a deleted comment' });
    }

    const isLiked = comment.likes.some(like => like.user.toString() === req.user.userId);

    if (isLiked) {
      // Unlike
      comment.likes.pull({ user: req.user.userId });
    } else {
      // Like
      comment.likes.push({ user: req.user.userId });
    }

    await comment.save();

    res.json({
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      likeCount: comment.likes.length,
      isLiked: !isLiked
    });

  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;