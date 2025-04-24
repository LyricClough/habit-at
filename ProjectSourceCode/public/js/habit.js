async function toggleDone(habitId) {
    const res  = await fetch(`/habits/${habitId}/done`, { method: 'POST' });
    const json = await res.json();
    const card = document.querySelector(`#habit-${habitId}`);
  
    card.classList.toggle('line-through', json.done);
    card.querySelector('[data-done-checkbox]').checked = json.done;
  }
  