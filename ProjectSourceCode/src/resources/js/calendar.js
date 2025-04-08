// calendar.js
document.addEventListener("DOMContentLoaded", function () {
    // Handle opening the modal when the "Add Habit" button is clicked
    const addHabitBtn = document.getElementById("add-habit-btn");
    const habitModal = new bootstrap.Modal(document.getElementById("habitModal"));

    addHabitBtn.addEventListener("click", function () {
        habitModal.show();
    });

    // Handle form submission
    const habitForm = document.getElementById("habit-form");
    habitForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const habitName = document.getElementById("habitName").value;
        const habitDescription = document.getElementById("habitDescription").value;
        const habitWeekday = document.getElementById("habitWeekday").value;
        const habitTime = document.getElementById("habitTime").value;

        // POST the form data to the server
        fetch("/add-habit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            habitName,
            habitDescription,
            habitWeekday,
            habitTime
        })
        })
        .then(response => response.json())
        .then(data => {
            // Close the modal
            habitModal.hide();

            // Optionally update the calendar table dynamically or refresh the page
            alert("Habit added successfully!");
            window.location.reload(); // Refresh the page to show the new habit
        })
        .catch(error => {
            console.error("Error adding habit:", error);
        });
    });
});
  