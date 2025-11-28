# Student-Teacher Booking Appointment System

This is a web application built for an internship project. It allows students to book appointments with teachers, provides a panel for teachers to manage their schedules, and includes an admin dashboard for system management.

---

## Live Demo

**[Live Demo](https://student-teacher-booking-2eb05.web.app)**

---

## Project Details

* **Domain:** Web Development
* **Technologies Used:** HTML, CSS, JavaScript (ES6 Modules), Firebase

---

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

---

## Core Technical Concepts

* **Database:** Cloud Firestore (NoSQL) is used to store all user and appointment data.
* **Authentication:** Firebase Authentication handles secure email/password login and user management.
* **Routing:** The project is a Multiple Page Application (MPA). Page access is protected by a JavaScript-based "Auth Guard" that checks user roles from Firestore.
* **Real-time Data:** `onSnapshot` listeners from Firebase are used to show real-time updates for appointment lists (for both students and teachers) and teacher lists (for the admin).

---

## Basic Workflow and Execution

Follow these steps to run the project locally.

### 1. Clone the Repository
```bash
git clone [https://github.com/prabhmann07/student-teacher-booking-system.git](https://github.com/prabhmann07/student-teacher-booking-system.git)
cd student-teacher-booking-system
```

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

---

##  Test Credentials 

To test the Admin features, please use:

- **Admin Email:** prabhmannsaluja2305@gmail.com
- **Admin Password:** 123456

---

## Project Evaluation Notes

* **Admin Access:** For security reasons, there is no public "Sign Up as Admin" page. To evaluate the Admin Module, please see the Test Credentials section to login as Admin and evaluate the Admin page and test its features.
* **Code Structure:** Logic is separated by role for better maintainability:
    * `js/auth.js`: Handles core authentication and the "Auth Guard" (page protection).
    * `js/admin.js`, `js/teacher.js`, `js/student.js`: Contain logic specific to each user role.
* **Security:**
    * **Auth Guard:** A client-side check (`protectPage`) runs on every dashboard to redirect unauthorized users (e.g., a Student trying to access the Admin panel).
    * **Config Protection:** The `firebase-config.js` file is included in `.gitignore` to prevent API key leakage. You must create this file locally to run the app.
* **Real-time Data:** The dashboards use Firestore's `onSnapshot` listener. This means appointments and schedule changes update instantly across screens without requiring a page refresh.
* **Logging:** A custom `logActivity` function is implemented to log critical actions (Login, Registration, Booking, Approval) to the browser's Developer Console for tracking purposes.
