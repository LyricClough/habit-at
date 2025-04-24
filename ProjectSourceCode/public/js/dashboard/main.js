import renderDate            from './date.js';
import { initCalendar }      from './calendar.js';
// import { renderChart }       from './chart.js';
import { wireHabitModal }    from './modal.js';
import { initDailyChart }    from './dailyChart.js';

document.addEventListener('DOMContentLoaded', () => {
  // Check if Chart.js is available, if not, load it
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not found, loading it dynamically...');
    
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    chartScript.onload = () => {
      console.log('Chart.js loaded successfully, initializing dashboard...');
      initializeDashboard();
    };
    chartScript.onerror = () => {
      console.error('Failed to load Chart.js dynamically');
      // Initialize anyway to show at least non-chart elements
      initializeDashboard();
    };
    
    document.head.appendChild(chartScript);
  } else {
    // Chart.js already available, initialize normally
    initializeDashboard();
  }
});

/**
 * Initialize all dashboard components
 */
function initializeDashboard() {
  renderDate();
  initCalendar();
  renderChart();
  wireHabitModal();
}

