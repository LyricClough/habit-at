const db = require('../config/db');

/**
 * Gets all friends for the current user
 */
const getFriends = async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        
        // Get all confirmed friends (where mutual is true)
        const query = `
            SELECT u.user_id, u.username, u.email, 
                   s.current_streak, s.longest_streak,
                   us.completion_rate
            FROM friends f
            JOIN users u ON (f.receiver = u.user_id OR f.sender = u.user_id)
            LEFT JOIN streaks s ON s.user_id = u.user_id
            LEFT JOIN (
                SELECT user_id, completion_rate 
                FROM user_statistics 
                WHERE date = CURRENT_DATE
                OR date = (SELECT MAX(date) FROM user_statistics)
            ) us ON us.user_id = u.user_id
            WHERE (f.sender = $1 OR f.receiver = $1)
            AND f.mutual = true
            AND u.user_id != $1
        `;
        
        const result = await db.query(query, [userId]);
        
        res.json({ friends: result.rows });
    } catch (error) {
        console.error('Error getting friends:', error);
        res.status(500).json({ error: 'Failed to get friends' });
    }
};

/**
 * Gets all pending friend requests for the current user
 */
const getFriendRequests = async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        
        // Get all pending friend requests (where the current user is the receiver and mutual is false)
        const query = `
            SELECT f.friendship_id, u.user_id, u.username, u.email, f.created_at
            FROM friends f
            JOIN users u ON f.sender = u.user_id
            WHERE f.receiver = $1 AND f.mutual = false
        `;
        
        const result = await db.query(query, [userId]);
        
        res.json({ requests: result.rows });
    } catch (error) {
        console.error('Error getting friend requests:', error);
        res.status(500).json({ error: 'Failed to get friend requests' });
    }
};

/**
 * Searches for users to add as friends
 */
const searchUsers = async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const searchTerm = `%${req.query.q}%`;
        
        console.log('Search term:', req.query.q);
        console.log('User ID:', userId);
        
        // Get all users matching the search term (without visibility filtering)
        const searchQuery = `
            SELECT u.user_id, u.username, u.email
            FROM users u
            WHERE u.user_id <> $1
            AND (u.username ILIKE $2 OR u.email ILIKE $2)
        `;
        
        const result = await db.query(searchQuery, [userId, searchTerm]);
        
        if (!result || !result.rows || result.rows.length === 0) {
            console.log('No search results or invalid response');
            return res.json({ users: [] });
        }
        
        console.log('Search results (before filtering friends):', result.rows);
        
        // Now filter out existing friends or friend requests
        const friendsQuery = `
            SELECT DISTINCT 
                CASE WHEN sender = $1 THEN receiver ELSE sender END as related_user_id
            FROM friends
            WHERE sender = $1 OR receiver = $1
        `;
        
        const friendsResult = await db.query(friendsQuery, [userId]);
        
        // Create a set of user IDs to exclude (those who are already friends or have pending requests)
        const friendIds = new Set();
        if (friendsResult && friendsResult.rows) {
            friendsResult.rows.forEach(row => {
                friendIds.add(row.related_user_id);
            });
        }
        
        console.log('Excluded user IDs:', Array.from(friendIds));
        
        // Filter out users who are already friends
        const filteredUsers = result.rows.filter(user => !friendIds.has(user.user_id));
        
        console.log('Filtered search results:', filteredUsers);
        
        res.json({ users: filteredUsers });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};

/**
 * Sends a friend request or accepts an existing request
 */
const addFriend = async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const { friendId } = req.body;
        
        console.log(`Add friend request - userId: ${userId}, friendId: ${friendId}`);
        
        if (!friendId) {
            return res.status(400).json({ error: 'Friend ID is required' });
        }
        
        // Check if there's an existing friend request
        const checkQuery = `
            SELECT * FROM friends 
            WHERE (sender = $1 AND receiver = $2) 
            OR (sender = $2 AND receiver = $1)
        `;
        
        const checkResult = await db.query(checkQuery, [userId, friendId]);
        console.log('Existing friendship check result:', checkResult.rows);
        
        if (checkResult.rows.length > 0) {
            const existingRequest = checkResult.rows[0];
            
            // If the request was sent by the other user and not mutual yet
            if (existingRequest.sender === parseInt(friendId) && !existingRequest.mutual) {
                // Accept the request by setting mutual to true
                const updateQuery = `
                    UPDATE friends 
                    SET mutual = true 
                    WHERE friendship_id = $1
                    RETURNING *
                `;
                
                const updateResult = await db.query(updateQuery, [existingRequest.friendship_id]);
                console.log('Friend request accepted:', updateResult.rows[0]);
                
                return res.json({ message: 'Friend request accepted', friendship: updateResult.rows[0] });
            } else if (existingRequest.mutual) {
                return res.status(400).json({ error: 'Already friends' });
            } else {
                return res.status(400).json({ error: 'Friend request already sent' });
            }
        }
        
        // Send a new friend request
        const insertQuery = `
            INSERT INTO friends (sender, receiver, mutual)
            VALUES ($1, $2, false)
            RETURNING *
        `;
        
        const insertResult = await db.query(insertQuery, [userId, friendId]);
        console.log('New friend request sent:', insertResult.rows[0]);
        
        res.json({ message: 'Friend request sent', friendship: insertResult.rows[0] });
    } catch (error) {
        console.error('Error adding friend:', error);
        res.status(500).json({ error: 'Failed to add friend' });
    }
};

/**
 * Removes a friend or rejects a friend request
 */
const removeFriend = async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ error: 'Friend ID is required' });
        }
        
        // Delete any friendship record between the users
        const query = `
            DELETE FROM friends
            WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1)
            RETURNING *
        `;
        
        const result = await db.query(query, [userId, friendId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Friendship not found' });
        }
        
        res.json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
};

/**
 * Gets statistics for a specific friend
 */
const getFriendStats = async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const friendId = req.params.id;
        
        // First check if they are friends
        const checkQuery = `
            SELECT * FROM friends
            WHERE ((sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1))
            AND mutual = true
        `;
        
        const checkResult = await db.query(checkQuery, [userId, friendId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to view this user\'s statistics' });
        }
        
        // Get friend's user info
        const userQuery = `
            SELECT user_id, username, email
            FROM users
            WHERE user_id = $1
        `;
        
        const userResult = await db.query(userQuery, [friendId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Get streak data
        const streakQuery = `
            SELECT current_streak, longest_streak, last_activity_date
            FROM streaks
            WHERE user_id = $1
        `;
        
        const streakResult = await db.query(streakQuery, [friendId]);
        const streakData = streakResult.rows.length > 0 ? streakResult.rows[0] : null;
        
        // Get statistics history
        const statsQuery = `
            SELECT date, completion_rate, total_completions, active_habits
            FROM user_statistics
            WHERE user_id = $1
            ORDER BY date DESC
            LIMIT 30
        `;
        
        const statsResult = await db.query(statsQuery, [friendId]);
        
        // Get habit categories summary
        const categoriesQuery = `
            SELECT hc.category_name, COUNT(h.habit_id) as habit_count
            FROM habits h
            JOIN users_to_habits uth ON h.habit_id = uth.habit_id
            LEFT JOIN habit_categories hc ON h.category_id = hc.category_id
            WHERE uth.user_id = $1 AND h.status = 1
            GROUP BY hc.category_name
        `;
        
        const categoriesResult = await db.query(categoriesQuery, [friendId]);
        
        res.json({
            user,
            streak: streakData,
            statistics: statsResult.rows,
            categories: categoriesResult.rows
        });
    } catch (error) {
        console.error('Error getting friend stats:', error);
        res.status(500).json({ error: 'Failed to get friend statistics' });
    }
};

/**
 * Renders the friends page
 */
const renderFriendsPage = async (req, res) => {
    res.render('pages/friends', { 
        title: 'Friends',
        user: req.session.user
    });
};

/**
 * Debug endpoint to list all users
 */
const listAllUsers = async (req, res) => {
    try {
        const query = `SELECT user_id, username, email, show_profile FROM users`;
        const result = await db.query(query);
        
        console.log('All users:', result.rows);
        
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
};

/**
 * Debug function to toggle a user's show_profile setting
 */
const toggleUserVisibility = async (req, res) => {
    try {
        const { userId, visible } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const updateQuery = `
            UPDATE users
            SET show_profile = $2
            WHERE user_id = $1
            RETURNING user_id, username, email, show_profile
        `;
        
        const result = await db.query(updateQuery, [userId, !!visible]);
        
        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User visibility updated', user: result.rows[0] });
    } catch (error) {
        console.error('Error updating user visibility:', error);
        res.status(500).json({ error: 'Failed to update user visibility' });
    }
};

module.exports = {
    getFriends,
    getFriendRequests,
    searchUsers,
    addFriend,
    removeFriend,
    getFriendStats,
    renderFriendsPage,
    listAllUsers,
    toggleUserVisibility
}; 