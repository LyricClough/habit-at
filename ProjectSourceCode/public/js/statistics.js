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
  } else {
    console.error('No statistics data available. Check the server response or template variables.');
  }
}); 