const User = require('../models/User');
const Community = require('../models/Community');
const Event = require('../models/Event');
const firebaseConfig = require('../config/firebase');

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

class NotificationService {
  constructor() {
    this.firebase = firebaseConfig;
  }

  /**
   * Find users within a specific radius who match given interests
   * @param {Object} location - { latitude, longitude }
   * @param {Array} interests - Array of interest strings
   * @param {Number} radius - Radius in kilometers (default: 25)
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of user objects with distance
   */
  async findUsersByLocationAndInterests(location, interests, radius = 25, options = {}) {
    const {
      excludeUserIds = [],
      limit = 100,
      requireActiveNotifications = true
    } = options;

    try {
      // Build the base query
      const query = {
        isActive: true,
        isVerified: true,
        _id: { $nin: excludeUserIds }
      };

      // Add location filter - users must have coordinates
      if (location && location.latitude && location.longitude) {
        query['location.coordinates.latitude'] = { $exists: true, $ne: null };
        query['location.coordinates.longitude'] = { $exists: true, $ne: null };
      }

      // Add interest filter if interests provided
      if (interests && interests.length > 0) {
        query.interests = { $in: interests.map(interest => 
          new RegExp(interest, 'i')
        )};
      }

      // Add notification settings filter
      if (requireActiveNotifications) {
        query.$or = [
          { 'notificationSettings.nearbyCommunities': true },
          { 'notificationSettings.nearbyEvents': true },
          { 'notificationSettings.communityUpdates': true },
          { 'notificationSettings.eventUpdates': true }
        ];
      }

      // Find users matching the criteria
      const users = await User.find(query)
        .select('firstName lastName interests location fcmTokens notificationSettings')
        .limit(limit * 2); // Get more users to filter by distance

      // Filter users by distance and return with distance info
      const usersWithDistance = users
        .filter(user => {
          // Check if user has active FCM tokens
          const hasActiveTokens = user.fcmTokens && 
            user.fcmTokens.some(token => token.isActive);
          
          if (!hasActiveTokens) return false;

          // Check if user has coordinates
          const userLat = user.location?.coordinates?.latitude;
          const userLon = user.location?.coordinates?.longitude;
          
          if (!userLat || !userLon) return false;

          // Calculate distance
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            userLat,
            userLon
          );

          // Only include users within radius
          return distance <= radius;
        })
        .map(user => {
          const userLat = user.location.coordinates.latitude;
          const userLon = user.location.coordinates.longitude;
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            userLat,
            userLon
          );

          return {
            ...user.toObject(),
            distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
          };
        })
        .sort((a, b) => a.distance - b.distance) // Sort by distance
        .slice(0, limit);

      return usersWithDistance;
    } catch (error) {
      console.error('Error finding users by location and interests:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific users
   * @param {Array} users - Array of user objects
   * @param {Object} notification - Notification object { title, body }
   * @param {Object} data - Additional data to send
   * @returns {Promise<Object>} Result of notification sending
   */
  async sendPushNotificationToUsers(users, notification, data = {}) {
    try {
      // Collect all active FCM tokens from users
      const tokens = [];
      const userTokenMap = new Map(); // Map to track which tokens belong to which users

      users.forEach(user => {
        if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
          user.fcmTokens.forEach(tokenObj => {
            if (tokenObj.isActive && tokenObj.token) {
              tokens.push(tokenObj.token);
              if (!userTokenMap.has(tokenObj.token)) {
                userTokenMap.set(tokenObj.token, user._id);
              }
            }
          });
        }
      });

      if (tokens.length === 0) {
        console.log('No active FCM tokens found for notification');
        return { successCount: 0, failureCount: 0, tokensProcessed: 0 };
      }

      // Send multicast notification
      const result = await this.firebase.sendMulticastNotification(tokens, notification, data);

      // Handle failed tokens - deactivate them
      if (result.failureCount > 0) {
        console.log(`Deactivating ${result.failureCount} invalid FCM tokens`);
        await this.deactivateInvalidTokens(result.invalidTokens || []);
      }

      return {
        ...result,
        tokensProcessed: tokens.length,
        usersNotified: users.length
      };
    } catch (error) {
      console.error('Error sending push notifications:', error);
      throw error;
    }
  }

  /**
   * Deactivate invalid FCM tokens
   * @param {Array} invalidTokens - Array of invalid token strings
   */
  async deactivateInvalidTokens(invalidTokens) {
    try {
      if (!invalidTokens || invalidTokens.length === 0) {
        console.log('No invalid tokens to deactivate');
        return;
      }

      // Use a simpler approach - update each token individually
      // This avoids array filter issues while being more reliable
      let deactivatedCount = 0;
      
      for (const invalidToken of invalidTokens) {
        try {
          const result = await User.updateMany(
            { 'fcmTokens.token': invalidToken },
            {
              $set: {
                'fcmTokens.$.isActive': false
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            deactivatedCount++;
          }
        } catch (tokenError) {
          console.error(`Error deactivating token ${invalidToken}:`, tokenError);
          // Continue with other tokens even if one fails
        }
      }

      console.log(`Deactivated ${deactivatedCount} invalid FCM tokens out of ${invalidTokens.length} attempted`);
    } catch (error) {
      console.error('Error deactivating invalid tokens:', error);
    }
  }

  /**
   * Notify users about new community creation
   * @param {Object} community - Community object
   * @param {Object} creator - User object who created the community
   * @returns {Promise<Object>} Notification result
   */
  async notifyCommunityCreation(community, creator) {
    try {
      const location = community.location?.coordinates;
      if (!location || !location.latitude || !location.longitude) {
        console.log('Community has no location coordinates, skipping notification');
        return { successCount: 0, failureCount: 0 };
      }

      // Get users within radius who have this interest
      const users = await this.findUsersByLocationAndInterests(
        location,
        [community.interest],
        25, // Default radius
        {
          excludeUserIds: [creator._id], // Exclude the creator
          requireActiveNotifications: true,
          limit: 1000
        }
      );

      // Filter users who want community notifications
      const relevantUsers = users.filter(user => 
        user.notificationSettings?.nearbyCommunities || 
        user.notificationSettings?.communityUpdates
      );

      if (relevantUsers.length === 0) {
        console.log('No relevant users found for community notification');
        return { successCount: 0, failureCount: 0 };
      }

      const notification = {
        title: 'New Community Nearby!',
        body: `A new ${community.interest} community "${community.name}" has been created in ${community.location.city}`
      };

      const data = {
        type: 'community_created',
        communityId: community._id.toString(),
        communityName: community.name,
        communityInterest: community.interest,
        location: community.location.city,
        creatorName: `${creator.firstName} ${creator.lastName}`,
        distance: 'varies' // Users will have different distances
      };

      return await this.sendPushNotificationToUsers(relevantUsers, notification, data);
    } catch (error) {
      console.error('Error notifying community creation:', error);
      throw error;
    }
  }

  /**
   * Notify users about new event creation
   * @param {Object} event - Event object
   * @param {Object} creator - User object who created the event
   * @returns {Promise<Object>} Notification result
   */
  async notifyEventCreation(event, creator) {
    try {
      const location = event.location?.coordinates;
      if (!location || !location.latitude || !location.longitude) {
        console.log('Event has no location coordinates, skipping notification');
        return { successCount: 0, failureCount: 0 };
      }

      // Get the community to find its interest
      const community = await Community.findById(event.communityId);
      if (!community) {
        console.log('Community not found for event, skipping notification');
        return { successCount: 0, failureCount: 0 };
      }

      console.log(`🔔 Notifying community members about new event: "${event.title}" in ${community.name}`);

      let totalSuccessCount = 0;
      let totalFailureCount = 0;

      // Step 1: Always notify community owner (even if they're the event creator)
      if (community.ownerId) {
        console.log('📱 Notifying community owner...');
        const communityOwner = await User.findById(community.ownerId);
        if (communityOwner && communityOwner.notificationSettings?.communityUpdates) {
          const ownerResult = await this.sendCommunityOwnerNotification(event, community, communityOwner);
          totalSuccessCount += ownerResult.successCount;
          totalFailureCount += ownerResult.failureCount;
        }
      }

      // Step 2: Get users within radius who have relevant interests (exclude event creator)
      const interests = [community.interest, event.category, ...(event.tags || [])];
      const users = await this.findUsersByLocationAndInterests(
        location,
        interests,
        25, // Default radius
        {
          excludeUserIds: [creator._id], // Only exclude the event creator
          requireActiveNotifications: true,
          limit: 1000
        }
      );

      // Filter users who want event notifications
      const relevantUsers = users.filter(user =>
        user.notificationSettings?.nearbyEvents ||
        user.notificationSettings?.eventUpdates
      );

      if (relevantUsers.length > 0) {
        console.log(`📱 Notifying ${relevantUsers.length} community members...`);
        const eventDate = new Date(event.startTime).toLocaleDateString();
        const notification = {
          title: 'New Event Nearby!',
          body: `"${event.title}" - ${event.category} event in ${event.location.city} on ${eventDate}`
        };

        const data = {
          type: 'event_created',
          eventId: event._id.toString(),
          eventTitle: event.title,
          eventCategory: event.category,
          communityId: event.communityId.toString(),
          communityName: community.name,
          location: event.location.city,
          eventDate: event.startTime,
          creatorName: `${creator.firstName} ${creator.lastName}`,
          distance: 'varies'
        };

        const memberResult = await this.sendPushNotificationToUsers(relevantUsers, notification, data);
        totalSuccessCount += memberResult.successCount;
        totalFailureCount += memberResult.failureCount;
      }

      if (totalSuccessCount === 0 && totalFailureCount === 0) {
        console.log('📊 No users found for event notification');
      } else {
        console.log(`📊 Event notification summary: ${totalSuccessCount} sent, ${totalFailureCount} failed`);
      }

      return {
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        communityOwnerNotified: !!community.ownerId
      };
    } catch (error) {
      console.error('Error notifying event creation:', error);
      throw error;
    }
  }

  /**
   * Send notification to community owner about new event
   * @param {Object} event - Event object
   * @param {Object} community - Community object
   * @param {Object} communityOwner - Community owner user object
   * @returns {Promise<Object>} Notification result
   */
  async sendCommunityOwnerNotification(event, community, communityOwner) {
    try {
      // Check if community owner has active FCM tokens
      const hasActiveTokens = communityOwner.fcmTokens &&
        communityOwner.fcmTokens.some(token => token.isActive);
      
      if (!hasActiveTokens) {
        console.log(`📱 Community owner ${communityOwner.username} has no active FCM tokens`);
        return { successCount: 0, failureCount: 0 };
      }

      const eventDate = new Date(event.startTime).toLocaleDateString();
      const notification = {
        title: 'New Event in Your Community!',
        body: `"${event.title}" has been created in your ${community.name} community`
      };

      const data = {
        type: 'community_event_created',
        eventId: event._id.toString(),
        eventTitle: event.title,
        eventCategory: event.category,
        communityId: event.communityId.toString(),
        communityName: community.name,
        location: event.location.city,
        eventDate: event.startTime,
        isCommunityOwner: true
      };

      const result = await this.sendPushNotificationToUsers([communityOwner], notification, data);
      console.log(`✅ Community owner notification sent: ${result.successCount} success, ${result.failureCount} failed`);
      
      return result;
    } catch (error) {
      console.error('Error sending community owner notification:', error);
      return { successCount: 0, failureCount: 1 };
    }
  }

  /**
   * Test notification system with sample data
   * @param {Object} testData - Test data for notification
   * @returns {Promise<Object>} Test result
   */
  async testNotificationSystem(testData) {
    try {
      const { location, interests, notification } = testData;

      // Find test users
      const users = await this.findUsersByLocationAndInterests(
        location,
        interests,
        50, // Larger radius for testing
        { limit: 10 }
      );

      if (users.length === 0) {
        return {
          success: false,
          message: 'No users found for testing',
          usersFound: 0
        };
      }

      // Send test notification
      const result = await this.sendPushNotificationToUsers(
        users,
        notification || {
          title: 'Test Notification',
          body: 'This is a test notification from CommAPP'
        },
        {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      );

      return {
        success: true,
        usersFound: users.length,
        notificationResult: result
      };
    } catch (error) {
      console.error('Error testing notification system:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;