import renderDate            from './date.js';
import { initCalendar }      from './calendar.js';
import { renderChart }       from './chart.js';
import { wireHabitModal }    from './modal.js';

document.addEventListener('DOMContentLoaded', () => {
  renderDate();
  initCalendar();
  renderChart();
  wireHabitModal();
});