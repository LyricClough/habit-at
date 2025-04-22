/**
 * Visualizations Module
 * Handles all chart and visualization initializations for the statistics page
 */

export class VisualizationManager {
  constructor() {
    this.charts = {};
  }

  /**
   * Initialize all visualizations on the statistics page
   * @param {Object} data - Statistics data from the server
   */
  initVisualizations(data) {
    if (!data) return;

    // Initialize all charts
    this.initCompletionGauge(data.completionRate);
    this.initDailyChart(data.dailyCompletionData);
    this.initWeeklyChart(data.weeklyData);
    this.initMonthlyChart(data.monthlyData, data.monthLabels);
    this.initCategoryChart(data.categoryData, data.categoryLabels, data.categoryColors);
    this.initHeatmap(data.heatmapData);
    this.initSparklines();

    // Initialize tab switching
    this.initTabSwitching();
  }

  /**
   * Initialize the completion rate gauge chart
   * @param {number} completionRate - The overall completion rate
   */
  initCompletionGauge(completionRate) {
    const gaugeElement = document.getElementById('completionGauge');
    if (!gaugeElement) return;
    
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
          tooltip: { enabled: false }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
    
    // Add text in the center of the doughnut
    Chart.register({
      id: 'gaugeText',
      beforeDraw: (chart) => {
        const width = chart.width;
        const height = chart.height;
        const ctx = chart.ctx;
        
        ctx.restore();
        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e293b';
        ctx.fillText(`${completionRate}%`, width/2, height/2);
        ctx.save();
      }
    });
  }

  /**
   * Initialize the daily line chart for the last 30 days
   * @param {Object} dailyData - Data containing labels, counts, and rates
   */
  initDailyChart(dailyData) {
    const chartElement = document.getElementById('dailyChart');
    if (!chartElement || !dailyData) return;
    
    const ctx = chartElement.getContext('2d');
    const parsedData = typeof dailyData === 'string' ? JSON.parse(dailyData) : dailyData;
    
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
          duration: 1000,
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
              }
            }
          },
          x: {
            grid: {
              display: false
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
    if (!chartElement || !weeklyData) return;
    
    const ctx = chartElement.getContext('2d');
    const parsedData = typeof weeklyData === 'string' ? JSON.parse(weeklyData) : weeklyData;
    
    this.charts.weekly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        datasets: [{
          label: 'Completion Rate (%)',
          data: parsedData,
          backgroundColor: Array(7).fill('rgba(99, 102, 241, 0.6)'),
          borderColor: Array(7).fill('rgb(99, 102, 241)'),
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
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
              }
            }
          },
          x: {
            grid: {
              display: false
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
                return context.parsed.y + '% completion rate';
              }
            }
          }
        }
      }
    });
  }

  /**
   * Initialize the monthly trends line chart
   * @param {Array} monthlyData - Array of completion counts for each month
   * @param {Array} monthLabels - Array of month names
   */
  initMonthlyChart(monthlyData, monthLabels) {
    const chartElement = document.getElementById('monthlyTrend');
    if (!chartElement || !monthlyData || !monthLabels) return;
    
    const ctx = chartElement.getContext('2d');
    const parsedData = typeof monthlyData === 'string' ? JSON.parse(monthlyData) : monthlyData;
    const parsedLabels = typeof monthLabels === 'string' ? JSON.parse(monthLabels) : monthLabels;
    
    this.charts.monthly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: parsedLabels,
        datasets: [{
          label: 'Total Completions',
          data: parsedData,
          fill: {
            target: 'origin',
            above: 'rgba(34, 197, 94, 0.05)'
          },
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              drawBorder: false,
              color: 'rgba(226, 232, 240, 0.6)'
            }
          },
          x: {
            grid: {
              display: false
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
            displayColors: false
          }
        }
      }
    });
  }

  /**
   * Initialize the category breakdown doughnut chart
   * @param {Array} categoryData - Array of completion counts for each category
   * @param {Array} categoryLabels - Array of category names
   * @param {Array} categoryColors - Array of colors for each category
   */
  initCategoryChart(categoryData, categoryLabels, categoryColors) {
    const chartElement = document.getElementById('categoryChart');
    if (!chartElement || !categoryData || !categoryLabels || !categoryColors) return;
    
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
  }

  /**
   * Initialize the calendar heatmap
   * @param {Object} heatmapData - Data for the calendar heatmap
   */
  initHeatmap(heatmapData) {
    const heatmapElement = document.getElementById('heatmap');
    if (!heatmapElement || !heatmapData) return;
    
    const parsedData = typeof heatmapData === 'string' ? JSON.parse(heatmapData) : heatmapData;
    
    const cal = new CalHeatmap();
    cal.init({
      itemSelector: '#heatmap',
      domain: 'month',
      subDomain: 'day',
      range: 12,
      cellSize: 13,
      cellPadding: 3,
      domainGutter: 15,
      domainMargin: [0, 0, 0, 0],
      data: parsedData,
      start: new Date(new Date().setDate(new Date().getDate() - 365)),
      legend: [1, 3, 5, 7, 10],
      legendColors: {
        empty: '#f8fafc',
        min: '#e0f2fe',
        max: '#3b82f6'
      },
      tooltip: true,
      displayLegend: true,
      itemName: ['completion', 'completions']
    });
  }

  /**
   * Initialize sparklines for habit cards
   */
  initSparklines() {
    document.querySelectorAll('.sparkline').forEach(el => {
      if (el.dataset.sparkline) {
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
        
        const sparkline = new Sparkline(el);
        sparkline.draw(sparklineData, options);
      }
    });
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
} 