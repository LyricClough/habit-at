/* public/js/dashboard/modal.js */
export function wireHabitModal() {
    document.getElementById('modalOverlay')
      ?.addEventListener('click', close);
  
    // global helpers so inline onclick handlers keep working
    window.openHabitDetail  = open;
    window.closeHabitDetail = close;
  }
  
  /* ------------------------------------------------------------------ */
  
  function open(habitId) {
    const modal   = document.getElementById('habitDetailModal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
  
    modal.classList.remove('hidden');
    content.innerHTML = skeleton();
  
    fetch(`/api/habits/${habitId}`)
      .then(r => r.json())
      .then(({ success, habit }) => {
        if (!success) throw new Error();
        content.innerHTML = markup(habit);
      })
      .catch(() => {
        content.innerHTML =
          '<p class="p-6 text-center text-red-600">Error loading habit.</p>';
      });
  }
  
  function close() {
    document.getElementById('habitDetailModal')?.classList.add('hidden');
  }
  
  /* ---------- private helpers ---------- */
  
  function skeleton() {
    return `
      <div class="animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-4/6 mb-6"></div>
        <div class="h-24 bg-gray-200 rounded mb-4"></div>
        <div class="h-10 bg-gray-200 rounded w-full"></div>
      </div>`;
  }
  
  function markup(h) {
    return `
      <div class="flex justify-between items-start">
        <h3 class="text-lg font-medium text-gray-900">${h.habit_name}</h3>
        <button onclick="closeHabitDetail()"
                class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
  
      <div class="mt-4">
        <p class="text-gray-500 mb-4">${h.description ?? 'No description.'}</p>
        <div class="bg-gray-50 p-3 rounded-lg mb-4">
          <div class="text-sm font-medium text-gray-500 mb-1">Progress</div>
          <div class="w-full bg-gray-200 rounded-full h-2.5 mb-1">
            <div class="bg-indigo-600 h-2.5 rounded-full" style="width:${h.progress ?? 0}%"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500">
            <span>${h.counter ?? 0} completions</span>
            <span>Target : 10</span>
          </div>
        </div>
  
        <form action="/completedHabit" method="POST">
          <input type="hidden" name="habitId" value="${h.habit_id}">
          <button type="submit"
                  class="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Mark as Complete
          </button>
        </form>
      </div>`;
  }
  