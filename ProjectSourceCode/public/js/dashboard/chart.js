/* public/js/dashboard/chart.js */
export function renderCompletionChart(weeklyData = [], todayPerc = 0) {
    const canvas = document.getElementById('completionChart');
    if (!canvas) return;
  
    const ctx    = canvas.getContext('2d');
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
  
    const data = weeklyData.length ? weeklyData
                                   : [65, 70, 80, 75, 90, 85, todayPerc];
  
    new Chart(ctx, {
      type   : 'line',
      data   : {
        labels,
        datasets: [{
          label           : 'Completion (%)',
          data,
          fill            : true,
          tension         : .3,
          borderColor     : '#4f46e5',
          backgroundColor : 'rgba(79,70,229,.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales : {
          y: {
            beginAtZero: true,
            max        : 100,
            ticks      : { callback: v => v + '%' }
          }
        }
      }
    });
  }
  