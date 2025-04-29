# habit-at

## Team Section
011 - 5

## Contributor Names and Emails:
Sudarshan Damodharan (suda5189@colorado.edu)

Lyric Clough (lyric.clough@colorado.edu)

Aaditya Yanamandra (aaya7809@colorado.edu)

Julian Franko (jufr1176@colorado.edu)

Cal Duffy (dedu4158@colorado.edu)

	
## App Name
Habit@


## Vision Statement
We are here to help build people up and break down their barriers to success.
For customers who need to form or break habits. Habit@ is an app that tracks habits and reminds users periodically to follow up on (or ignore) those habits.

## Description of the application
Habit-@ is a lightweight, user-friendly web application designed to help users build and maintain positive routines.It offers a personalized dashboard where users can create, track, and manage daily, weekly, and monthly habits. Beyond basic tracking, the application provides rich statistics to help users visualize progress, monitor streaks, and identify areas for improvement. To boost accountability, the Habit Tracker includes an integrated reminder system, sending personalized email notifications to encourage users to stay on track. A calendar feature enables users to view their habit history at a glance, making it easy to recognize patterns and maintain momentum. Additionally, a friends feature allows users to connect with others, fostering community, encouragement, and friendly competition.
Built with a Node.js backend, Express server, and PostgreSQL database, the application ensures fast, secure, and reliable performance. The front end is crafted using Handlebars templates for dynamic rendering, providing an intuitive and clean user experience. A scheduling service is integrated using Node-Cron, automating digest generation and daily resets. Deployment is handled via Docker and Render, ensuring scalability and minimal downtime.
Habit-@ emphasizes simplicity and personalization, making it ideal for individuals looking to incrementally improve their productivity, health, or wellness routines. Future extensions could include gamification elements, habit-sharing with friends, and advanced analytics for deeper insights into behavior patterns. Overall, the application combines solid engineering with thoughtful design to empower users to achieve their personal goals more effectively. 

## Directory Strucutre
```
lyricclough-habit-at/
├── README.md
├── MilestoneSubmissions/
│   ├── UAT Plans x3.md
│   └── Lab 9 Writeup/
├── ProjectSourceCode/
│   ├── docker-compose.yaml
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── .gitignore
│   ├── public/
│   │   ├── css/
│   │   │   └── output.css
│   │   ├── imgs/
│   │   └── js/
│   │       ├── friends.js
│   │       ├── habit.js
│   │       ├── statistics.js
│   │       ├── visualizations.js
│   │       └── dashboard/
│   │           ├── calendar.js
│   │           ├── date.js
│   │           └── main.js
│   ├── src/
│   │   ├── index.js
│   │   ├── css/
│   │   │   └── tailwind.css
│   │   ├── init_data/
│   │   │   ├── create.sql
│   │   │   └── insert.sql
│   │   ├── js/
│   │   │   ├── config/
│   │   │   │   ├── db.js
│   │   │   │   └── viewEngine.js
│   │   │   ├── controllers/
│   │   │   │   ├── authController.js
│   │   │   │   ├── dashboardController.js
│   │   │   │   ├── friendsController.js
│   │   │   │   ├── habitsController.js
│   │   │   │   ├── notificationsController.js
│   │   │   │   ├── settingsController.js
│   │   │   │   └── statisticsController.js
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js
│   │   │   │   └── setLocals.js
│   │   │   ├── routes/
│   │   │   │   ├── authRoutes.js
│   │   │   │   ├── dashboardRoutes.js
│   │   │   │   ├── friendsRoutes.js
│   │   │   │   ├── habitsRoutes.js
│   │   │   │   ├── notificationsRoutes.js
│   │   │   │   ├── settingsRoutes.js
│   │   │   │   └── statisticsRoutes.js
│   │   │   └── services/
│   │   │       ├── demoScheduler.js
│   │   │       ├── notificationService.js
│   │   │       └── schedulerService.js
│   │   └── views/
│   │       ├── layouts/
│   │       │   └── main.hbs
│   │       ├── pages/
│   │       │   ├── dashboard.hbs
│   │       │   ├── debug-statistics.hbs
│   │       │   ├── friends.hbs
│   │       │   ├── habits.hbs
│   │       │   ├── login.hbs
│   │       │   ├── notifications.hbs
│   │       │   ├── register.hbs
│   │       │   ├── settings.hbs
│   │       │   └── statistics.hbs
│   │       └── partials/
│   │           ├── footer.hbs
│   │           ├── habitModal.hbs
│   │           ├── head.hbs
│   │           ├── nav.hbs
│   │           ├── title.hbs
│   │           └── dashboard/
│   │               ├── header.hbs
│   │               ├── cards/
│   │               │   ├── active.hbs
│   │               │   ├── completion.hbs
│   │               │   ├── friends.hbs
│   │               │   └── streak.hbs
│   │               ├── modals/
│   │               │   └── habitDetail.hbs
│   │               ├── sidebar/
│   │               │   ├── calendar.hbs
│   │               │   ├── quickAdd.hbs
│   │               │   ├── reminders.hbs
│   │               │   └── week.hbs
│   │               └── today/
│   │                   ├── chart.hbs
│   │                   ├── header.hbs
│   │                   └── list.hbs
│   └── test/
│       ├── server.spec.js
│       ├── test-email.js
│       ├── test-reminder.js
│       └── test-sms.js
├── TeamMeetingLogs/
│   ├── Meeting1.md
│   ├── Meeting2.md
│   ├── Meeting3.md
│   ├── Meeting4.md
│   └── Meeting5.md
├── Use Case Diagram/
│   └── case_diagram.JPG
└── Wireframes/
    └── README.md
```

## Audience:
Ideal User Characteristics: Goal Oriented, Busy, Self-Improvement Mindset, Data-Driven Thinker, Detailed Oriented
- People with trouble forming or stopping habits, who require detailed reminders and information to be able to change.

Specific problem to solve: 

Usability & Accessibility: Accessible UI, hover and click features, simplicity is key (but with all the needed information).


## Git repo link: 
https://github.com/LyricClough/habit-at 



## Development Methodology:

### Backend
- Node.js & Express - Web application framework
- PostgreSQL - Database
- node-cron - Task scheduler for reminders
- Twilio - SMS notifications
- Nodemailer - Email notifications
- Mailgun - Email notifications
- NodeCron - Scheduling Notifications
- bcrypt - Password hashing
- Mocha - Testing Framework
- Chai - Assertion Library
- dotenv - Environment configuration

### Frontend
- Handlebars - Templating engine
- TailwindCSS - Utility-first CSS framework
- Shadcn/ui - UI component library
- Aceternity UI - Animation components
- Chart.js - Data visualization
- TailwindCSS Animate - Animation utilities
- TailwindCSS Typography - Typography utilities

### Infrastrucutre
- Docker- Containerization
- Render - Deployemnt

## Deployment Link
https://habit-at.onrender.com/login
- Username: testuser
- Password: password123

## Agile Board using Github Projects:
https://github.com/users/LyricClough/projects/2 


## Communication plan
Text Message Group Chat

## Meeting plans
Meeting with TA: 5:00 PM Tuesdays (Zoom)
Team Meeting: 5:15 - 6:00 PM Tuesdays (Zoom)

