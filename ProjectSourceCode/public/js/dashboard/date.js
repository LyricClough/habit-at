/* public/js/dashboard/date.js */
export default function renderToday() {
    const el = document.getElementById('date');
    if (!el) return;
  
    const d = new Date();
    el.textContent = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month  : 'long',
      day    : 'numeric',
      year   : 'numeric'
    });
  }
  