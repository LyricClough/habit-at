/**
 * Statistics Page JavaScript
 * 
 * Initializes and manages visualizations for the statistics page
 */

import { VisualizationManager } from './visualizations.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize visualization manager
  const visualizationManager = new VisualizationManager();
  
  // Get statistics data from the server
  const statisticsData = window.statisticsData || {};
  
  // Initialize visualizations
  visualizationManager.initVisualizations(statisticsData);
  
  // Add card animations
  visualizationManager.addCardAnimations();
}); 