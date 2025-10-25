import { protectPage } from './auth.js';
import { db } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Run Auth Guard ---
protectPage(['student']);

// --- Get DOM Elements ---
const teachersList = document.getElementById('teachers-list');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

const bookingForm = document.getElementById('booking-form');
const teacherNameDisplay = document.getElementById('teacher-name-display');
const slotsListDiv = document.getElementById('available-slots-list');
const bookingMessage = document.getElementById('booking-message');

// --- NEW: Get "My Appointments" list ---
const myAppointmentsList = document.getElementById('my-appointments-list');

let currentStudentId = null;
let currentStudentName = null;
let allTeachers = []; 
let bookingTeacherId = null; 
let bookingTeacherName = null;

// --- Search Teacher Logic (Unchanged) ---
function loadTeachers() {
    if (teachersList) {
        teachersList.innerHTML = '<li class="list-group-item">Loading teachers...</li>';
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "teacher"));
        onSnapshot(q, (querySnapshot) => {
            allTeachers = []; 
            if (querySnapshot.empty) {
                teachersList.innerHTML = '<li class="list-group-item">No teachers found.</li>';
                return;
            }
            teachersList.innerHTML = ''; 
            querySnapshot.forEach((doc) => {
                const teacher = doc.data();
                teacher.id = doc.id; 
                allTeachers.push(teacher); 
                const li = createTeacherListItem(teacher);
                teachersList.appendChild(li);
            });
        }, (error) => {
            console.error("Error loading teachers: ", error);
            teachersList.innerHTML = '<li class="list-group-item text-danger">Error loading teachers.</li>';
        });
    }
}

function createTeacherListItem(teacher) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
        <div>
            <h5 class="mb-1">${teacher.name}</h5>
            <small>${teacher.department} - ${teacher.subject}</small>
        </div>
        <a href="book-appointment.html?teacherId=${teacher.id}" class="btn btn-primary btn-sm">Book</a>
    `;
    return li;
}

function filterTeachers(e) {
    e.preventDefault();
    const searchTerm = searchInput.value.toLowerCase();
    const filteredTeachers = allTeachers.filter(teacher => {
        return (
            teacher.name.toLowerCase().includes(searchTerm) ||
            teacher.department.toLowerCase().includes(searchTerm) ||
            teacher.subject.toLowerCase().includes(searchTerm)
        );
    });
    teachersList.innerHTML = '';
    if (filteredTeachers.length === 0) {
        teachersList.innerHTML = '<li class="list-group-item">No teachers match your search.</li>';
    } else {
        filteredTeachers.forEach(teacher => {
            const li = createTeacherListItem(teacher);
            teachersList.appendChild(li);
        });
    }
}

// --- Booking Page Logic (Unchanged) ---
async function loadBookingPage() {
    if (!bookingForm) return; 

    const urlParams = new URLSearchParams(window.location.search);
    bookingTeacherId = urlParams.get('teacherId');
    if (!bookingTeacherId) {
        teacherNameDisplay.textContent = 'Error: No teacher selected.';
        return;
    }

    try {
        const teacherDocRef = doc(db, "users", bookingTeacherId);
        const teacherDoc = await getDoc(teacherDocRef);
        if (!teacherDoc.exists()) {
            teacherNameDisplay.textContent = 'Error: Teacher not found.';
            return;
        }
        bookingTeacherName = teacherDoc.data().name;
        teacherNameDisplay.textContent = bookingTeacherName;

        const scheduleDocRef = doc(db, "teacherSchedules", bookingTeacherId);
        const scheduleDoc = await getDoc(scheduleDocRef);

        if (!scheduleDoc.exists() || scheduleDoc.data().availableSlots.length === 0) {
            slotsListDiv.innerHTML = '<p class="text-danger">This teacher has no available slots.</p>';
            return;
        }

        slotsListDiv.innerHTML = ''; 
        const slots = scheduleDoc.data().availableSlots;
        slots.sort((a, b) => a.seconds - b.seconds); 

        slots.forEach((timestamp, index) => {
            const date = timestamp.toDate();
            const dateString = date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
            
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="radio" name="selectedSlot" id="slot-${index}" value="${timestamp.toMillis()}">
                <label class="form-check-label" for="slot-${index}">
                    ${dateString}
                </label>
            `;
            slotsListDiv.appendChild(div);
        });

    } catch (error) {
        console.error("Error loading booking page: ", error);
        slotsListDiv.innerHTML = '<p class="text-danger">Error loading schedule.</p>';
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const purpose = document.getElementById('booking-purpose').value;
    const selectedSlotRadio = document.querySelector('input[name="selectedSlot"]:checked');
    const button = document.getElementById('book-appt-btn');

    if (!selectedSlotRadio) {
        bookingMessage.textContent = 'Please select a time slot.';
        bookingMessage.className = 'text-danger mt-2';
        return;
    }

    button.disabled = true;
    button.textContent = 'Booking...';
    bookingMessage.textContent = '';

    try {
        const selectedMillis = Number(selectedSlotRadio.value);
        const selectedTimestamp = Timestamp.fromMillis(selectedMillis);

        await addDoc(collection(db, "appointments"), {
            studentId: currentStudentId,
            studentName: currentStudentName,
            teacherId: bookingTeacherId,
            teacherName: bookingTeacherName,
            dateTime: selectedTimestamp,
            purpose: purpose,
            status: "pending" 
        });

        bookingMessage.textContent = 'Appointment booked successfully! Redirecting...';
        bookingMessage.className = 'text-success mt-2';
        
        setTimeout(() => {
            window.location.href = 'my-appointments.html';
        }, 2000);

    } catch (error) {
        console.error("Error booking appointment: ", error);
        bookingMessage.textContent = 'Error booking appointment. Please try again.';
        bookingMessage.className = 'text-danger mt-2';
        button.disabled = false;
        button.textContent = 'Book Appointment';
    }
}

// --- NEW: "My Appointments" Page Logic ---

// Function to load and display the student's bookings
function loadMyBookings(studentId) {
    if (!myAppointmentsList) return; // Only run if we're on the right page

    myAppointmentsList.innerHTML = '<li class="list-group-item">Loading appointments...</li>';

    const apptsRef = collection(db, "appointments");
    // Query for appointments where studentId matches
    const q = query(apptsRef, where("studentId", "==", studentId));

    onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            myAppointmentsList.innerHTML = '<li class="list-group-item">You have not booked any appointments.</li>';
            return;
        }
        
        myAppointmentsList.innerHTML = ''; // Clear list
        querySnapshot.forEach((doc) => {
            const appt = doc.data();
            const apptDate = appt.dateTime.toDate();

            // Choose a color for the status badge
            let statusColor = 'bg-secondary'; // default
            if (appt.status === 'approved') {
                statusColor = 'bg-success';
            } else if (appt.status === 'cancelled') {
                statusColor = 'bg-danger';
            } else if (appt.status === 'pending') {
                statusColor = 'bg-warning text-dark';
            }
            
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <h5 class="mb-1">With: ${appt.teacherName}</h5>
                    <span class="badge ${statusColor}">${appt.status}</span>
                </div>
                <p class="mb-1">${appt.purpose}</p>
                <small>${apptDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</small>
            `;
            myAppointmentsList.appendChild(li);
        });
    }, (error) => {
        console.error("Error loading my appointments: ", error);
        myAppointmentsList.innerHTML = '<li class="list-group-item text-danger">Error loading appointments.</li>';
    });
}


// --- Run on Page Load ---
document.body.addEventListener('authReady', (e) => {
    currentStudentId = e.detail.uid;
    currentStudentName = e.detail.user.name;
    
    // Load functions for all student pages
    loadTeachers();
    loadBookingPage();
    loadMyBookings(currentStudentId); // --- NEW ---
});

// Add listener to the search form
if (searchForm) {
    searchForm.addEventListener('submit', filterTeachers);
    searchInput.addEventListener('keyup', filterTeachers); 
}

// Add listener to the booking form
if (bookingForm) {
    bookingForm.addEventListener('submit', handleBookingSubmit);
}