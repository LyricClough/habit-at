/**
 * Statistics Page JavaScript
 * 
 * Initializes and manages visualizations for the statistics page
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize visualization manager
  const visualizationManager = new VisualizationManager();
  
  // Get statistics data from the server
  const statisticsData = window.statisticsData || {};
  
  // Debug: Log the data to see if it's available
  console.log('Statistics Data:', statisticsData);
  
  // Initialize visualizations only if data is available
  if (Object.keys(statisticsData).length > 0) {
    visualizationManager.initVisualizations(statisticsData);
    
    // Add card animations
    visualizationManager.addCardAnimations();

    // Add a refresh button in the header
    addRefreshButton(visualizationManager);
  } else {
    console.error('No statistics data available. Check the server response or template variables.');
  }

  // Add event listener for habit completions to refresh data
  listenForHabitCompletions(visualizationManager);
});

/**
 * Add a refresh button to the statistics page
 * @param {VisualizationManager} visualizationManager - The visualization manager instance
 */
function addRefreshButton(visualizationManager) {
  // Find the page header
  const header = document.querySelector('.relative > .flex.justify-between.items-center');
  
  if (header) {
    // Create refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm transition-colors ml-2';
    refreshButton.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh Stats
    `;
    
    // Add click event to refresh page data
    refreshButton.addEventListener('click', () => {
      refreshButton.disabled = true;
      refreshButton.innerHTML = `
        <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Refreshing...
      `;
      
      // Reload the page to get fresh data
      window.location.reload();
    });
    
    // Add the button to the header
    const exportButton = header.querySelector('a[href="/statistics/export"]');
    if (exportButton) {
      header.insertBefore(refreshButton, exportButton);
    } else {
      header.appendChild(refreshButton);
    }
  }
}

/**
 * Listen for habit completion events to refresh visualizations
 * @param {VisualizationManager} visualizationManager - The visualization manager instance
 */
function listenForHabitCompletions(visualizationManager) {
  // Create a MutationObserver to watch for DOM changes that might indicate habit completion
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Check if any nodes were added
      if (mutation.addedNodes.length) {
        // Look for success messages or changes to habit elements
        const addedNodes = Array.from(mutation.addedNodes);
        const habitCompleted = addedNodes.some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return node.classList && (
              node.classList.contains('bg-green-100') || 
              node.classList.contains('toast-success') ||
              node.querySelector('.bg-green-100')
            );
          }
          return false;
        });
        
        // If a habit completion is detected, refresh the heatmap
        if (habitCompleted && visualizationManager.refreshHeatmap) {
          console.log('Habit completion detected, refreshing heatmap');
          setTimeout(() => visualizationManager.refreshHeatmap(), 1000);
        }
      }
    });
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
} 