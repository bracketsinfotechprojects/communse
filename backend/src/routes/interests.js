const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getAllInterests,
  createInterest,
  createBulkInterests,
  deleteInterest
} = require('../controllers/interestController');

/**
 * @swagger
 * /api/interests:
 *   get:
 *     summary: Get all interests with optional search
 *     description: Returns interests with optional search filtering for auto-suggestions
 *     tags: [Interests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering interests (case-insensitive)
 *         example: "cricket"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum number of results to return. Default is 50 for all interests and 10 for search results
 *         example: 10
 *     responses:
 *       200:
 *         description: Interests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Interest ID
 *                       name:
 *                         type: string
 *                         description: Interest name
 *                       createdBy:
 *                         type: string
 *                         description: User ID who created this interest
 *                 query:
 *                   type: string
 *                   nullable: true
 *                   description: Search query used (if any)
 *                 isSearch:
 *                   type: boolean
 *                   description: Whether this is a search response
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/', auth, getAllInterests);

/**
 * @swagger
 * /api/interests:
 *   post:
 *     summary: Create new interest (authenticated users)
 *     description: Any authenticated user can create a new interest if they don't find a suitable one
 *     tags: [Interests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 25
 *                 example: "Photography"
 *     responses:
 *       201:
 *         description: Interest created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Interest created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     createdBy:
 *                       type: string
 *                       description: User ID who created this interest
 *       400:
 *         description: Validation error or interest already exists
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/', auth, createInterest);

/**
 * @swagger
 * /api/interests/bulk:
 *   post:
 *     summary: Create multiple interests at once
 *     description: Create up to 20 interests in a single request
 *     tags: [Interests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interests
 *             properties:
 *               interests:
 *                 type: array
 *                 maxItems: 20
 *                 items:
 *                   type: string
 *                   minLength: 3
 *                   maxLength: 25
 *                   example: "Photography"
 *                 example: ["Photography", "Gaming", "Reading"]
 *     responses:
 *       201:
 *         description: All interests created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Created 3 interests successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           createdBy:
 *                             type: string
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index:
 *                             type: number
 *                           name:
 *                             type: string
 *                           error:
 *                             type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRequested:
 *                       type: number
 *                     successfullyCreated:
 *                       type: number
 *                     failed:
 *                       type: number
 *       207:
 *         description: Partial success - some interests created, some failed
 *       400:
 *         description: Validation error or all interests failed
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/bulk', auth, createBulkInterests);

/**
 * @swagger
 * /api/interests/{id}:
 *   delete:
 *     summary: Delete interest (admin only)
 *     tags: [Interests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Interest ID
 *     responses:
 *       200:
 *         description: Interest deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Interest deleted successfully"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Access denied - admin role required
 *       404:
 *         description: Interest not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, deleteInterest);

module.exports = router;