
// Function to create habit card on calendar
function createhabitCard(habitDetails) {

    let habit_element = document.createElement('div');
    habit_element.classList = 'habit row border rounded m-1 py-1';

    // Define colors for each category
    let categoryColors = {
        school: '#FFFFB3', // Pastel Yellow
        work: '#ADD8E6', // Pastel Blue
        social: '#B3E6B3', // Pastel Green
        personal: '#FFCCCC' // Pastel Red
    };

    // Assign color based on category
    let habitColor = categoryColors[habitDetails.category] || 'gray'; // Default to gray if no category selected

    // Set the background color of the habit based on the category
    habit_element.style.backgroundColor = habitColor;

    // Create the content for the habit card
    let info = document.createElement('div');
    info.classList = 'habit-info';

    // Adding habit details with labels (in bold) and data on separate lines
    info.innerHTML = `
        <div><strong>habit Name:</strong><br>${habitDetails.name}</div>
        <div><strong>Time:</strong><br>${habitDetails.time}</div>
        <div><strong>Category:</strong><br>${habitDetails.category.charAt(0).toUpperCase() + habitDetails.category.slice(1)}</div> <!-- Capitalize the category -->
    `;

    // Append the habit details to the habit element
    habit_element.appendChild(info);

    return habit_element;
}


function addhabitToCalendarUI(habitDetails) {
    // Select the day column based on the habit's weekday
    const weekdayColumn = document.getElementById(habitDetails.weekday.toLowerCase()); // e.g., 'monday', 'tuesday', etc.

    // Create the habit card and add it to the selected weekday
    let habit_card = createhabitCard(habitDetails);
    weekdayColumn.appendChild(habit_card);
}


function saveHabit() {
    // Get all form input values
    const habitName = document.getElementById("habit_name").value;
    const habitWeekday = document.getElementById("habit_weekday").value;
    const habitTime = document.getElementById("habit_time").value;
    const habitCategory = document.getElementById("habit_category").value; // Capture the category

    // Validate form values before saving
    if (!habitName || !habitTime) {
        alert("Please fill in all required fields.");
        return; // Prhabit form submission if required fields are missing
    }

    // Process the habit data (e.g., save to a calendar or backend)
    const habitData = {
        name: habitName,
        weekday: habitWeekday,
        time: habitTime,
        category: habitCategory // Add category to the habit details
    };

    console.log("habit Created:", habitData);
        
    // Call function to add habit to the calendar UI
    addhabitToCalendarUI(habitData);

    // Close the modal after saving
    const habitModal = new bootstrap.Modal(document.getElementById('habit_modal'));
    habitModal.hide();

    // Optionally, reset the form fields after submitting
    document.getElementById("habit_form").reset();
}

// habit listener for the modality dropdown to update location/remote URL visibility
document.getElementById("habit_modality").addhabitListener("change", function(habit) {
    updateLocationOptions(habit.target.value);
});

// habit listener for the "Create habit" button to save the habit
document.getElementById("save_habit_btn").addhabitListener("click", saveHabit);