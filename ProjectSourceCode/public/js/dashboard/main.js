import renderDate            from './date.js';
import { initCalendar }      from './calendar.js';

/**
 * Initialize all dashboard components
 */
function initializeDashboard() {
  console.log('Dashboard initialization started');
  renderDate();
  initCalendar();
  // renderChart();
  // wireHabitModal();
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing dashboard');
  initializeDashboard();
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('DOM already loaded, initializing dashboard immediately');
  setTimeout(initializeDashboard, 1);
}

