// Import LogActivity from auth.js 
import { protectPage, logActivity } from './auth.js'; 
import { db } from './firebase-config.js';
import { doc, setDoc, onSnapshot, Timestamp, updateDoc, arrayUnion, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Run Auth Guard 
protectPage(['teacher']);

// DOM Elements 
const scheduleForm = document.getElementById('schedule-form');
const slotsList = document.getElementById('slots-list');
const scheduleMessage = document.getElementById('schedule-message');
const appointmentsList = document.getElementById('appointments-list');

let currentTeacherId = null; 

// Schedule Logic 
async function addScheduleSlot(e) {
    e.preventDefault();
    if (!currentTeacherId) {
        logActivity('error', 'Add slot attempt failed: No teacher ID found');
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
        logActivity('info', 'Availability slot added', { teacherId: currentTeacherId, slot: firestoreTimestamp });
    } catch (error) {
        if (error.code === 'not-found') {
            try {
                await setDoc(doc(db, "teacherSchedules", currentTeacherId), {
                    availableSlots: [firestoreTimestamp]
                });
                logActivity('info', 'Availability slot added (new schedule created)', { teacherId: currentTeacherId, slot: firestoreTimestamp });
            } catch (setErr) {
                logActivity('error', 'Failed to set initial schedule slot', { error: setErr.message, teacherId: currentTeacherId });
                console.error("Error setting initial slot: ", setErr);
                scheduleMessage.textContent = 'Error adding slot. See console.';
                scheduleMessage.className = 'text-danger mt-2';
            }
        } else {
            logActivity('error', 'Failed to add schedule slot', { error: error.message, teacherId: currentTeacherId });
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
             // Logging 
            logActivity('error', 'Failed to load teacher schedule', { error: error.message, teacherId: teacherId });
            console.error("Error loading schedule: ", error);
            slotsList.innerHTML = '<li class="list-group-item text-danger">Error loading schedule.</li>';
        });
    }
}

// Appointments Logic 
function loadAppointments(teacherId) {
    if (appointmentsList) {
        appointmentsList.innerHTML = '<li class="list-group-item">Loading appointments...</li>';
        const apptsRef = collection(db, "appointments");
        const q = query(apptsRef, where("teacherId", "==", teacherId));

        onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.empty) {
                appointmentsList.innerHTML = '<li class="list-group-item">You have no appointments.</li>';
                return;
            }
            
            appointmentsList.innerHTML = ''; 
            querySnapshot.forEach((doc) => {
                const appt = doc.data();
                const apptId = doc.id;
                const apptDate = appt.dateTime.toDate();

                const li = document.createElement('li');
                li.className = 'list-group-item';
                
                let buttonsHtml = '';
                if (appt.status === 'pending') {
                    buttonsHtml = `
                        <button class="btn btn-success btn-sm approve-appt-btn" data-id="${apptId}">Approve</button>
                        <button class="btn btn-danger btn-sm cancel-appt-btn" data-id="${apptId}">Cancel</button>
                    `;
                } else {
                    buttonsHtml = `<span class="badge bg-${appt.status === 'approved' ? 'success' : 'danger'}">${appt.status}</span>`;
                }

                li.innerHTML = `
                    <div class="d-flex w-100 justify-content-between align-items-center">
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
             // Logging 
            logActivity('error', 'Failed to load teacher appointments', { error: error.message, teacherId: teacherId });
            console.error("Error loading appointments: ", error);
            appointmentsList.innerHTML = '<li class="list-group-item text-danger">Error loading appointments.</li>';
        });
    }
}

async function updateAppointmentStatus(apptId, newStatus) {
    try {
        const apptDocRef = doc(db, "appointments", apptId);
        await updateDoc(apptDocRef, {
            status: newStatus
        });
         // Logging 
        logActivity('info', 'Appointment status updated', { teacherId: currentTeacherId, appointmentId: apptId, newStatus: newStatus });
    } catch (error) {
         // Logging 
        logActivity('error', 'Failed to update appointment status', { error: error.message, appointmentId: apptId, newStatus: newStatus });
        console.error("Error updating appointment: ", error);
        alert("Error updating appointment. See console.");
    }
}


// Run on Page Load 
document.body.addEventListener('authReady', (e) => {
    currentTeacherId = e.detail.uid;
    loadSchedule(currentTeacherId);
    loadAppointments(currentTeacherId); 

    if (scheduleForm) {
        scheduleForm.addEventListener('submit', addScheduleSlot);
    }
});

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
