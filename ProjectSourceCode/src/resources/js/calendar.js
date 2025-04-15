document.addEventListener("DOMContentLoaded", function () {
    // Handle opening the modal when the "Add Habit" button is clicked
    const addHabitBtn = document.getElementById("add-habit-btn");
    const habitModal = new bootstrap.Modal(document.getElementById("habitModal"));

    addHabitBtn.addEventListener("click", function () {
        habitModal.show();
    });

    // Handle form submission for adding a habit
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
                habitWeekday: parseInt(habitWeekday),
                habitTime: parseInt(habitTime)
            })
        })
        .then(response => response.json())
        .then(data => {
            habitModal.hide();
            alert("Habit added successfully!");
            window.location.reload(); // Refresh to update calendar
        })
        .catch(error => {
            console.error("Error adding habit:", error);
        });
    });

    // Handle clicking on habit buttons in the calendar
    const detailButtons = document.querySelectorAll(".habit-detail-btn");

    // If a detail modal exists on the page
    const habitDetailModal = document.getElementById("habitDetailModal");
    const showHabitModal = habitDetailModal ? new bootstrap.Modal(habitDetailModal) : null;

    detailButtons.forEach(button => {
        button.addEventListener("click", function () {
            const name = this.dataset.habitName;
            const desc = this.dataset.habitDescription || "No description provided.";
            const weekday = this.dataset.habitWeekday;
            const time = this.dataset.habitTime;

            if (showHabitModal) {
                // Fill modal content
                document.getElementById("habitDetailName").textContent = name;
                document.getElementById("habitDetailDescription").textContent = desc;
                document.getElementById("habitDetailTime").textContent = `${weekdayToName(weekday)} at ${time}:00`;
                showHabitModal.show();
            } else {
                // Fallback: simple alert
                alert(`${name}\n${desc}\nScheduled: ${weekdayToName(weekday)} at ${time}:00`);
            }
        });
    });

    // Convert weekday number to name
    function weekdayToName(n) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[parseInt(n)];
    }
});
