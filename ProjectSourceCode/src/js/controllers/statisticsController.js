const db = require('../config/db');

/**
 * Renders the statistics page with habit completion data
 */
exports.getStatisticsPage = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    
    // Get all habits for the user with their categories
    const allHabits = await db.any(
      `SELECT h.*, c.category_name, c.color 
       FROM habits h
       LEFT JOIN habit_categories c ON h.category_id = c.category_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1`,
      [userId]
    );
    
    // Get all habit history (completions)
    const historyData = await db.any(
      `SELECT h.habit_id, h.habit_name, h.description, h.counter, hi.date, c.category_name
       FROM habits h
       JOIN habits_to_history hth ON h.habit_id = hth.habit_id
       JOIN history hi ON hth.history_id = hi.history_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       LEFT JOIN habit_categories c ON h.category_id = c.category_id
       WHERE uh.user_id = $1
       ORDER BY hi.date DESC`,
      [userId]
    );

    // Get streak data from streaks table
    let streakData = await db.oneOrNone(
      `SELECT current_streak, longest_streak, last_activity_date
       FROM streaks
       WHERE user_id = $1`,
      [userId]
    );
    
    // If no streak data exists, calculate it and create a record
    if (!streakData) {
      streakData = await calculateAndUpdateStreak(userId);
    } else {
      // Check if streak data needs updating (last_activity_date isn't today)
      const lastActivityDate = new Date(streakData.last_activity_date);
      const today = new Date();
      if (lastActivityDate.toISOString().slice(0, 10) !== today.toISOString().slice(0, 10)) {
        // Get today's completions
        const todayCompletions = await db.any(
          `SELECT COUNT(*) as count
           FROM habits_to_history hth
           JOIN history hi ON hth.history_id = hi.history_id
           JOIN habits h ON hth.habit_id = h.habit_id
           JOIN users_to_habits uh ON h.habit_id = uh.habit_id
           WHERE uh.user_id = $1 AND hi.date = CURRENT_DATE`,
          [userId]
        );
        
        // Update streak if there are completions today
        if (todayCompletions[0].count > 0) {
          await db.none(
            `UPDATE streaks 
             SET current_streak = current_streak + 1, 
                 longest_streak = GREATEST(longest_streak, current_streak + 1),
                 last_activity_date = CURRENT_DATE
             WHERE user_id = $1`,
            [userId]
          );
          
          // Refresh streak data
          streakData = await db.one(
            `SELECT current_streak, longest_streak, last_activity_date
             FROM streaks
             WHERE user_id = $1`,
            [userId]
          );
        }
      }
    }
    
    // Get user statistics for last 30 days
    const userStats = await db.oneOrNone(
      `SELECT completion_rate, total_completions, active_habits
       FROM user_statistics
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );
    
    // If no statistics for today, calculate and insert them
    let completionRate = 0;
    let totalCompletions = 0;
    
    if (!userStats) {
      // Calculate completion rate
      completionRate = await calculateCompletionRate(userId, 30);
      
      // Get total completions
      const completions = await db.one(
        `SELECT COUNT(*) as total
         FROM habits_to_history hth
         JOIN habits h ON hth.habit_id = h.habit_id
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1`,
        [userId]
      );
      totalCompletions = parseInt(completions.total);
      
      // Get active habits count
      const activeHabits = await db.one(
        `SELECT COUNT(*) as total
         FROM habits h
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND h.status = 1`,
        [userId]
      );
      
      // Insert new statistics record
      await db.none(
        `INSERT INTO user_statistics 
         (user_id, date, completion_rate, total_completions, active_habits)
         VALUES ($1, CURRENT_DATE, $2, $3, $4)`,
        [userId, completionRate, totalCompletions, activeHabits.total]
      );
    } else {
      completionRate = userStats.completion_rate;
      totalCompletions = userStats.total_completions;
    }
    
    // Calculate weekly completion data
    const weeklyData = await calculateWeeklyData(userId);
    
    // Calculate monthly completion trends
    const { monthlyData, monthLabels } = await calculateMonthlyData(userId);

    // Generate daily completion data for line chart (last 30 days)
    const dailyCompletionData = await generateDailyCompletionData(userId);
    
    // Generate heatmap data for calendar visualization
    const heatmapData = generateHeatmapData(historyData);
    
    // Get top performing habits with sparkline data
    const topHabits = await calculateTopHabitsWithSparklines(userId, allHabits, historyData);
    
    // Get habits that need improvement
    const challengeHabits = calculateChallengeHabits(allHabits, historyData);
    
    // Get category breakdown data for doughnut chart
    const categoryData = await generateCategoryData(userId);
    
    // Calculate growth metrics
    const calculateWeeklyAverage = Math.round(weeklyData.reduce((a, b) => a + b, 0) / 7) + '%';
    
    // Get monthly growth rate from habit_trends
    const growthTrend = await db.oneOrNone(
      `SELECT AVG(completion_rate) as current_month
       FROM habit_trends
       WHERE user_id = $1 AND date >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );
    
    const prevMonthGrowth = await db.oneOrNone(
      `SELECT AVG(completion_rate) as prev_month
       FROM habit_trends
       WHERE user_id = $1 
       AND date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
       AND date < date_trunc('month', CURRENT_DATE)`,
      [userId]
    );
    
    let calculateMonthlyGrowth = 0;
    if (growthTrend && growthTrend.current_month && prevMonthGrowth && prevMonthGrowth.prev_month) {
      calculateMonthlyGrowth = Math.round(
        ((growthTrend.current_month - prevMonthGrowth.prev_month) / prevMonthGrowth.prev_month) * 100
      );
    }

    res.render('pages/statistics', {
      hideNav: false,
      user: req.session.user,
      completionRate,
      streak: streakData.current_streak,
      longestStreak: streakData.longest_streak,
      totalCompletions,
      weeklyData: JSON.stringify(weeklyData),
      monthlyData: JSON.stringify(monthlyData),
      monthLabels: JSON.stringify(monthLabels),
      dailyCompletionData: JSON.stringify(dailyCompletionData),
      heatmapData: JSON.stringify(heatmapData),
      topHabits,
      challengeHabits,
      categoryData: JSON.stringify(categoryData.data),
      categoryLabels: JSON.stringify(categoryData.labels),
      categoryColors: JSON.stringify(categoryData.colors),
      calculateWeeklyAverage,
      calculateMonthlyGrowth
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

/**
 * Generate daily completion data for the last 30 days line chart
 */
async function generateDailyCompletionData(userId) {
  try {
    const data = {
      labels: [],
      counts: [],
      rates: []
    };
    
    // Generate dates for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const formattedDate = date.toISOString().slice(0, 10);
      
      data.labels.push(formattedDate.slice(5)); // Just show MM-DD
      
      // Get completions for this date
      const completions = await db.oneOrNone(
        `SELECT COUNT(*) as count
         FROM habits_to_history hth
         JOIN history hi ON hth.history_id = hi.history_id
         JOIN habits h ON hth.habit_id = h.habit_id
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND hi.date = $2`,
        [userId, formattedDate]
      );
      
      // Get scheduled habits for this date's weekday
      const weekday = date.getDay();
      const scheduled = await db.oneOrNone(
        `SELECT COUNT(*) as count
         FROM habits h
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND h.weekday = $2 AND h.status != 0`,
        [userId, weekday]
      );
      
      // Calculate completion count and rate
      const count = completions ? parseInt(completions.count) : 0;
      let rate = 0;
      
      if (scheduled && parseInt(scheduled.count) > 0) {
        rate = Math.min(100, Math.round((count / parseInt(scheduled.count)) * 100));
      }
      
      data.counts.push(count);
      data.rates.push(rate);
    }
    
    return data;
  } catch (err) {
    console.error('Error generating daily completion data:', err);
    return { labels: [], counts: [], rates: [] };
  }
}

/**
 * Calculate top performing habits with sparkline data
 */
async function calculateTopHabitsWithSparklines(userId, allHabits, historyData) {
  try {
    if (allHabits.length === 0) {
      return [];
    }
    
    // Calculate basic metrics for each habit
    const habitMetrics = allHabits.map(habit => {
      // Count completions for this habit
      const completions = historyData.filter(record => record.habit_id === habit.habit_id);
      
      // Calculate completion rate
      const estimatedWeeks = 13; // ~90 days
      const expectedCompletions = estimatedWeeks; // One per week
      
      const completion_rate = Math.min(
        Math.round((habit.counter / Math.max(expectedCompletions, 1)) * 100), 
        100
      );
      
      // Calculate streak days (simplified)
      const streak = Math.min(habit.counter, 30); // Cap at 30 for display purposes
      
      return {
        habit_id: habit.habit_id,
        habit_name: habit.habit_name,
        description: habit.description || '',
        category: habit.category_name || 'Uncategorized',
        color: habit.color || '#4F46E5',
        counter: habit.counter,
        completion_rate,
        streak,
        status: habit.status
      };
    });
    
    // Sort by completion rate (descending)
    const sortedHabits = habitMetrics.sort((a, b) => b.completion_rate - a.completion_rate);
    
    // Get top 6 habits
    const topHabits = sortedHabits.slice(0, 6);
    
    // Add sparkline data for the last 14 days
    for (const habit of topHabits) {
      const sparklineData = [];
      
      // Get the last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const formattedDate = date.toISOString().slice(0, 10);
        
        // Check if this habit was completed on this date
        const completed = await db.oneOrNone(
          `SELECT COUNT(*) as count
           FROM habits_to_history hth
           JOIN history hi ON hth.history_id = hi.history_id
           WHERE hth.habit_id = $1 AND hi.date = $2`,
          [habit.habit_id, formattedDate]
        );
        
        sparklineData.push(completed && parseInt(completed.count) > 0 ? 1 : 0);
      }
      
      habit.sparklineData = JSON.stringify(sparklineData);
    }
    
    return topHabits;
  } catch (err) {
    console.error('Error calculating top habits with sparklines:', err);
    return [];
  }
}

/**
 * Export statistics data as JSON
 */
exports.exportStatisticsData = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Get all habits for the user with categories
    const allHabits = await db.any(
      `SELECT h.*, c.category_name 
       FROM habits h
       LEFT JOIN habit_categories c ON h.category_id = c.category_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1`,
      [userId]
    );
    
    // Get all habit history (completions)
    const historyData = await db.any(
      `SELECT h.habit_id, h.habit_name, h.description, h.counter, hi.date
       FROM habits h
       JOIN habits_to_history hth ON h.habit_id = hth.habit_id
       JOIN history hi ON hth.history_id = hi.history_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1
       ORDER BY hi.date DESC`,
      [userId]
    );
    
    // Get streak data
    const streakData = await db.oneOrNone(
      `SELECT current_streak, longest_streak, last_activity_date
       FROM streaks
       WHERE user_id = $1`,
      [userId]
    ) || { current_streak: 0, longest_streak: 0 };
    
    // Get weekly and monthly trends
    const weeklyData = await calculateWeeklyData(userId);
    const { monthlyData, monthLabels } = await calculateMonthlyData(userId);
    
    // Get category completion rates
    const categoryStats = await db.any(
      `SELECT c.category_name, COUNT(hth.habit_id) as completions
       FROM habit_categories c
       JOIN habits h ON c.category_id = h.category_id
       JOIN habits_to_history hth ON h.habit_id = hth.habit_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1
       GROUP BY c.category_name
       ORDER BY completions DESC`,
      [userId]
    );
    
    // Get user statistics trends
    const statsTrend = await db.any(
      `SELECT date, completion_rate, total_completions, active_habits
       FROM user_statistics
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [userId]
    );
    
    // Prepare export data
    const exportData = {
      user: {
        username: req.session.user.username,
        exportDate: new Date().toISOString()
      },
      summary: {
        totalHabits: allHabits.length,
        totalCompletions: historyData.length,
        currentStreak: streakData.current_streak,
        longestStreak: streakData.longest_streak,
        completionRate: await calculateCompletionRate(userId, 30)
      },
      trends: {
        weekly: weeklyData,
        monthly: {
          labels: monthLabels,
          data: monthlyData
        },
        statistics: statsTrend,
        categories: categoryStats
      },
      habits: allHabits.map(habit => {
        // Get habit specific completions
        const habitCompletions = historyData.filter(h => h.habit_id === habit.habit_id);
        
        return {
          id: habit.habit_id,
          name: habit.habit_name,
          description: habit.description || '',
          category: habit.category_name || 'Uncategorized',
          weekday: habit.weekday,
          timeSlot: habit.time_slot,
          status: habit.status,
          completions: habit.counter,
          completionHistory: habitCompletions.map(c => c.date)
        };
      })
    };
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=habit-statistics-${Date.now()}.json`);
    
    // Send JSON data
    res.json(exportData);
  } catch (err) {
    console.error('Error exporting statistics:', err);
    res.status(500).send('Error exporting statistics data');
  }
};

/**
 * Calculate and update streak record for a user
 */
async function calculateAndUpdateStreak(userId) {
  try {
    // Get all dates with completed habits
    const dates = await db.any(
      `SELECT DISTINCT hi.date
       FROM history hi
       JOIN habits_to_history hth ON hi.history_id = hth.history_id
       JOIN habits h ON hth.habit_id = h.habit_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1
       ORDER BY hi.date DESC`,
      [userId]
    );

    if (dates.length === 0) {
      // Create a new streak record with zeros
      await db.none(
        `INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date)
         VALUES ($1, 0, 0, NULL)`,
        [userId]
      );
      return { current_streak: 0, longest_streak: 0 };
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if there's a completion for today
    const hasCompletionToday = dates.some(d => {
      const date = new Date(d.date);
      return date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
    });
    
    // Start checking from today or yesterday depending on if there's a completion today
    let checkDate = hasCompletionToday ? today : yesterday;
    
    for (let i = 0; i < dates.length; i++) {
      const date = new Date(dates[i].date);
      date.setHours(0, 0, 0, 0);
      
      const diff = Math.round((checkDate - date) / (1000 * 60 * 60 * 24));
      
      if (diff <= currentStreak) {
        // Already counted this date
        continue;
      } else if (diff === currentStreak + 1) {
        // Consecutive day
        currentStreak++;
        checkDate = date;
      } else {
        // Streak broken
        break;
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentLongest = 0;
    
    for (let i = 0; i < dates.length - 1; i++) {
      const currentDate = new Date(dates[i].date);
      const nextDate = new Date(dates[i + 1].date);
      
      const diff = Math.round((currentDate - nextDate) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        // Consecutive day
        currentLongest++;
      } else {
        // Reset streak count
        longestStreak = Math.max(longestStreak, currentLongest);
        currentLongest = 0;
      }
    }
    
    longestStreak = Math.max(longestStreak, currentLongest) + 1; // +1 to count the first day
    
    // Set current streak based on activity
    currentStreak = hasCompletionToday ? currentStreak : currentStreak > 0 ? currentStreak : 0;
    
    // Create or update streak record
    await db.none(
      `INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         current_streak = $2,
         longest_streak = $3,
         last_activity_date = $4`,
      [userId, currentStreak, longestStreak, hasCompletionToday ? today : null]
    );
    
    return { current_streak: currentStreak, longest_streak: longestStreak };
  } catch (err) {
    console.error('Error calculating streak:', err);
    return { current_streak: 0, longest_streak: 0 };
  }
}

/**
 * Calculate completion rate over a given period
 */
async function calculateCompletionRate(userId, days) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateISO = startDate.toISOString().slice(0, 10);
    
    // Get all habits scheduled in the period
    const scheduled = await db.any(
      `SELECT COUNT(DISTINCT h.habit_id) as total
       FROM habits h
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1 AND h.status != 0`, // Exclude inactive habits
      [userId]
    );
    
    // Get all habits completed in the period
    const completed = await db.any(
      `SELECT COUNT(*) as total
       FROM habits_to_history hth
       JOIN history hi ON hth.history_id = hi.history_id
       JOIN habits h ON hth.habit_id = h.habit_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1 AND hi.date >= $2`,
      [userId, startDateISO]
    );
    
    // If no habits, return 0
    if (scheduled[0].total === 0) {
      return 0;
    }
    
    // Calculate rate as a percentage (completed / (scheduled * active days)) * 100
    const potentialCompletions = scheduled[0].total * days;
    const rate = Math.round((completed[0].total / potentialCompletions) * 100);
    
    return Math.min(rate, 100); // Cap at 100%
  } catch (err) {
    console.error('Error calculating completion rate:', err);
    return 0;
  }
}

/**
 * Calculate weekly completion data by day of week
 */
async function calculateWeeklyData(userId) {
  try {
    const weekDays = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
    const result = [];
    
    for (const day of weekDays) {
      // Get total scheduled habits for this weekday
      const scheduled = await db.any(
        `SELECT COUNT(*) as total
         FROM habits h
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND h.weekday = $2 AND h.status != 0`,
        [userId, day]
      );
      
      // Get total completions by day of week
      const completed = await db.any(
        `SELECT COUNT(*) as total
         FROM habits_to_history hth
         JOIN history hi ON hth.history_id = hi.history_id
         JOIN habits h ON hth.habit_id = h.habit_id
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND h.weekday = $2 AND hi.date >= NOW() - INTERVAL '90 days'`,
        [userId, day]
      );
      
      // Calculate completion rate
      let rate = 0;
      if (scheduled[0].total > 0) {
        // Approximate rate based on last 90 days (about 13 of each weekday)
        const weekCount = Math.ceil(90 / 7); // Approximately 13 weeks
        rate = Math.round((completed[0].total / (scheduled[0].total * weekCount)) * 100);
        rate = Math.min(rate, 100); // Cap at 100%
      }
      
      result.push(rate);
    }
    
    return result;
  } catch (err) {
    console.error('Error calculating weekly data:', err);
    return [0, 0, 0, 0, 0, 0, 0];
  }
}

/**
 * Calculate monthly completion data and labels for the last 6 months
 */
async function calculateMonthlyData(userId) {
  try {
    const monthlyData = [];
    const monthLabels = [];
    
    // Get data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      // Get last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      
      // Get total completions for this month
      const completed = await db.any(
        `SELECT COUNT(*) as total
         FROM habits_to_history hth
         JOIN history hi ON hth.history_id = hi.history_id
         JOIN habits h ON hth.habit_id = h.habit_id
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND hi.date >= $2 AND hi.date <= $3`,
        [userId, startDate, endDate]
      );
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      monthlyData.push(completed[0].total);
      monthLabels.push(monthNames[date.getMonth()]);
    }
    
    return { monthlyData, monthLabels };
  } catch (err) {
    console.error('Error calculating monthly data:', err);
    return { 
      monthlyData: [0, 0, 0, 0, 0, 0], 
      monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] 
    };
  }
}

/**
 * Generate heatmap data for the calendar visualization
 */
function generateHeatmapData(historyData) {
  const heatmapData = {};
  
  // Group completions by date and count
  historyData.forEach(record => {
    const timestamp = new Date(record.date).getTime() / 1000; // Convert to Unix timestamp (seconds)
    
    if (heatmapData[timestamp]) {
      heatmapData[timestamp]++;
    } else {
      heatmapData[timestamp] = 1;
    }
  });
  
  return heatmapData;
}

/**
 * Calculate top performing habits based on completion rate and streak
 */
function calculateTopHabits(allHabits, historyData) {
  if (allHabits.length === 0) {
    return [];
  }
  
  // Calculate completion metrics for each habit
  const habitMetrics = allHabits.map(habit => {
    // Count completions for this habit
    const completions = historyData.filter(record => record.habit_id === habit.habit_id);
    
    // Get all unique dates of completion
    const completionDates = [...new Set(completions.map(c => c.date))];
    
    // Calculate completion rate (counter / desired completions) * 100
    // For simplicity, assume the habit was created 90 days ago
    const estimatedWeeks = 13; // ~90 days
    const expectedCompletions = estimatedWeeks; // One per week
    
    const completion_rate = Math.min(
      Math.round((habit.counter / Math.max(expectedCompletions, 1)) * 100), 
      100
    );
    
    // Calculate streak days (simplified)
    const streak = Math.min(habit.counter, 30); // Cap at 30 for display purposes
    
    return {
      habit_id: habit.habit_id,
      habit_name: habit.habit_name,
      description: habit.description || '',
      category: habit.category_name || 'Uncategorized',
      color: habit.color || '#4F46E5',
      counter: habit.counter,
      completion_rate,
      streak,
      status: habit.status
    };
  });
  
  // Sort by completion rate (descending)
  const sortedHabits = habitMetrics.sort((a, b) => b.completion_rate - a.completion_rate);
  
  // Return top 6 habits
  return sortedHabits.slice(0, 6);
}

/**
 * Calculate habits that need improvement based on low completion rates
 */
function calculateChallengeHabits(allHabits, historyData) {
  if (allHabits.length === 0) {
    return [];
  }
  
  // Calculate completion metrics for each habit
  const habitMetrics = calculateTopHabits(allHabits, historyData);
  
  // Filter for habits with low completion rates
  const challenges = habitMetrics
    .filter(habit => habit.completion_rate < 50 && habit.status !== 0) // Exclude inactive habits
    .sort((a, b) => a.completion_rate - b.completion_rate); // Sort by completion rate (ascending)
  
  // Return top 3 challenges
  return challenges.slice(0, 3);
}

/**
 * Generate data for category breakdown chart from database categories
 */
async function generateCategoryData(userId) {
  try {
    // Get categories with completion counts
    const categories = await db.any(
      `SELECT c.category_id, c.category_name, c.color, COUNT(hth.habit_id) as completions
       FROM habit_categories c
       JOIN habits h ON c.category_id = h.category_id
       JOIN habits_to_history hth ON h.habit_id = hth.habit_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1
       GROUP BY c.category_id, c.category_name, c.color
       ORDER BY completions DESC`,
      [userId]
    );
    
    // Get habits without categories
    const uncategorized = await db.oneOrNone(
      `SELECT COUNT(hth.habit_id) as completions
       FROM habits h
       JOIN habits_to_history hth ON h.habit_id = hth.habit_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1 AND h.category_id IS NULL`,
      [userId]
    );
    
    // Build category data arrays
    const data = categories.map(cat => parseInt(cat.completions));
    const labels = categories.map(cat => cat.category_name);
    const colors = categories.map(cat => cat.color || '#4F46E5');
    
    // Add uncategorized if it exists
    if (uncategorized && parseInt(uncategorized.completions) > 0) {
      data.push(parseInt(uncategorized.completions));
      labels.push('Uncategorized');
      colors.push('#94A3B8'); // Slate-400 color for uncategorized
    }
    
    // If no categories at all, return defaults
    if (data.length === 0) {
      return {
        data: [0, 0, 0, 0, 0],
        labels: ['Health', 'Productivity', 'Learning', 'Fitness', 'Mindfulness'],
        colors: ['#4ADE80', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
      };
    }
    
    return { data, labels, colors };
  } catch (err) {
    console.error('Error generating category data:', err);
    return {
      data: [0, 0, 0, 0, 0],
      labels: ['Health', 'Productivity', 'Learning', 'Fitness', 'Mindfulness'],
      colors: ['#4ADE80', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
    };
  }
} 