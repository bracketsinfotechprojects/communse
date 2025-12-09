const Interest = require('../models/Interest');

// GET /api/interests - List all interests with optional search
exports.getAllInterests = async (req, res) => {
  try {
    const { search, limit } = req.query;
    let query = {};
    let sort = { name: 1 };
    let pageLimit = parseInt(limit) || 50; // Default limit for suggestions

    // If search parameter is provided, filter interests
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      query = { name: searchRegex };
      pageLimit = Math.min(parseInt(limit) || 10, 20); // Smaller limit for search results
    }

    const interests = await Interest.find(query)
      .sort(sort)
      .limit(pageLimit)
      .lean();

    // Format response for auto-suggestion
    const suggestions = interests.map(interest => ({
      id: interest._id,
      name: interest.name
    }));

    res.json({
      success: true,
      count: suggestions.length,
      data: suggestions,
      query: search || null,
      isSearch: !!search
    });
  } catch (error) {
    console.error('Error fetching interests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interests'
    });
  }
};

// POST /api/interests - Add new interest (authenticated users)
exports.createInterest = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Check if user is authenticated (any role can create)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create interests.'
      });
    }
    
    // Create new interest with creator information
    const interest = new Interest({ 
      name,
      createdBy: req.user.userId 
    });
    await interest.save();
    
    res.status(201).json({
      success: true,
      message: 'Interest created successfully',
      data: interest
    });
  } catch (error) {
    // Handle duplicate interest
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Interest already exists'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Error creating interest:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating interest'
    });
  }
};

// POST /api/interests/bulk - Create multiple interests at once
exports.createBulkInterests = async (req, res) => {
  try {
    const { interests } = req.body;
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create interests.'
      });
    }

    // Validate input
    if (!Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of interest names'
      });
    }

    if (interests.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 interests can be created at once'
      });
    }

    // Prepare interests for bulk insert
    const interestDocuments = interests.map(name => ({
      name: name.trim(),
      createdBy: req.user.userId
    }));

    // Try to insert all interests
    const createdInterests = [];
    const errors = [];

    for (let i = 0; i < interestDocuments.length; i++) {
      try {
        const interest = new Interest(interestDocuments[i]);
        await interest.save();
        createdInterests.push(interest);
      } catch (error) {
        // Handle duplicate or validation errors for each interest
        if (error.code === 11000) {
          errors.push({
            index: i,
            name: interestDocuments[i].name,
            error: 'Interest already exists'
          });
        } else if (error.name === 'ValidationError') {
          errors.push({
            index: i,
            name: interestDocuments[i].name,
            error: error.message
          });
        } else {
          errors.push({
            index: i,
            name: interestDocuments[i].name,
            error: 'Failed to create interest'
          });
        }
      }
    }

    // Return results
    const response = {
      success: true,
      message: `Created ${createdInterests.length} interests successfully`,
      data: {
        created: createdInterests,
        failed: errors
      },
      summary: {
        totalRequested: interests.length,
        successfullyCreated: createdInterests.length,
        failed: errors.length
      }
    };

    // If all failed, return error status
    if (createdInterests.length === 0) {
      return res.status(400).json(response);
    }

    // If some failed, return partial success
    if (errors.length > 0) {
      response.message = `Created ${createdInterests.length} interests, ${errors.length} failed`;
      return res.status(207).json(response); // 207 Multi-Status
    }

    // All succeeded
    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating bulk interests:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bulk interests'
    });
  }
};

// DELETE /api/interests/:id - Remove interest (admin only)
exports.deleteInterest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }
    
    const interest = await Interest.findByIdAndDelete(id);
    
    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Interest deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting interest:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting interest'
    });
  }
};