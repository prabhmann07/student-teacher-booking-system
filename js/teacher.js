import { protectPage } from './auth.js';
import { db } from './firebase-config.js';
// --- NEW: Added collection, query, and where ---
import { doc, setDoc, onSnapshot, Timestamp, updateDoc, arrayUnion, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Run Auth Guard ---
protectPage(['teacher']);

// --- Get DOM Elements ---
const scheduleForm = document.getElementById('schedule-form');
const slotsList = document.getElementById('slots-list');
const scheduleMessage = document.getElementById('schedule-message');
// --- NEW: Get appointments list element ---
const appointmentsList = document.getElementById('appointments-list');

let currentTeacherId = null; // We'll get this from the auth state

// --- Schedule Logic (Unchanged) ---
async function addScheduleSlot(e) {
    e.preventDefault();
    if (!currentTeacherId) {
        scheduleMessage.textContent = 'Error: Not logged in correctly.';
        scheduleMessage.className = 'text-danger mt-2';
        return;
    }
    const slotInput = document.getElementById('slot-date');
    const slotDateString = slotInput.value;
    const button = document.getElementById('add-slot-btn');
    const jsDate = new Date(slotDateString);
    const firestoreTimestamp = Timestamp.fromDate(jsDate);
    button.disabled = true;
    button.textContent = 'Adding...';
    scheduleMessage.textContent = '';
    try {
        const scheduleDocRef = doc(db, "teacherSchedules", currentTeacherId);
        await updateDoc(scheduleDocRef, {
            availableSlots: arrayUnion(firestoreTimestamp)
        });
    } catch (error) {
        if (error.code === 'not-found') {
            await setDoc(doc(db, "teacherSchedules", currentTeacherId), {
                availableSlots: [firestoreTimestamp]
            });
        } else {
            console.error("Error adding slot: ", error);
            scheduleMessage.textContent = 'Error adding slot. See console.';
            scheduleMessage.className = 'text-danger mt-2';
        }
    }
    button.disabled = false;
    button.textContent = 'Add Slot';
    scheduleForm.reset();
    scheduleMessage.textContent = 'Slot added successfully!';
    scheduleMessage.className = 'text-success mt-2';
}

function loadSchedule(teacherId) {
    if (slotsList) {
        const scheduleDocRef = doc(db, "teacherSchedules", teacherId);
        onSnapshot(scheduleDocRef, (docSnap) => {
            slotsList.innerHTML = '';
            if (docSnap.exists() && docSnap.data().availableSlots && docSnap.data().availableSlots.length > 0) {
                const slots = docSnap.data().availableSlots;
                slots.sort((a, b) => a.seconds - b.seconds);
                slots.forEach(timestamp => {
                    const date = timestamp.toDate();
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.textContent = date.toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    });
                    slotsList.appendChild(li);
                });
            } else {
                slotsList.innerHTML = '<li class="list-group-item">You have no available slots.</li>';
            }
        }, (error) => {
            console.error("Error loading schedule: ", error);
            slotsList.innerHTML = '<li class="list-group-item text-danger">Error loading schedule.</li>';
        });
    }
}

// --- NEW: Appointments Logic ---

// Function to load and display appointments
function loadAppointments(teacherId) {
    if (appointmentsList) {
        appointmentsList.innerHTML = '<li class="list-group-item">Loading appointments...</li>';
        
        const apptsRef = collection(db, "appointments");
        // Query for appointments where teacherId matches
        const q = query(apptsRef, where("teacherId", "==", teacherId));

        onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.empty) {
                appointmentsList.innerHTML = '<li class="list-group-item">You have no appointments.</li>';
                return;
            }
            
            appointmentsList.innerHTML = ''; // Clear list
            querySnapshot.forEach((doc) => {
                const appt = doc.data();
                const apptId = doc.id;
                const apptDate = appt.dateTime.toDate();

                const li = document.createElement('li');
                li.className = 'list-group-item';
                
                let buttonsHtml = '';
                // Show buttons only if the status is "pending"
                if (appt.status === 'pending') {
                    buttonsHtml = `
                        <button class="btn btn-success btn-sm approve-appt-btn" data-id="${apptId}">Approve</button>
                        <button class="btn btn-danger btn-sm cancel-appt-btn" data-id="${apptId}">Cancel</button>
                    `;
                } else {
                    // Show the status if it's not pending
                    buttonsHtml = `<span class="badge bg-secondary">${appt.status}</span>`;
                }

                li.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${appt.studentName}</h5>
                        <small>${apptDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</small>
                    </div>
                    <p class="mb-1">${appt.purpose}</p>
                    <div class="mt-2">
                        ${buttonsHtml}
                    </div>
                `;
                appointmentsList.appendChild(li);
            });
        }, (error) => {
            console.error("Error loading appointments: ", error);
            appointmentsList.innerHTML = '<li class="list-group-item text-danger">Error loading appointments.</li>';
        });
    }
}

// Function to update appointment status
async function updateAppointmentStatus(apptId, newStatus) {
    try {
        const apptDocRef = doc(db, "appointments", apptId);
        await updateDoc(apptDocRef, {
            status: newStatus
        });
    } catch (error) {
        console.error("Error updating appointment: ", error);
        alert("Error updating appointment. See console.");
    }
}


// --- Run on Page Load ---

document.body.addEventListener('authReady', (e) => {
    currentTeacherId = e.detail.uid;
    
    // Load both schedule and appointments
    loadSchedule(currentTeacherId);
    loadAppointments(currentTeacherId); // --- NEW ---

    // Add listener to the schedule form
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', addScheduleSlot);
    }
});

// --- NEW: Event Delegation for Approve/Cancel buttons ---
if (appointmentsList) {
    appointmentsList.addEventListener('click', (e) => {
        const target = e.target;
        const apptId = target.dataset.id;

        if (target.classList.contains('approve-appt-btn')) {
            target.disabled = true;
            target.textContent = 'Approving...';
            updateAppointmentStatus(apptId, 'approved');
        }
        
        if (target.classList.contains('cancel-appt-btn')) {
            target.disabled = true;
            target.textContent = 'Cancelling...';
            updateAppointmentStatus(apptId, 'cancelled');
        }
    });
}
