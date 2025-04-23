/* public/js/dashboard/calendar.js */
let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();

export function initCalendar() {
  draw(currentMonth, currentYear);

  document.getElementById('prevMonth')
    ?.addEventListener('click', () => switchMonth(-1));
  document.getElementById('nextMonth')
    ?.addEventListener('click', () => switchMonth(+1));
}

/* ------------------------------------------------------------------ */

function switchMonth(dir) {
  currentMonth += dir;
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth =  0; currentYear++; }
  draw(currentMonth, currentYear);
}

function draw(month, year) {
  const first   = new Date(year, month, 1);
  const last    = new Date(year, month + 1, 0);
  const startDoW= first.getDay();           // 0 = Sun
  const days    = last.getDate();
  const grid    = document.getElementById('calendarDays');
  const label   = document.getElementById('currentMonth');

  if (!grid) return;
  grid.innerHTML = '';
  label.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // leading blanks
  for (let i = 0; i < startDoW; i++) grid.append(blank());

  // actual days
  for (let d = 1; d <= days; d++) {
    const cell = dayCell(d, month, year);
    grid.append(cell);
  }
}

/* ---------- helpers ---------- */

function blank() {
  const div = document.createElement('div');
  div.className = 'h-9 w-9';
  return div;
}

function dayCell(day, month, year) {
  const div     = document.createElement('div');
  const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const today   = new Date();
  const isToday = day === today.getDate() &&
                  month === today.getMonth() &&
                  year  === today.getFullYear();

  div.textContent = day;
  div.className   = 'h-9 w-9 rounded-full flex items-center justify-center text-sm relative';
  if (isToday) div.classList.add('bg-indigo-600', 'text-white', 'font-medium');
  else         div.classList.add('hover:bg-gray-100', 'cursor-pointer');

  div.addEventListener('click', () => window.showHabitsForDate?.(year, month, day));

  // check if this date has any habits (fake API until you wire real one)
  fetch(`/api/habits/date/${isoDate}`)
    .then(r => r.json())
    .then(({ habits }) => {
      if (habits?.length) {
        div.insertAdjacentHTML('beforeend',
          '<div class="absolute -bottom-1 inset-x-0 mx-auto h-1 w-1 bg-indigo-500 rounded-full"></div>');
      }
    })
    .catch(() => {}); // silent
  return div;
}
