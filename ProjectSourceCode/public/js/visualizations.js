/**
 * Visualizations Module
 * Handles all chart and visualization initializations for the statistics page
 */

class VisualizationManager {
  constructor() {
    this.charts = {};
  }

  /**
   * Initialize all visualizations on the statistics page
   * @param {Object} data - Statistics data from the server
   */
  initVisualizations(data) {
    if (!data) return;

    // Check if required libraries are loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded. Visualizations will not be available.');
      this.showChartErrorMessages();
      return;
    }

    // Ensure the necessary chart containers are prepared
    this.ensureChartContainers();

    // Load charts sequentially for better performance
    this.loadChartsSequentially(data);

    // Initialize tab switching
    this.initTabSwitching();
  }

  /**
   * Ensure all chart containers exist and are canvas elements
   */
  ensureChartContainers() {
    console.log('Ensuring chart containers exist and are canvas elements');
    
    // List of chart container IDs and their parent selectors
    const containers = [
      { id: 'completionGauge', parentSelector: '.flex.items-center.justify-center', height: 100, width: 100 },
      { id: 'dailyChart', parentSelector: '.bg-white.rounded-xl.shadow-sm.p-6:first-of-type', height: 200, width: '100%' },
      { id: 'weeklyTrend', parentSelector: '#weekly-content', height: 250, width: '100%' },
      { id: 'monthlyTrend', parentSelector: '#monthly-content', height: 250, width: '100%' },
      { id: 'categoryChart', parentSelector: '#category-content', height: 250, width: '100%' },
      { id: 'heatmap', parentSelector: '.bg-white.rounded-xl.shadow-sm.p-6:nth-of-type(2)', height: 200, width: '100%', isDiv: true }
    ];

    for (const container of containers) {
      try {
        // Get existing element
        const existingElement = document.getElementById(container.id);
        
        // Skip if it's the heatmap and the element exists
        if (container.isDiv && existingElement) {
          console.log(`Keeping existing div for ${container.id}`);
          continue;
        }

        // Find the parent element where we'll insert our canvas
        let parent;
        if (existingElement) {
          parent = existingElement.parentNode;
        } else {
          parent = document.querySelector(container.parentSelector);
        }
        
        if (!parent) {
          console.error(`Parent element not found for ${container.id}. Selector: ${container.parentSelector}`);
          continue;
        }
        
        // For heatmap, create a div, for others create a canvas
        let newElement;
        if (container.isDiv) {
          newElement = document.createElement('div');
        } else {
          newElement = document.createElement('canvas');
        }
        
        // Set attributes
        newElement.id = container.id;
        newElement.className = existingElement ? existingElement.className : '';
        
        // Set dimensions
        if (typeof container.height === 'number') {
          newElement.height = container.height;
        } else if (typeof container.height === 'string') {
          newElement.style.height = container.height;
        }
        
        if (typeof container.width === 'number') {
          newElement.width = container.width;
        } else if (typeof container.width === 'string') {
          newElement.style.width = container.width;
        }
        
        // Replace the existing element if it exists
        if (existingElement) {
          console.log(`Replacing ${container.id} with new ${container.isDiv ? 'div' : 'canvas'} element`);
          parent.replaceChild(newElement, existingElement);
        } else {
          console.log(`Appending new ${container.isDiv ? 'div' : 'canvas'} element for ${container.id}`);
          parent.appendChild(newElement);
        }
      } catch (error) {
        console.error(`Error setting up container for ${container.id}:`, error);
      }
    }
  }

  /**
   * Load charts sequentially to improve performance
   * @param {Object} data - Statistics data from the server
   */
  loadChartsSequentially(data) {
    // Initialize the small gauge first
    this.initCompletionGauge(data.completionRate);
    
    // Initialize sparklines (lightweight)
    this.initSparklines();

    // Queue the remaining charts to load sequentially with small delays
    setTimeout(() => {
      this.initDailyChart(data.dailyCompletionData);
      
      setTimeout(() => {
        this.initHeatmap(data.heatmapData);
        
        // Only initialize these charts when their tabs are viewed
        const tabContents = document.querySelectorAll('.tab-content');
        const isWeeklyVisible = !tabContents[0]?.classList.contains('hidden');
        const isMonthlyVisible = !tabContents[1]?.classList.contains('hidden');
        const isCategoryVisible = !tabContents[2]?.classList.contains('hidden');
        
        if (isWeeklyVisible) {
          this.initWeeklyChart(data.weeklyData);
        }
        
        setTimeout(() => {
          if (isMonthlyVisible) {
            this.initMonthlyChart(data.monthlyData, data.monthLabels);
          }
          
          setTimeout(() => {
            if (isCategoryVisible) {
              this.initCategoryChart(data.categoryData, data.categoryLabels, data.categoryColors);
            }
          }, 200);
        }, 200);
      }, 200);
    }, 100);
  }

  /**
   * Initialize the completion rate gauge chart
   * @param {number} completionRate - The overall completion rate
   */
  initCompletionGauge(completionRate) {
    const gaugeElement = document.getElementById('completionGauge');
    if (!gaugeElement) {
      console.error('Completion gauge element not found');
      return;
    }
    
    try {
      console.log('Initializing completion gauge with data:', completionRate);
      
      // Ensure element is a canvas with a context
      if (!gaugeElement.getContext) {
        console.error('Completion gauge element is not a canvas element');
        return;
      }
      
      const ctx = gaugeElement.getContext('2d');
      
      // Determine color based on completion rate
      const gaugeColor = completionRate < 30 
        ? '#f87171' // Red for low completion
        : completionRate < 70 
          ? '#facc15' // Yellow for medium completion
          : '#4ade80'; // Green for high completion
      
      // Create the gauge chart using Chart.js
      this.charts.gauge = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [completionRate, 100 - completionRate],
            backgroundColor: [gaugeColor, '#f3f4f6'],
            borderWidth: 0,
            cutout: '80%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
            // Add the center text plugin just for this chart
            gaugeText: {
              enabled: true,
              text: `${completionRate}%`,
              font: 'bold 18px Inter, system-ui, sans-serif',
              color: '#1e293b'
            }
          },
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1000,
            easing: 'easeOutQuart'
          }
        },
        plugins: [{
          id: 'gaugeText',
          beforeDraw: function(chart) {
            if (chart.config.options.plugins.gaugeText && chart.config.options.plugins.gaugeText.enabled) {
              const width = chart.width;
              const height = chart.height;
              const ctx = chart.ctx;
              const text = chart.config.options.plugins.gaugeText.text;
              const font = chart.config.options.plugins.gaugeText.font;
              const color = chart.config.options.plugins.gaugeText.color;
              
              ctx.restore();
              ctx.font = font;
              ctx.textBaseline = 'middle';
              ctx.textAlign = 'center';
              ctx.fillStyle = color;
              ctx.fillText(text, width/2, height/2);
              ctx.save();
            }
          }
        }]
      });
    } catch (error) {
      console.error('Error initializing completion gauge:', error);
    }
  }

  /**
   * Initialize the daily line chart for the last 30 days
   * @param {Object} dailyData - Data containing labels, counts, and rates
   */
  initDailyChart(dailyData) {
    const chartElement = document.getElementById('dailyChart');
    if (!chartElement) {
      console.error('Daily chart element not found');
      return;
    }
    
    try {
      console.log('Initializing daily chart with data:', dailyData);
      
      // Ensure element is a canvas with a context
      if (!chartElement.getContext) {
        console.error('Daily chart element is not a canvas element');
        return;
      }
      
      const ctx = chartElement.getContext('2d');
      const parsedData = typeof dailyData === 'string' ? JSON.parse(dailyData) : dailyData;
      
      // Check if data has the expected structure
      if (!parsedData.labels || !parsedData.counts || !parsedData.rates) {
        console.error('Daily chart data is missing required properties', parsedData);
        return;
      }
      
      // Create initial chart with counts data
      this.createDailyChart(ctx, parsedData, 'counts');
      
      // Set up toggle buttons
      const countsBtn = document.getElementById('showCounts');
      const ratesBtn = document.getElementById('showRates');
      
      if (countsBtn && ratesBtn) {
        countsBtn.addEventListener('click', () => {
          this.toggleDailyChart(countsBtn, ratesBtn, ctx, parsedData, 'counts');
        });
        
        ratesBtn.addEventListener('click', () => {
          this.toggleDailyChart(ratesBtn, countsBtn, ctx, parsedData, 'rates');
        });
      }
    } catch (error) {
      console.error('Error initializing daily chart:', error);
    }
  }

  /**
   * Create or update the daily chart
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} data - Chart data
   * @param {string} dataType - 'counts' or 'rates'
   */
  createDailyChart(ctx, data, dataType) {
    // Destroy existing chart if it exists
    if (this.charts.daily) {
      this.charts.daily.destroy();
    }
    
    const chartData = dataType === 'counts' ? data.counts : data.rates;
    const label = dataType === 'counts' ? 'Completions' : 'Completion Rate (%)';
    const color = dataType === 'counts' ? '#4f46e5' : '#0ea5e9';
    
    this.charts.daily = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: label,
          data: chartData,
          fill: {
            target: 'origin',
            above: dataType === 'counts' ? 'rgba(79, 70, 229, 0.05)' : 'rgba(14, 165, 233, 0.05)'
          },
          borderColor: color,
          borderWidth: 2,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500, // Shorter animation for better performance
          easing: 'easeOutQuart'
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              drawBorder: false,
              color: 'rgba(226, 232, 240, 0.6)'
            },
            ticks: {
              callback: function(value) {
                return dataType === 'rates' ? value + '%' : value;
              },
              font: {
                size: 10
              },
              maxTicksLimit: 6 // Limit the number of ticks for better readability
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 9
              },
              maxTicksLimit: 10 // Limit x-axis labels to avoid overcrowding
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#1e293b',
            bodyColor: '#334155',
            titleFont: {
              size: 12,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            padding: 12,
            borderColor: 'rgba(226, 232, 240, 1)',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return dataType === 'rates' 
                  ? context.parsed.y + '% completion rate'
                  : context.parsed.y + ' habits completed';
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Toggle between counts and rates for the daily chart
   */
  toggleDailyChart(activeBtn, inactiveBtn, ctx, data, dataType) {
    // Update button styles
    activeBtn.classList.add('bg-indigo-100', 'text-indigo-800');
    activeBtn.classList.remove('border', 'border-gray-200', 'text-gray-600');
    inactiveBtn.classList.remove('bg-indigo-100', 'text-indigo-800');
    inactiveBtn.classList.add('border', 'border-gray-200', 'text-gray-600');
    
    // Create new chart with selected data type
    this.createDailyChart(ctx, data, dataType);
  }

  /**
   * Initialize the weekly bar chart for completion rates by day of week
   * @param {Array} weeklyData - Array of completion rates for each day of week
   */
  initWeeklyChart(weeklyData) {
    const chartElement = document.getElementById('weeklyTrend');
    if (!chartElement) {
      console.error('Weekly chart element not found');
      return;
    }
    
    try {
      console.log('Initializing weekly chart with data:', weeklyData);
      
      // Ensure element is a canvas with a context
      if (!chartElement.getContext) {
        console.error('Weekly chart element is not a canvas element');
        return;
      }
      
      const ctx = chartElement.getContext('2d');
      const parsedData = typeof weeklyData === 'string' ? JSON.parse(weeklyData) : weeklyData;
      
      this.charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          datasets: [{
            label: 'Completion Rate (%)',
            data: parsedData,
            backgroundColor: Array(7).fill('rgba(99, 102, 241, 0.6)'),
            borderColor: Array(7).fill('rgb(99, 102, 241)'),
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 500,
            easing: 'easeOutQuart'
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: {
                display: true,
                drawBorder: false,
                color: 'rgba(226, 232, 240, 0.6)'
              },
              ticks: {
                callback: function(value) {
                  return value + '%';
                },
                font: {
                  size: 10
                },
                maxTicksLimit: 5
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 10
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              titleColor: '#1e293b',
              bodyColor: '#334155',
              titleFont: {
                size: 12,
                weight: 'bold'
              },
              bodyFont: {
                size: 12
              },
              padding: 10,
              borderColor: 'rgba(226, 232, 240, 1)',
              borderWidth: 1,
              displayColors: false,
              callbacks: {
                label: function(context) {
                  return context.parsed.y + '% completion rate';
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error initializing weekly chart:', error);
    }
  }

  /**
   * Initialize the monthly trends line chart
   * @param {Array} monthlyData - Array of completion counts for each month
   */
  initMonthlyChart(monthlyData) {
    const chartElement = document.getElementById('monthlyTrend');
    if (!chartElement) {
      console.error('Monthly chart element not found');
      return;
    }
    
    try {
      console.log('Initializing monthly chart with data:', monthlyData);
      
      // Ensure element is a canvas with a context
      if (!chartElement.getContext) {
        console.error('Monthly chart element is not a canvas element');
        return;
      }
      
      const ctx = chartElement.getContext('2d');
      const parsedData = typeof monthlyData === 'string' ? JSON.parse(monthlyData) : monthlyData;
      
      // Get the current year
      const currentYear = new Date().getFullYear();
      
      // Create labels for the months (abbreviated)
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      this.charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Completion Rate (%)',
            data: parsedData,
            fill: {
              target: 'origin',
              above: 'rgba(99, 102, 241, 0.1)'
            },
            borderColor: 'rgb(99, 102, 241)',
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: 'rgb(99, 102, 241)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 500,
            easing: 'easeOutQuart'
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: {
                display: true,
                drawBorder: false,
                color: 'rgba(226, 232, 240, 0.6)'
              },
              ticks: {
                callback: function(value) {
                  return value + '%';
                },
                font: {
                  size: 10
                },
                maxTicksLimit: 5
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 10
                },
                maxTicksLimit: 12
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              titleColor: '#1e293b',
              bodyColor: '#334155',
              titleFont: {
                size: 12,
                weight: 'bold'
              },
              bodyFont: {
                size: 12
              },
              padding: 10,
              borderColor: 'rgba(226, 232, 240, 1)',
              borderWidth: 1,
              displayColors: false,
              callbacks: {
                title: function(tooltipItems) {
                  return monthLabels[tooltipItems[0].dataIndex] + ' ' + currentYear;
                },
                label: function(context) {
                  return context.parsed.y + '% completion rate';
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error initializing monthly chart:', error);
    }
  }

  /**
   * Initialize the category breakdown doughnut chart
   * @param {Array} categoryData - Array of completion counts for each category
   * @param {Array} categoryLabels - Array of category names
   * @param {Array} categoryColors - Array of colors for each category
   */
  initCategoryChart(categoryData, categoryLabels, categoryColors) {
    const chartElement = document.getElementById('categoryChart');
    if (!chartElement) {
      console.error('Category chart element not found');
      return;
    }
    
    try {
      console.log('Initializing category chart with data:', categoryData, categoryLabels, categoryColors);
      
      // Ensure element is a canvas with a context
      if (!chartElement.getContext) {
        console.error('Category chart element is not a canvas element');
        return;
      }
      
      const ctx = chartElement.getContext('2d');
      const parsedData = typeof categoryData === 'string' ? JSON.parse(categoryData) : categoryData;
      const parsedLabels = typeof categoryLabels === 'string' ? JSON.parse(categoryLabels) : categoryLabels;
      const parsedColors = typeof categoryColors === 'string' ? JSON.parse(categoryColors) : categoryColors;
      
      this.charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: parsedLabels,
          datasets: [{
            data: parsedData,
            backgroundColor: parsedColors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true
          },
          layout: {
            padding: 20
          },
          plugins: {
            legend: {
              position: 'right',
              labels: {
                padding: 20,
                boxWidth: 12,
                boxHeight: 12
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              titleColor: '#1e293b',
              bodyColor: '#334155',
              titleFont: {
                size: 12,
                weight: 'bold'
              },
              bodyFont: {
                size: 12
              },
              padding: 12,
              borderColor: 'rgba(226, 232, 240, 1)',
              borderWidth: 1,
              displayColors: false
            }
          }
        }
      });
    } catch (error) {
      console.error('Error initializing category chart:', error);
    }
  }

  /**
   * Initialize the calendar heatmap
   * @param {Object} heatmapData - Data for the calendar heatmap
   */
  initHeatmap(heatmapData) {
    const heatmapElement = document.getElementById('heatmap');
    if (!heatmapElement) {
      console.error('Heatmap container not found');
      return;
    }
    
    try {
      console.log('Initializing heatmap with data:', heatmapData);
      
      // Parse data if it's a string
      let parsedData = typeof heatmapData === 'string' ? JSON.parse(heatmapData) : heatmapData;
      
      // Check if parsed data is empty
      if (!parsedData || Object.keys(parsedData).length === 0) {
        console.warn('No heatmap data available');
        heatmapElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">No activity data available</div>';
        return;
      }
      
      // Format data for Cal-Heatmap v4
      // Convert timestamp keys to a format Cal-Heatmap v4 can understand
      const formattedData = [];
      
      try {
        // Convert the object data format to array format required by Cal-Heatmap v4
        Object.keys(parsedData).forEach(timestamp => {
          formattedData.push({
            date: new Date(parseInt(timestamp) * 1000), // Convert seconds to milliseconds
            value: parsedData[timestamp]
          });
        });
        
        console.log('Formatted heatmap data:', formattedData);
        
        if (typeof CalHeatmap !== 'function') {
          console.error('CalHeatmap is not defined');
          heatmapElement.innerHTML = '<div class="text-center py-5 text-gray-500">Calendar heatmap is not available</div>';
          return;
        }
        
        // Clear any existing heatmap
        heatmapElement.innerHTML = '';
        
        // Initialize new heatmap
        const cal = new CalHeatmap();
        cal.paint({
          itemSelector: '#heatmap',
          range: 12,
          domain: {
            type: 'month',
            gutter: 15,
            label: {
              text: 'MMM',
              textAlign: 'center',
              position: 'top'
            }
          },
          subDomain: {
            type: 'day',
            radius: 2,
            width: 13,
            height: 13,
            gutter: 3
          },
          date: {
            start: new Date(new Date().setDate(new Date().getDate() - 365)),
            // Use a more current end date to ensure today's data is shown
            end: new Date()
          },
          data: {
            source: formattedData,
            x: 'date',
            y: 'value',
            type: 'json'
          },
          scale: {
            color: {
              range: ['#e0f2fe', '#3b82f6'],
              domain: [1, 10]
            }
          },
          // Add a tooltip to show the actual count value on hover
          tooltip: {
            enabled: true,
            text: function(date, value) {
              const formattedDate = new Intl.DateTimeFormat('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              }).format(date);
              return value ? `${formattedDate}: ${value} ${value === 1 ? 'habit' : 'habits'} completed` : `${formattedDate}: No habits completed`;
            }
          }
        });

        // Store the heatmap instance for potential updates
        this.heatmapInstance = cal;
        
        // Add a refresh button for the heatmap
        const refreshButton = document.createElement('button');
        refreshButton.className = 'mt-4 ml-2 px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors';
        refreshButton.textContent = 'Refresh Heatmap';
        refreshButton.addEventListener('click', () => this.refreshHeatmap());
        
        const heatmapParent = heatmapElement.parentNode;
        const buttonContainer = heatmapParent.querySelector('.flex.space-x-2');
        if (buttonContainer) {
          buttonContainer.appendChild(refreshButton);
        }
        
      } catch (innerError) {
        console.error('Error formatting heatmap data:', innerError);
        heatmapElement.innerHTML = '<div class="text-center py-5 text-gray-500">Error loading calendar heatmap data</div>';
      }
    } catch (error) {
      console.error('Error initializing heatmap:', error);
      if (heatmapElement) {
        heatmapElement.innerHTML = '<div class="text-center py-5 text-gray-500">Error loading calendar heatmap</div>';
      }
    }
  }

  /**
   * Refresh the heatmap data from the server
   */
  refreshHeatmap() {
    console.log('Refreshing heatmap data');
    
    // Get the current URL
    const url = window.location.href;
    
    // Make an AJAX request to get fresh data
    fetch(`${url}?refresh=true`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(html => {
        // Extract the heatmap data script from the response
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const scriptContent = Array.from(tempDiv.querySelectorAll('script'))
          .find(script => script.textContent.includes('window.statisticsData'))?.textContent;
        
        if (scriptContent) {
          // Evaluate the script to extract the data
          const dataMatch = scriptContent.match(/window\.statisticsData\s*=\s*({[\s\S]*?});/);
          if (dataMatch && dataMatch[1]) {
            try {
              const freshData = new Function(`return ${dataMatch[1]}`)();
              if (freshData && freshData.heatmapData) {
                // Update the global statisticsData
                window.statisticsData.heatmapData = freshData.heatmapData;
                
                // Reinitialize the heatmap with fresh data
                this.initHeatmap(freshData.heatmapData);
                
                console.log('Heatmap refreshed successfully');
              }
            } catch (error) {
              console.error('Error parsing fresh heatmap data:', error);
            }
          }
        }
      })
      .catch(error => {
        console.error('Error refreshing heatmap:', error);
      });
  }

  /**
   * Initialize sparklines for habit cards
   */
  initSparklines() {
    try {
      // Check if jQuery and the sparkline plugin are available
      if (typeof $ === 'undefined' || typeof $.fn.sparkline !== 'function') {
        console.warn('jQuery or sparkline plugin not available. Creating simple sparklines fallback.');
        // Create a simple fallback for sparklines
        this.createSimpleSparklines();
        return;
      }
      
      document.querySelectorAll('.sparkline').forEach(el => {
        if (el.dataset.sparkline) {
          try {
            const sparklineData = JSON.parse(el.dataset.sparkline);
            const options = {
              width: 80,
              height: 20,
              lineColor: '#4f46e5',
              fillColor: 'rgba(79, 70, 229, 0.1)',
              spotColor: '',
              minSpotColor: '',
              maxSpotColor: '',
              spotRadius: 2
            };
            
            // Use jQuery sparkline
            $(el).sparkline(sparklineData, options);
          } catch (error) {
            console.error('Error creating sparkline:', error);
            // Create a simple fallback for this specific sparkline
            this.createSimpleSparkline(el, el.dataset.sparkline);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing sparklines:', error);
      // Create a simple fallback for all sparklines
      this.createSimpleSparklines();
    }
  }
  
  /**
   * Create simple sparklines as a fallback
   */
  createSimpleSparklines() {
    document.querySelectorAll('.sparkline').forEach(el => {
      if (el.dataset.sparkline) {
        this.createSimpleSparkline(el, el.dataset.sparkline);
      }
    });
  }
  
  /**
   * Create a simple sparkline as a fallback using a div with colored bars
   * @param {HTMLElement} container - The container element
   * @param {string} dataString - JSON string of sparkline data
   */
  createSimpleSparkline(container, dataString) {
    try {
      // Clear any existing content
      container.innerHTML = '';
      
      // Parse the data
      const data = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
      
      // Create a simple bar display
      const barContainer = document.createElement('div');
      barContainer.className = 'flex items-center h-5 space-x-1';
      
      data.forEach(value => {
        const bar = document.createElement('div');
        bar.className = value > 0 
          ? 'h-4 w-1 bg-indigo-500' 
          : 'h-1 w-1 bg-gray-200';
        barContainer.appendChild(bar);
      });
      
      container.appendChild(barContainer);
    } catch (error) {
      console.error('Error creating simple sparkline:', error);
      container.innerHTML = '<div class="text-xs text-gray-400">No data</div>';
    }
  }

  /**
   * Initialize tab switching functionality
   */
  initTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active state from all tabs
        tabBtns.forEach(tab => {
          tab.classList.remove('border-indigo-500', 'text-indigo-600');
          tab.classList.add('text-gray-500');
        });
        
        // Add active state to clicked tab
        btn.classList.add('border-indigo-500', 'text-indigo-600');
        btn.classList.remove('text-gray-500');
        
        // Show the corresponding content
        const contentId = btn.id.replace('-tab', '-content');
        tabContents.forEach(content => {
          content.classList.add('hidden');
        });
        document.getElementById(contentId).classList.remove('hidden');
        
        // Lazy load charts when tabs are clicked
        if (btn.id === 'weekly-tab' && !this.charts.weekly) {
          this.initWeeklyChart(window.statisticsData.weeklyData);
        } else if (btn.id === 'monthly-tab' && !this.charts.monthly) {
          this.initMonthlyChart(window.statisticsData.monthlyData);
        } else if (btn.id === 'category-tab' && !this.charts.category) {
          this.initCategoryChart(
            window.statisticsData.categoryData, 
            window.statisticsData.categoryLabels, 
            window.statisticsData.categoryColors
          );
        }
        
        // Trigger resize event to make sure charts are properly sized
        window.dispatchEvent(new Event('resize'));
      });
    });
  }

  /**
   * Add hover animations to cards
   */
  addCardAnimations() {
    const cards = document.querySelectorAll('.group');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.classList.add('transform', 'translate-y-[-2px]');
      });
      
      card.addEventListener('mouseleave', () => {
        card.classList.remove('transform', 'translate-y-[-2px]');
      });
    });
  }

  /**
   * Show error messages in each chart container
   */
  showChartErrorMessages() {
    const containers = [
      { id: 'completionGauge', message: 'Completion gauge not available' },
      { id: 'dailyChart', message: 'Daily activity chart not available' },
      { id: 'weeklyTrend', message: 'Weekly trend chart not available' },
      { id: 'monthlyTrend', message: 'Monthly trend chart not available' },
      { id: 'categoryChart', message: 'Category breakdown chart not available' },
      { id: 'heatmap', message: 'Activity heatmap not available' }
    ];

    containers.forEach(container => {
      const element = document.getElementById(container.id);
      if (element) {
        element.innerHTML = `<div class="flex items-center justify-center h-full">
          <div class="text-gray-500">${container.message}</div>
        </div>`;
      }
    });
  }
} 