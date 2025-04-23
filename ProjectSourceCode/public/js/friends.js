// public/js/friends.js

// —————————————————————————————————————————————————————
// Global element references (will be populated on DOMContentLoaded)
// —————————————————————————————————————————————————————
let tabs;
let friendsList, noFriends;
let friendRequests, noRequests;
let searchInput, searchResults, searchEmpty, searchInitial;
let requestCount, findFriendsBtn;
let friendStatsModal, closeModal, modalFriendName, friendStatsContainer;

// Track which tab is active
let activeTab = 'friends';


// —————————————————————————————————————————————————————
// Debounce helper
// —————————————————————————————————————————————————————
function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}


// —————————————————————————————————————————————————————
// Switch visible tab
// —————————————————————————————————————————————————————
function switchTab(tabName) {
  Object.keys(tabs).forEach(key => {
    const { tab, content } = tabs[key];
    if (key === tabName) {
      tab.classList.add('tab-active');
      tab.classList.remove('text-gray-500');
      content.classList.remove('hidden');
    } else {
      tab.classList.remove('tab-active');
      tab.classList.add('text-gray-500');
      content.classList.add('hidden');
    }
  });
  activeTab = tabName;
  localStorage.setItem('activeFriendsTab', tabName);
}


// —————————————————————————————————————————————————————
// Load & render “My Friends”
// —————————————————————————————————————————————————————
async function loadFriends() {
  try {
    const res = await fetch('/friends/api/friends');
    const { friends } = await res.json();
    friendsList.innerHTML = '';
    if (friends && friends.length) {
      noFriends.classList.add('hidden');
      friends.forEach(f => friendsList.appendChild(createFriendCard(f)));
    } else {
      noFriends.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error loading friends:', err);
    friendsList.innerHTML = `
      <div class="col-span-3 text-center py-6">
        <p class="text-red-500">Failed to load friends. Please try again.</p>
      </div>
    `;
  }
}


// —————————————————————————————————————————————————————
// Load & render pending requests
// —————————————————————————————————————————————————————
async function loadFriendRequests() {
  try {
    const res = await fetch('/friends/api/friends/requests');
    const { requests } = await res.json();
    friendRequests.innerHTML = '';
    if (requests && requests.length) {
      noRequests.classList.add('hidden');
      requestCount.textContent = requests.length;
      requestCount.classList.remove('hidden');
      requests.forEach(r => friendRequests.appendChild(createRequestCard(r)));
    } else {
      noRequests.classList.remove('hidden');
      requestCount.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error loading friend requests:', err);
    friendRequests.innerHTML = `
      <div class="text-center py-6">
        <p class="text-red-500">Failed to load friend requests. Please try again.</p>
      </div>
    `;
  }
}


// —————————————————————————————————————————————————————
// Search users by term >= 3 chars
// —————————————————————————————————————————————————————
async function searchUsers() {
  const term = searchInput.value.trim();
  if (term.length < 3) {
    searchResults.classList.add('hidden');
    searchEmpty.classList.add('hidden');
    searchInitial.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`/friends/api/friends/search?q=${encodeURIComponent(term)}`);
    const { users } = await res.json();
    searchResults.innerHTML = '';
    searchInitial.classList.add('hidden');

    if (users && users.length) {
      searchResults.classList.remove('hidden');
      searchEmpty.classList.add('hidden');
      users.forEach(u => searchResults.appendChild(createSearchResultCard(u)));
    } else {
      searchResults.classList.add('hidden');
      searchEmpty.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error searching users:', err);
    searchResults.innerHTML = `
      <div class="text-center py-6">
        <p class="text-red-500">Failed to search users. Please try again.</p>
      </div>
    `;
    searchResults.classList.remove('hidden');
    searchEmpty.classList.add('hidden');
    searchInitial.classList.add('hidden');
  }
}


// —————————————————————————————————————————————————————
// Send or accept friend request
// —————————————————————————————————————————————————————
async function addFriend(userId) {
  try {
    const res = await fetch('/friends/api/friends/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId: userId })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);

    // reload whichever view is active
    if (activeTab === 'friends')      loadFriends();
    else if (activeTab === 'requests') loadFriendRequests();
    if (activeTab === 'search')       searchUsers();

    return true;
  } catch (err) {
    console.error('Error adding friend:', err);
    return false;
  }
}


// —————————————————————————————————————————————————————
// Remove or reject a friend/request
// —————————————————————————————————————————————————————
async function removeFriend(userId) {
  if (!confirm('Are you sure you want to remove this friend?')) return false;
  try {
    const res = await fetch('/friends/api/friends/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId: userId })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);

    // refresh list
    loadFriends();
    return true;
  } catch (err) {
    console.error('Error removing friend:', err);
    return false;
  }
}


// —————————————————————————————————————————————————————
// Show a friend's statistics modal
/**
 * View friend stats: fills modal and then kicks off your chart.
 */
// async function viewFriendStats(friendId, friendName) {
//     try {
//       modalFriendName.textContent = `${friendName}'s Statistics`;
//       friendStatsModal.classList.remove('hidden');
//       friendStatsContainer.innerHTML = `
//         <div class="flex justify-center items-center p-8">
//           <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
//           <span class="ml-2">Loading stats.</span>
//         </div>
//       `;
  
//       const res = await fetch(`/friends/api/friends/${friendId}/stats`);
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Failed to load friend statistics');
  
//       // build the non-chart part of your modal…
//       let statsHTML = `
//         <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">…</div>
//       `;
  
//       // only inject the canvas if we have data
//       if (data.statistics && data.statistics.length > 0) {
//         statsHTML += `
//           <h3 class="text-lg font-medium text-gray-900 mt-8 mb-4">Completion History</h3>
//           <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
//             <canvas id="completion-chart" class="h-64 w-full"></canvas>
//           </div>
//         `;
//       }
  
//       friendStatsContainer.innerHTML = statsHTML;
  
//       // now actually render the Chart
//       if (data.statistics && data.statistics.length > 0) {
//         renderCompletionChart(data.statistics);
//       }
//     } catch (err) {
//       console.error('Error loading friend stats:', err);
//       friendStatsContainer.innerHTML = `<div class="text-center py-6 text-red-500">Failed to load friend statistics.</div>`;
//     }
//   }

async function viewFriendStats(friendId, friendName) {
    try {
      // Show modal & loading spinner
      modalFriendName.textContent = `${friendName}'s Statistics`;
      friendStatsModal.classList.remove('hidden');
      friendStatsContainer.innerHTML = `
        <div class="flex justify-center items-center p-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span class="ml-2">Loading stats...</span>
        </div>
      `;
  
      // Fetch data
      const res  = await fetch(`/friends/api/friends/${friendId}/stats`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load friend statistics');
  
      // Build the three summary cards
      const streak       = data.streak || {};
      const statsToday   = (data.statistics && data.statistics[0]) || {};
      const categories   = data.categories || [];
  
      let statsHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <!-- Current Streak -->
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 stat-card">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900">Current Streak</h4>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
              </svg>
            </div>
            <div class="mt-2">
              <span class="text-3xl font-bold">${streak.current_streak || 0}</span>
              <span class="text-sm text-gray-500 ml-2">days</span>
            </div>
            <div class="mt-2 text-sm text-gray-500">
              Longest streak: ${streak.longest_streak || 0} days
            </div>
          </div>
  
          <!-- Completion Rate -->
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 stat-card">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900">Completion Rate</h4>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="mt-2">
              <span class="text-3xl font-bold">${statsToday.completion_rate || 0}</span>
              <span class="text-sm text-gray-500 ml-2">%</span>
            </div>
            <div class="mt-2 text-sm text-gray-500">
              Total completions: ${statsToday.total_completions || 0}
            </div>
          </div>
  
          <!-- Active Habits -->
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 stat-card">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900">Active Habits</h4>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="mt-2">
              <span class="text-3xl font-bold">${statsToday.active_habits || 0}</span>
              <span class="text-sm text-gray-500 ml-2">habits</span>
            </div>
            <div class="mt-2 text-sm text-gray-500">
              Categories: ${categories.length}
            </div>
          </div>
        </div>
      `;
  
      // ————————————————————————————————————————————————————
      // Habits by Category table
      // ————————————————————————————————————————————————————
      if (categories.length > 0) {
        statsHTML += `
          <h3 class="text-lg font-medium text-gray-900 mb-4">Habits by Category</h3>
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
        `;
        categories.forEach(cat => {
          statsHTML += `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cat.category_name || 'Uncategorized'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cat.habit_count}</td>
            </tr>
          `;
        });
        statsHTML += `
              </tbody>
            </table>
          </div>
        `;
      }
  
      // ————————————————————————————————————————————————————
      // Completion History chart placeholder
      // ————————————————————————————————————————————————————
      if (data.statistics && data.statistics.length > 0) {
        statsHTML += `
          <h3 class="text-lg font-medium text-gray-900 mt-8 mb-4">Completion History</h3>
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <canvas id="completion-chart" class="h-64 w-full"></canvas>
          </div>
        `;
      }
  
      // Inject and then render chart
      friendStatsContainer.innerHTML = statsHTML;
      if (data.statistics && data.statistics.length > 0) {
        renderCompletionChart(data.statistics);
      }
    }
    catch (err) {
      console.error('Error loading friend stats:', err);
      friendStatsContainer.innerHTML = `
        <div class="text-center py-6 text-red-500">
          Failed to load friend statistics.
        </div>
      `;
    }
  }
  
  /**
   * renderCompletionChart
   * @param {Array<{ date: string, completion_rate: number }>} stats
   */
  function renderCompletionChart(stats) {
    const canvas = document.getElementById('completion-chart');
    if (!canvas || !canvas.getContext) {
      console.error('Canvas #completion-chart not found or invalid');
      return;
    }
  
    const ctx = canvas.getContext('2d');
  
    // build labels like "4/20", "4/21", etc.
    const labels = stats.map(s =>
      new Date(s.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
    );
  
    const dataPoints = stats.map(s => s.completion_rate);
  
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Completion %',
          data: dataPoints,
          fill: {
            target: 'origin',
            above: 'rgba(79, 70, 229, 0.05)'
          },
          borderColor: '#4F46E5',
          borderWidth: 2,
          pointBackgroundColor: '#4F46E5',
          pointBorderColor: '#fff',
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
            ticks: {
              callback: v => `${v}%`,
              maxTicksLimit: 6,
              font: { size: 10 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 10, font: { size: 9 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.parsed.y}% completion rate`
            }
          }
        }
      }
    });
  }
  
// —————————————————————————————————————————————————————
// Card factory: friend list
// —————————————————————————————————————————————————————
function createFriendCard(friend) {
  const card = document.createElement('div');
  card.className = 'friend-card bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden';

  const cRate = friend.completion_rate || 0;
  const cStreak = friend.current_streak || 0;

  card.innerHTML = `
    <div class="p-5">
      <div class="flex items-center mb-4">
        <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
          <span class="text-lg font-medium">${friend.username.charAt(0).toUpperCase()}</span>
        </div>
        <div class="ml-3">
          <h3 class="text-lg font-medium text-gray-900">${friend.username}</h3>
          <p class="text-sm text-gray-500">${friend.email}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="text-center p-2 bg-indigo-50 rounded">
          <div class="text-xl font-bold text-indigo-600">${cRate}%</div>
          <div class="text-xs text-gray-500">Completion</div>
        </div>
        <div class="text-center p-2 bg-yellow-50 rounded">
          <div class="text-xl font-bold text-yellow-600">${cStreak}</div>
          <div class="text-xs text-gray-500">Streak</div>
        </div>
      </div>
      <div class="flex space-x-2">
        <button data-friend-id="${friend.user_id}"
                data-friend-name="${friend.username}"
                class="view-stats-btn flex-1 bg-indigo-50 text-indigo-600 py-2 px-4 rounded hover:bg-indigo-100">
          View Stats
        </button>
        <button data-friend-id="${friend.user_id}"
                class="remove-friend-btn text-red-500 hover:text-red-700 p-2">
          <!-- trash icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9 2…z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  // wire buttons:
  card.querySelector('.view-stats-btn')
      .addEventListener('click', () => {
        const id   = card.querySelector('.view-stats-btn').dataset.friendId;
        const name = card.querySelector('.view-stats-btn').dataset.friendName;
        viewFriendStats(id, name);
      });
  card.querySelector('.remove-friend-btn')
      .addEventListener('click', () => removeFriend(card.querySelector('.remove-friend-btn').dataset.friendId));

  return card;
}


// —————————————————————————————————————————————————————
// Card factory: request list
// —————————————————————————————————————————————————————
function createRequestCard(req) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between';

  const date = new Date(req.created_at).toLocaleDateString();
  card.innerHTML = `
    <div class="flex items-center">
      <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
        <span class="text-lg font-medium">${req.username.charAt(0).toUpperCase()}</span>
      </div>
      <div class="ml-3">
        <h3 class="font-medium text-gray-900">${req.username}</h3>
        <p class="text-sm text-gray-500">${req.email}</p>
        <p class="text-xs text-gray-400">Requested on ${date}</p>
      </div>
    </div>
    <div class="flex space-x-2">
      <button data-friend-id="${req.user_id}" class="accept-request-btn bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">
        Accept
      </button>
      <button data-friend-id="${req.user_id}" class="reject-request-btn bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300">
        Reject
      </button>
    </div>
  `;

  card.querySelector('.accept-request-btn')
      .addEventListener('click', async () => {
        if (await addFriend(req.user_id)) {
          loadFriendRequests();
          loadFriends();
        }
      });
  card.querySelector('.reject-request-btn')
      .addEventListener('click', async () => {
        if (await removeFriend(req.user_id)) {
          loadFriendRequests();
        }
      });

  return card;
}


// —————————————————————————————————————————————————————
// Card factory: search results
// —————————————————————————————————————————————————————
function createSearchResultCard(u) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between';

  card.innerHTML = `
    <div class="flex items-center">
      <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
        <span class="text-lg font-medium">${u.username.charAt(0).toUpperCase()}</span>
      </div>
      <div class="ml-3">
        <h3 class="font-medium text-gray-900">${u.username}</h3>
        <p class="text-sm text-gray-500">${u.email}</p>
      </div>
    </div>
  `;

  let btnHtml;
  if (u.isFriend) {
    btnHtml = `<button onclick="viewFriendStats(${u.user_id}, '${u.username}')" class="bg-indigo-600 text-white py-2 px-4 rounded">View Stats</button>`;
  } else if (u.pendingReceived) {
    btnHtml = `<button onclick="addFriend(${u.user_id})" class="bg-indigo-600 text-white py-2 px-4 rounded">Accept</button>`;
  } else if (u.pendingSent) {
    btnHtml = `<button disabled class="bg-gray-300 text-gray-600 py-2 px-4 rounded">Requested</button>`;
  } else {
    btnHtml = `<button onclick="addFriend(${u.user_id})" class="bg-indigo-600 text-white py-2 px-4 rounded">Add Friend</button>`;
  }

  card.innerHTML += btnHtml;
  return card;
}


// —————————————————————————————————————————————————————
// Initialize on DOM ready
// —————————————————————————————————————————————————————
document.addEventListener('DOMContentLoaded', () => {
  // grab all the required elements
  tabs = {
    friends:  { tab: document.getElementById('friends-tab'),  content: document.getElementById('friends-content')  },
    requests: { tab: document.getElementById('requests-tab'), content: document.getElementById('requests-content') },
    search:   { tab: document.getElementById('search-tab'),   content: document.getElementById('search-content')   },
  };
  friendsList        = document.getElementById('friends-list');
  noFriends          = document.getElementById('no-friends');
  friendRequests     = document.getElementById('friend-requests');
  noRequests         = document.getElementById('no-requests');
  searchInput        = document.getElementById('search-input');
  searchResults      = document.getElementById('search-results');
  searchEmpty        = document.getElementById('search-empty');
  searchInitial      = document.getElementById('search-initial');
  requestCount       = document.getElementById('request-count');
  findFriendsBtn     = document.getElementById('find-friends-btn');
  friendStatsModal   = document.getElementById('friend-stats-modal');
  closeModal         = document.getElementById('close-modal');
  modalFriendName    = document.getElementById('modal-friend-name');
  friendStatsContainer = document.getElementById('friend-stats-container');

  // tab clicks
  Object.keys(tabs).forEach(key =>
    tabs[key].tab.addEventListener('click', () => switchTab(key))
  );

  // restore last tab or default
  const saved = localStorage.getItem('activeFriendsTab') || 'friends';
  switchTab(saved);

  // load initial data
  loadFriends();
  loadFriendRequests();

  // wire search input
  searchInput.addEventListener('input', debounce(searchUsers, 500));

  // find-friends button
  findFriendsBtn.addEventListener('click', () => switchTab('search'));

  // modal close
  closeModal.addEventListener('click', () => friendStatsModal.classList.add('hidden'));
  friendStatsModal.addEventListener('click', e => {
    if (e.target === friendStatsModal) friendStatsModal.classList.add('hidden');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !friendStatsModal.classList.contains('hidden')) {
      friendStatsModal.classList.add('hidden');
    }
  });

  // (Optional) Debug toggle
  const header = document.querySelector('.max-w-6xl > div:first-child');
  const dbgBtn = document.createElement('button');
  dbgBtn.textContent = 'Debug';
  dbgBtn.className   = 'text-xs text-gray-400 ml-4';
  dbgBtn.addEventListener('click', () => {
    const ds = document.getElementById('debug-section');
    ds.style.display = ds.style.display === 'none' ? 'block' : 'none';
  });
  header.appendChild(dbgBtn);

  document.getElementById('show-all-users')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/friends/api/debug/users');
      const { users } = await res.json();
      const out = document.getElementById('debug-output');
      out.innerHTML = '<h4 class="font-bold mb-2">All Users:</h4>';
      if (users && users.length) {
        const ul = document.createElement('ul');
        ul.className = 'list-disc pl-5';
        users.forEach(u => {
          const li = document.createElement('li');
          li.innerHTML = `
            ID: ${u.user_id}, Username: ${u.username}, Email: ${u.email}
            <button data-user-id="${u.user_id}"
                    class="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
              Add Friend
            </button>
          `;
          ul.appendChild(li);
        });
        out.appendChild(ul);
        ul.querySelectorAll('button').forEach(btn =>
          btn.addEventListener('click', async () => {
            const id = btn.dataset.userId;
            await addFriend(id);
            alert(`Friend request sent to user ID: ${id}`);
          })
        );
      } else {
        out.innerHTML += '<p>No users found</p>';
      }
    } catch (err) {
      console.error(err);
      document.getElementById('debug-output').innerHTML = `<p class="text-red-500">${err.message}</p>`;
    }
  });
});
