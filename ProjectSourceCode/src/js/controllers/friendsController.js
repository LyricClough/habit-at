// src/js/controllers/friendsController.js
const db = require('../config/db');

/**
 * Gets all confirmed friends for the current user
 */
async function getFriends(req, res) {
  try {
    const userId = req.session.user.user_id;
    const friends = await db.any(`
      SELECT DISTINCT
             u.user_id,
             u.username,
             u.email,
             s.current_streak,
             s.longest_streak,
             us.completion_rate
      FROM friends f
      JOIN users u
        ON (f.receiver = u.user_id OR f.sender = u.user_id)
      LEFT JOIN streaks s
        ON s.user_id = u.user_id
      LEFT JOIN (
        SELECT user_id, completion_rate
        FROM user_statistics
        WHERE date = CURRENT_DATE
           OR date = (SELECT MAX(date) FROM user_statistics)
      ) us
        ON us.user_id = u.user_id
      WHERE (f.sender = $1 OR f.receiver = $1)
        AND f.mutual = true
        AND u.user_id <> $1
    `, [userId]);

    res.json({ friends });
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
}

/**
 * Gets all pending friend requests for the current user
 */
async function getFriendRequests(req, res) {
  try {
    const userId = req.session.user.user_id;
    const requests = await db.any(`
      SELECT f.friendship_id,
             u.user_id,
             u.username,
             u.email,
             f.created_at
      FROM friends f
      JOIN users u
        ON f.sender = u.user_id
      WHERE f.receiver = $1
        AND f.mutual = false
    `, [userId]);

    res.json({ requests });
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
}

/**
 * Searches for users to add as friends
 */
async function searchUsers(req, res) {
  try {
    const term = req.query.term || req.query.q;
    if (!term || term.length < 3) {
      return res.status(400).json({ users: [] });
    }

    const userId = req.session.user.user_id;
    const likeTerm = `%${term}%`;

    // 1) find matching users
    const users = await db.any(`
      SELECT user_id, username, email
      FROM users
      WHERE user_id <> $1
        AND (username ILIKE $2 OR email ILIKE $2)
    `, [userId, likeTerm]);

    if (users.length === 0) {
      return res.json({ users: [] });
    }

    // 2) load any existing friendships
    const ids = users.map(u => u.user_id);
    const rels = await db.any(`
      SELECT sender, receiver, mutual
      FROM friends
      WHERE (sender = $1 AND receiver = ANY($2))
         OR (receiver = $1 AND sender   = ANY($2))
    `, [userId, ids]);

    const relMap = {};
    rels.forEach(r => {
      const other = r.sender === userId ? r.receiver : r.sender;
      relMap[other] = {
        mutual:   r.mutual,
        sent:     r.sender   === userId && !r.mutual,
        received: r.receiver === userId && !r.mutual
      };
    });

    // 3) decorate
    const out = users.map(u => {
      const rel = relMap[u.user_id] || {};
      return {
        ...u,
        isFriend:        rel.mutual    === true,
        pendingSent:     rel.sent      === true,
        pendingReceived: rel.received  === true
      };
    });

    res.json({ users: out });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Sends a friend request or accepts an existing one
 */
async function addFriend(req, res) {
  try {
    const userId   = req.session.user.user_id;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    // see if there’s already a row
    const existing = await db.any(`
      SELECT * 
      FROM friends
      WHERE (sender = $1 AND receiver = $2)
         OR (sender = $2 AND receiver = $1)
    `, [userId, friendId]);

    if (existing.length > 0) {
      const ex = existing[0];
      if (ex.sender === +friendId && !ex.mutual) {
        // accept
        const accepted = await db.one(`
          UPDATE friends
             SET mutual = true
           WHERE friendship_id = $1
           RETURNING *
        `, [ex.friendship_id]);
        return res.json({ message: 'Friend request accepted', friendship: accepted });
      }
      if (ex.mutual) {
        return res.status(400).json({ error: 'Already friends' });
      }
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // send new request
    const inserted = await db.one(`
      INSERT INTO friends (sender, receiver, mutual)
      VALUES ($1, $2, false)
      RETURNING *
    `, [userId, friendId]);

    res.json({ message: 'Friend request sent', friendship: inserted });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Failed to add friend' });
  }
}

/**
 * Removes a friend or rejects a request
 */
async function removeFriend(req, res) {
  try {
    const userId   = req.session.user.user_id;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    const deleted = await db.any(`
      DELETE FROM friends
      WHERE (sender = $1 AND receiver = $2)
         OR (sender = $2 AND receiver = $1)
      RETURNING *
    `, [userId, friendId]);

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
}

/**
 * Gets statistics for a specific friend
 */
async function getFriendStats(req, res) {
  try {
    const userId   = req.session.user.user_id;
    const friendId = req.params.id;

    // only if mutual – LIMIT 1 prevents multiple‐row errors
    const rel = await db.oneOrNone(`
      SELECT 1
      FROM friends
      WHERE ((sender = $1 AND receiver = $2)
          OR  (sender = $2 AND receiver = $1))
        AND mutual = true
      LIMIT 1
    `, [userId, friendId]);

    if (!rel) {
      return res.status(403).json({ error: 'Not authorized to view stats' });
    }

    // user info
    const user = await db.oneOrNone(`
      SELECT user_id, username, email
      FROM users
      WHERE user_id = $1
    `, [friendId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // streak
    const streak = await db.oneOrNone(`
      SELECT current_streak, longest_streak, last_activity_date
      FROM streaks
      WHERE user_id = $1
    `, [friendId]);

    // last 30 days of stats
    const statistics = await db.any(`
      SELECT date, completion_rate, total_completions, active_habits
      FROM user_statistics
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT 30
    `, [friendId]);

    // category breakdown
    const categories = await db.any(`
      SELECT hc.category_name,
             COUNT(h.habit_id)::int AS habit_count
      FROM habits h
      JOIN users_to_habits uth
        ON h.habit_id = uth.habit_id
      LEFT JOIN habit_categories hc
        ON h.category_id = hc.category_id
      WHERE uth.user_id = $1
        AND h.status = 1
      GROUP BY hc.category_name
    `, [friendId]);

    res.json({ user, streak, statistics, categories });
  } catch (error) {
    console.error('Error getting friend stats:', error);
    res.status(500).json({ error: 'Failed to get friend statistics' });
  }
}

/**
 * Renders the friends page
 */
function renderFriendsPage(req, res) {
  res.render('pages/friends', {
    title: 'Friends',
    user:  req.session.user
  });
}

/**
 * Debug: list all users
 */
async function listAllUsers(req, res) {
  try {
    const users = await db.any(`
      SELECT user_id, username, email
      FROM users
    `);
    console.log('All users:', users);
    res.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

// No more profile‐visibility column, so this endpoint is deprecated.
async function toggleUserVisibility(req, res) {
  res.status(400).json({ error: 'User-visibility feature removed' });
}

module.exports = {
  getFriends,
  getFriendRequests,
  searchUsers,
  addFriend,
  removeFriend,
  getFriendStats,
  renderFriendsPage,
  listAllUsers,
  toggleUserVisibility,
};
