import { protectPage } from './auth.js';
// --- NEW: Import the main 'auth' as 'adminAuth' and get the config ---
import { db, auth as adminAuth, firebaseConfig } from './firebase-config.js'; 
import { collection, query, where, getDocs, doc, updateDoc, setDoc, onSnapshot, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// --- NEW: Import initializeApp and getAuth ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Run Auth Guard ---
protectPage(['admin']);


// --- Approve Students Logic (unchanged) ---
const studentsList = document.getElementById('students-list');

async function loadUnapprovedStudents() {
    if (studentsList) {
        studentsList.innerHTML = '<li class="list-group-item">Loading students...</li>'; 
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("role", "==", "student"), where("isApproved", "==", false));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                studentsList.innerHTML = '<li class="list-group-item">No students are waiting for approval.</li>';
                return;
            }

            studentsList.innerHTML = ''; 
            querySnapshot.forEach((userDoc) => {
                const student = userDoc.data();
                const studentId = userDoc.id;
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <div>
                        <h5 class="mb-1">${student.name}</h5>
                        <small>${student.email}</small>
                    </div>
                    <button class="btn btn-success btn-sm approve-btn" data-id="${studentId}">Approve</button>
                `;
                studentsList.appendChild(li);
            });

            document.querySelectorAll('.approve-btn').forEach(button => {
                button.addEventListener('click', approveStudent);
            });
        } catch (error) {
            console.error("Error loading students: ", error);
            studentsList.innerHTML = '<li class="list-group-item text-danger">Error loading students.</li>';
        }
    }
}

async function approveStudent(e) {
    const studentId = e.target.dataset.id;
    const button = e.target;
    button.disabled = true; 
    button.textContent = 'Approving...';
    try {
        const studentDocRef = doc(db, "users", studentId);
        await updateDoc(studentDocRef, { isApproved: true });
        button.closest('li').remove();
        if (studentsList.children.length === 0) {
            studentsList.innerHTML = '<li class="list-group-item">No students are waiting for approval.</li>';
        }
    } catch (error) {
        console.error("Error approving student: ", error);
        button.textContent = 'Error';
        button.classList.remove('btn-success');
        button.classList.add('btn-danger');
    }
}


// --- Manage Teachers Logic (Phase 2) ---
const addTeacherForm = document.getElementById('add-teacher-form');
const teachersList = document.getElementById('teachers-list');
const updateTeacherModalEl = document.getElementById('updateTeacherModal');
const updateTeacherForm = document.getElementById('update-teacher-form');
// --- FIX: Use bootstrap.Modal ---
const updateTeacherModal = updateTeacherModalEl ? new bootstrap.Modal(updateTeacherModalEl) : null;

// --- UPDATED: Add Teacher function ---
async function addTeacher(e) {
    e.preventDefault();
    
    // Get form data
    const name = document.getElementById('teacher-name').value;
    const email = document.getElementById('teacher-email').value;
    const password = document.getElementById('teacher-password').value;
    const department = document.getElementById('teacher-dept').value;
    const subject = document.getElementById('teacher-subject').value;
    const errorEl = document.getElementById('add-teacher-error');
    const button = document.getElementById('add-teacher-btn');

    button.disabled = true;
    button.textContent = 'Adding...';
    errorEl.textContent = '';

    try {
        // --- NEW: Create a temporary app and auth service ---
        const tempApp = initializeApp(firebaseConfig, "secondary");
        const tempAuth = getAuth(tempApp);

        // --- NEW: Use the temporary auth service to create the user ---
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const user = userCredential.user;

        // Step 2: Create the teacher document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            role: "teacher",
            department: department,
            subject: subject
        });

        // Success! Clear the form and reset the button
        addTeacherForm.reset();
        button.disabled = false;
        button.textContent = 'Add Teacher';
        errorEl.textContent = 'Teacher added successfully!';
        errorEl.classList.remove('text-danger');
        errorEl.classList.add('text-success');

    } catch (error) {
        console.error("Error adding teacher: ", error);
        errorEl.textContent = error.message;
        errorEl.classList.add('text-danger');
        errorEl.classList.remove('text-success');
        button.disabled = false;
        button.textContent = 'Add Teacher';
    }
}

// Load Teachers (unchanged)
function loadTeachers() {
    if (teachersList) {
        teachersList.innerHTML = '<li class="list-group-item">Loading teachers...</li>';
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "teacher"));
        onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.empty) {
                teachersList.innerHTML = '<li class="list-group-item">No teachers found.</li>';
                return;
            }
            teachersList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const teacher = doc.data();
                const teacherId = doc.id;
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <div>
                        <h5 class="mb-1">${teacher.name}</h5>
                        <small>${teacher.email} - ${teacher.department} (${teacher.subject})</small>
                    </div>
                    <div>
                        <button class="btn btn-warning btn-sm me-2 update-btn" data-id="${teacherId}">Update</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${teacherId}">Delete</button>
                    </div>
                `;
                teachersList.appendChild(li);
            });
        }, (error) => {
            console.error("Error loading teachers: ", error);
            teachersList.innerHTML = '<li class="list-group-item text-danger">Error loading teachers.</li>';
        });
    }
}

// Delete Teacher (unchanged)
async function deleteTeacher(teacherId) {
    if (!confirm("Are you sure you want to delete this teacher?")) {
        return;
    }
    try {
        const teacherDocRef = doc(db, "users", teacherId);
        await deleteDoc(teacherDocRef);
    } catch (error) {
        console.error("Error deleting teacher: ", error);
        alert("Error deleting teacher. See console for details.");
    }
}

// openUpdateModal (unchanged)
async function openUpdateModal(teacherId) {
    try {
        const teacherDocRef = doc(db, "users", teacherId);
        const teacherDoc = await getDoc(teacherDocRef);

        if (!teacherDoc.exists()) {
            alert("Teacher not found!");
            return;
        }

        const teacher = teacherDoc.data();

        document.getElementById('update-teacher-id').value = teacherId;
        document.getElementById('update-teacher-name').value = teacher.name;
        document.getElementById('update-teacher-email').value = teacher.email;
        document.getElementById('update-teacher-dept').value = teacher.department;
        document.getElementById('update-teacher-subject').value = teacher.subject;
        
        updateTeacherModal.show();
    } catch (error) {
        console.error("Error getting teacher details: ", error);
        alert("Error fetching teacher details. See console.");
    }
}

// handleUpdateFormSubmit (unchanged)
async function handleUpdateFormSubmit(e) {
    e.preventDefault();
    
    const teacherId = document.getElementById('update-teacher-id').value;
    const name = document.getElementById('update-teacher-name').value;
    const department = document.getElementById('update-teacher-dept').value;
    const subject = document.getElementById('update-teacher-subject').value;
    const button = document.getElementById('update-teacher-btn');
    const errorEl = document.getElementById('update-teacher-error');
    
    button.disabled = true;
    button.textContent = 'Saving...';
    errorEl.textContent = '';

    try {
        const teacherDocRef = doc(db, "users", teacherId);
        
        await updateDoc(teacherDocRef, {
            name: name,
            department: department,
            subject: subject
        });

        button.disabled = false;
        button.textContent = 'Save Changes';
        updateTeacherModal.hide(); // Hide the modal

    } catch (error) {
        console.error("Error updating teacher: ", error);
        errorEl.textContent = "Error updating teacher. See console.";
        button.disabled = false;
        button.textContent = 'Save Changes';
    }
}


// --- Run on Page Load ---
loadUnapprovedStudents(); // For the approve-students page
loadTeachers(); // For the manage-teachers page

// Add listener to the add teacher form
if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', addTeacher);
}

// Event Delegation for Update/Delete buttons (unchanged)
if (teachersList) {
    teachersList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const teacherId = e.target.dataset.id;
            deleteTeacher(teacherId);
        }
        if (e.target.classList.contains('update-btn')) {
            const teacherId = e.target.dataset.id;
            openUpdateModal(teacherId); 
        }
    });
}

// Add listener to the update form (unchanged)
if (updateTeacherForm) {
    updateTeacherForm.addEventListener('submit', handleUpdateFormSubmit);
}