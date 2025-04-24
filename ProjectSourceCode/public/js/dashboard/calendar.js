/* public/js/dashboard/calendar.js */
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

export function initCalendar() {
  console.log('Calendar initialization started with simplified implementation');
  
  // Test elements exist
  const calendarGrid = document.getElementById('calendarDays');
  const monthDisplay = document.getElementById('currentMonth');
  const habitsContainer = document.getElementById('habits-for-date');
  const dateDisplay = document.getElementById('selected-date');
  
  console.log('Calendar elements check:', {
    calendarGrid: !!calendarGrid,
    monthDisplay: !!monthDisplay,
    habitsContainer: !!habitsContainer,
    dateDisplay: !!dateDisplay
  });
  
  // Set default content
  if (dateDisplay) {
    dateDisplay.textContent = 'Calendar';
  }
  
  if (habitsContainer) {
    habitsContainer.innerHTML = '<div class="p-4 text-gray-500 text-center">Select a date to view habits</div>';
  }
  
  // Fill calendar with simple dates
  if (calendarGrid) {
    // Clear existing content
    calendarGrid.innerHTML = '';
    
    // Add month and year to display
    if (monthDisplay) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
      monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    // Get days in month
    const today = new Date();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Add blank spaces for days before the 1st
    for (let i = 0; i < startingDay; i++) {
      const blankCell = document.createElement('div');
      blankCell.className = 'h-9 w-9';
      calendarGrid.appendChild(blankCell);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.textContent = day;
      
      // Check if this is today
      const isToday = day === today.getDate() && 
                     currentMonth === today.getMonth() && 
                     currentYear === today.getFullYear();
                     
      // Apply styles
      cell.className = 'h-9 w-9 rounded-full flex items-center justify-center text-sm cursor-pointer';
      
      if (isToday) {
        cell.className += ' bg-indigo-600 text-white font-medium';
      } else {
        cell.className += ' hover:bg-gray-100';
      }
      
      // Add click event
      const date = new Date(currentYear, currentMonth, day);
      cell.addEventListener('click', function() {
        selectDate(date);
      });
      
      // Add to grid
      calendarGrid.appendChild(cell);
    }
  }
  
  // Add event listeners to month navigation
  document.getElementById('prevMonth')?.addEventListener('click', function() {
    navigateMonth(-1);
  });
  
  document.getElementById('nextMonth')?.addEventListener('click', function() {
    navigateMonth(1);
  });
  
  // Initialize with today
  selectDate(new Date());
}

function navigateMonth(direction) {
  currentMonth += direction;
  
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  
  // Redraw calendar
  initCalendar();
}

function selectDate(date) {
  console.log('Date selected:', date);
  selectedDate = date;
  
  // Update date display
  const dateDisplay = document.getElementById('selected-date');
  if (dateDisplay) {
    dateDisplay.textContent = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Format date as YYYY-MM-DD for API call
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  
  // Show loading state
  const habitsContainer = document.getElementById('habits-for-date');
  if (habitsContainer) {
    habitsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Loading habits...</div>';
    
    // Load habits
    fetch(`/api/habits/date/${formattedDate}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load habits');
        }
        return response.json();
      })
      .then(data => {
        if (!data.habits || data.habits.length === 0) {
          habitsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">No habits for this day</div>';
          return;
        }
        
        // Display habits
        habitsContainer.innerHTML = '';
        data.habits.forEach(habit => {
          const habitEl = document.createElement('div');
          habitEl.className = 'habit-card p-3 mb-2 rounded-lg shadow-sm border border-gray-100';
          habitEl.className += habit.is_completed ? ' bg-green-50' : ' bg-white';
          
          habitEl.innerHTML = `
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="${habit.is_completed ? 'text-green-500' : 'text-indigo-500'}">
                  ${habit.is_completed ? '✓' : '○'}
                </div>
                <div>
                  <h3 class="font-medium">${habit.habit_name}</h3>
                  <p class="text-xs text-gray-500">${habit.time_slot || 'Anytime'}</p>
                </div>
              </div>
              <div>
                ${!habit.is_completed ? 
                  `<button class="complete-habit-btn text-xs px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded" 
                   data-habit-id="${habit.habit_id}" data-date="${formattedDate}">Complete</button>` : 
                  `<span class="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">Completed</span>`
                }
              </div>
            </div>
            ${habit.description ? `<p class="mt-2 text-sm text-gray-600">${habit.description}</p>` : ''}
          `;
          
          habitsContainer.appendChild(habitEl);
        });
        
        // Add event listeners to complete buttons
        document.querySelectorAll('.complete-habit-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const habitId = this.getAttribute('data-habit-id');
            const date = this.getAttribute('data-date');
            completeHabit(habitId, date);
          });
        });
      })
      .catch(error => {
        console.error('Error loading habits:', error);
        habitsContainer.innerHTML = '<div class="p-4 text-center text-red-500">Error loading habits</div>';
      });
  }
}

function completeHabit(habitId, date) {
  // Show processing state
  const button = document.querySelector(`.complete-habit-btn[data-habit-id="${habitId}"]`);
  if (button) {
    button.textContent = 'Processing...';
    button.disabled = true;
  }
  
  // Make API call
  fetch('/api/habits/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ habitId, date })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Refresh habits display
      const dateParts = date.split('-');
      const refreshDate = new Date(
        parseInt(dateParts[0]), 
        parseInt(dateParts[1]) - 1, 
        parseInt(dateParts[2])
      );
      selectDate(refreshDate);
    } else {
      throw new Error(data.error || 'Failed to complete habit');
    }
  })
  .catch(error => {
    console.error('Error completing habit:', error);
    if (button) {
      button.textContent = 'Complete';
      button.disabled = false;
    }
  });
}
