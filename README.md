# Student-Teacher Booking Appointment System

This is a web application built for an internship project. It allows students to book appointments with teachers, provides a panel for teachers to manage their schedules, and includes an admin dashboard for system management.

## Project Details

* **Domain:** Education
* **Project Difficulties level:** Easy
* **Technologies Used:** HTML, CSS, JavaScript (ES6 Modules), Firebase

## Features

This project is a Multiple Page Application (MPA) built with vanilla JavaScript and Firebase.

### 1. Admin Module
* Secure login for admins.
* **Approve Students:** View a list of new students and approve their registrations.
* **Manage Teachers:** Add new teachers (creating their login and profile) and view, update, or delete existing teachers.

### 2. Teacher Module
* Secure login for teachers.
* **Set Availability:** Teachers can add available time slots to their schedule.
* **Manage Appointments:** View a real-time list of all booked appointments.
* **Approve/Cancel:** Approve or cancel pending appointments.

### 3. Student Module
* Secure registration (with admin approval).
* Secure login for approved students.
* **Search Teachers:** Find teachers and filter them by name, department, or subject.
* **Book Appointment:** Select an available time slot from a teacher's schedule and send a booking request.
* **View Status:** View a real-time list of all their appointments and see their status (pending, approved, or cancelled).

## Core Technical Concepts

* **Database:** Cloud Firestore (NoSQL) is used to store all user and appointment data.
* **Authentication:** Firebase Authentication handles secure email/password login and user management.
* **Routing:** The project is a Multiple Page Application (MPA). Page access is protected by a JavaScript-based "Auth Guard" that checks user roles from Firestore.
* **Real-time Data:** `onSnapshot` listeners from Firebase are used to show real-time updates for appointment lists (for both students and teachers) and teacher lists (for the admin).

## Basic Workflow and Execution

Follow these steps to run the project locally.

### 1. Clone the Repository
```bash
git clone [https://github.com/prabhmann07/student-teacher-booking-system.git](https://github.com/prabhmann07/student-teacher-booking-system.git)
cd student-teacher-booking-system

### 2. Create Firebase Config
This project requires a Firebase project to run.

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  Enable **Authentication** (Email/Password).
3.  Enable **Firestore Database** (start in "test mode").
4.  In your project settings, find your "config" keys.
5.  Create a new file in the `/js/` folder named `firebase-config.js`.
6.  Paste your keys into the file using this format:

    ```javascript
    // js/firebase-config.js
    import { initializeApp } from "[https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js](https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js)";
    import { getAuth } from "[https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js](https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js)";
    import { getFirestore } from "[https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js](https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js)";

    // Your web app's Firebase configuration
    export const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    const app = initializeApp(firebaseConfig);
    export const auth = getAuth(app);
    export const db = getFirestore(app);
    ```

### 3. Run the Project
You can run this project using any simple web server. If you use VS Code, the "Live Server" extension is recommended.

1.  Right-click on the main `index.html` file.
2.  Select "Open with Live Server".
3.  The project will open in your browser.

**Note:** You must create an admin user manually in Firebase (see Phase 2 test plan) to access the admin panels.