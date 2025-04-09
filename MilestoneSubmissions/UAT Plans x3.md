1\. Calendar Page “Add Habit” UAT Plan

#### **Test Case 1: Verify All Fields Are Present in the Modal**

- **Precondition:** The "Add Habit" modal is open.  
- **Test Steps:**  
  - Check that the following fields are present in the modal:  
    - Habit Name (text field)  
    - Habit Description (text field)  
    - Weekday (dropdown or checkbox list)  
    - Time of Day (dropdown or time picker)  
    - Ensure there is a Submit and Cancel button.  
- **Expected Result:** The system should display an error message such as "Please enter a habit name."

  #### **Test Case 2: Verify Validation for Habit Name**

- **Precondition:** The "Add Habit" modal is open.  
- **Test Steps:**  
  - Leave the Habit Name field empty.  
  - Fill out the other fields (optional Habit Description, select Weekdays, and select Time of Day).  
  - Click "Submit."  
- **Expected Result:** The system should display an error message such as "Please enter a habit name."

#### **Test Case 3: Verify Validation for Weekday Selection**

- **Precondition:** The "Add Habit" modal is open.  
- **Test Steps:**  
  - Leave the Weekday selection empty (i.e., don't select any days).  
  - Fill out the other fields (Habit Name, optional Habit Description, Time of Day).  
  - Click "Submit."  
- **Expected Result:** The system should display an error message such as "Please select at least one weekday."

#### **Test Case 4: Verify Validation for Time of Day**

- **Precondition:** The "Add Habit" modal is open.  
- **Test Steps:**  
  - Leave the Time of Day field empty.  
  - Fill out the other fields (Habit Name, optional Habit Description, Weekday selection).  
  - Click "Submit."  
- **Expected Result:** The system should display an error message such as "Please select a time of day.

2\. Friends Page “add friend” UAT Plan

- User should be able to send a friends request and have the friend appear once the request is accepted  
  - The test data will include sample data from initializing the database in order to test in a controlled environment  
  - This will be done in the cloud since we need to be able to have a user be able to send, accept, and reject a friend request  
  - The test will be successful if the friend appears on the friend list once the request is accepted  
  - The user acceptance testers will be people who are somewhat familiar with technology and programs that allow for social interactions  
- Users should be able to both accept and reject a friend request from the plan when the request is there  
  - The test data will include sample data from initializing the database in order to test in a controlled environment  
  - This will be done in the cloud since we need to be able to have a user be able to send, accept, and reject a friend request  
  - The test will be successful if someone is able to both accept and reject a friend request  
  - The user acceptance testers will be people who are somewhat familiar with technology and programs that allow for social interactions

3\. Dashboard Page “Add/Subtract Result” UAT Plan

- A user must be able to increment or decrement the counter associated with any given habit. This information must be saved to the appropriate db table  
- The statistics shown on the dashboard must update dynamically.They must match both with the data on the statistics page and the data stored in the database.   
- A user should be able to add a habit from the dashboard and it should be properly reflected in the database.

4\) Email Notifications UAT Plan:  
User Story:

- As a regular user of the habit tracking application, I want to receive email notifications regarding my daily habits, progress, and reminders so that I stay accountable and motivated to achieve my personal goals.

Acceptance Criteria:

- Opt-In/Opt-Out Control:  
  - Users can enable or disable email notifications from their account settings.  
  - The default state for new accounts is opt-in for email notifications, with clear instructions on how to opt out.

- Customizable Frequency and Timing:  
- Users can choose the frequency of notifications (e.g., daily, weekly).  
- Users can set a specific time for when they want to receive notifications (e.g., morning reminders).

Content Requirements:

- Notifications include a summary of the user’s daily/weekly habit progress (e.g., days completed vs. days missed).  
- The email should contain motivational messages or tips based on the user’s goals.  
- The email includes a call-to-action with a link that directs the user back to the application for more detailed insights.

Trigger Conditions:

- An email is sent as a reminder if a habit remains incomplete by a scheduled deadline.  
- An email is sent summarizing weekly progress, highlighting both accomplishments and areas that need improvement.  
- In the event of a milestone (e.g., 21 consecutive days or achieving a new personal record), a congratulatory email is sent.

5\. Settings Page “Profile Settings”

- User Story: Editing any profile information (username, email, password, etc), must apply correctly to my account  
- Acceptance Criteria:  
  - The process must be rejected if the user’s username would be a duplicate  
  - The process must be rejected if any entries make no sense (for example, a nonsensical email or phone number)  
  - The information both on the screen and in the database should be updated to match the new account data.  
- User Story: the dark mode toggle needs to work  
- Acceptance Criteria:  
  - The dark mode toggle must universally apply to the site and be saved between sessions