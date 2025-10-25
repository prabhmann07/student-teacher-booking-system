// js/admin.js (Complete file with validation)
import { protectPage, logActivity } from './auth.js'; 
import { db, auth as adminAuth, firebaseConfig } from './firebase-config.js'; 
import { collection, query, where, getDocs, doc, updateDoc, setDoc, onSnapshot, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Run Auth Guard ---
protectPage(['admin']);

// --- Approve Students Logic ---
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
            logActivity('error', 'Failed to load unapproved students', { error: error.message });
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
        logActivity('info', 'Student approved', { studentId: studentId, adminUid: adminAuth.currentUser?.uid });

        button.closest('li').remove();
        if (studentsList.children.length === 0) {
            studentsList.innerHTML = '<li class="list-group-item">No students are waiting for approval.</li>';
        }
    } catch (error) {
        logActivity('error', 'Failed to approve student', { error: error.message, studentId: studentId });
        console.error("Error approving student: ", error);
        button.textContent = 'Error';
        button.classList.remove('btn-success');
        button.classList.add('btn-danger');
    }
}


// --- Manage Teachers Logic ---
const addTeacherForm = document.getElementById('add-teacher-form');
const teachersList = document.getElementById('teachers-list');
const updateTeacherModalEl = document.getElementById('updateTeacherModal');
const updateTeacherForm = document.getElementById('update-teacher-form');
const updateTeacherModal = updateTeacherModalEl ? new bootstrap.Modal(updateTeacherModalEl) : null;


// --- Add Teacher function (WITH VALIDATION) ---
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
    errorEl.textContent = ''; // Clear previous errors
    errorEl.classList.remove('text-success', 'text-danger'); // Reset color

    // --- VALIDATION LOGIC ---
    if (!name.trim() || !email.trim() || !password.trim() || !department.trim() || !subject.trim()) {
        errorEl.textContent = 'All fields are required.';
        errorEl.classList.add('text-danger');
        return; // Stop submission
    }
    if (password.length < 6) {
         errorEl.textContent = 'Password must be at least 6 characters long.';
         errorEl.classList.add('text-danger');
         return; // Stop submission
    }
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorEl.textContent = 'Please enter a valid email address.';
        errorEl.classList.add('text-danger');
        return; // Stop submission
    }
    // --- END VALIDATION ---

    button.disabled = true;
    button.textContent = 'Adding...';

    try {
        const tempApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`); 
        const tempAuth = getAuth(tempApp);

        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const user = userCredential.user;
        logActivity('info', 'Teacher created in Auth', { teacherEmail: email, adminUid: adminAuth.currentUser?.uid });

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            role: "teacher",
            department: department,
            subject: subject
        });
        logActivity('info', 'Teacher document created in Firestore', { teacherUid: user.uid, adminUid: adminAuth.currentUser?.uid });

        addTeacherForm.reset();
        errorEl.textContent = 'Teacher added successfully!';
        errorEl.classList.add('text-success');

    } catch (error) {
        logActivity('error', 'Failed to add teacher', { error: error.message, adminUid: adminAuth.currentUser?.uid });
        console.error("Error adding teacher: ", error);
        errorEl.textContent = error.message; // Show Firebase error
        errorEl.classList.add('text-danger');
    } finally {
         // Re-enable button regardless of success or failure
        button.disabled = false;
        button.textContent = 'Add Teacher';
    }
}

// --- Load Teachers (unchanged) ---
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
            logActivity('error', 'Failed to load teachers list', { error: error.message });
            console.error("Error loading teachers: ", error);
            teachersList.innerHTML = '<li class="list-group-item text-danger">Error loading teachers.</li>';
        });
    }
}

// --- Delete Teacher (unchanged) ---
async function deleteTeacher(teacherId) {
    if (!confirm("Are you sure you want to delete this teacher?")) {
        return;
    }
    try {
        const teacherDocRef = doc(db, "users", teacherId);
        await deleteDoc(teacherDocRef);
        logActivity('warn', 'Teacher deleted from Firestore', { teacherId: teacherId, adminUid: adminAuth.currentUser?.uid });
    } catch (error) {
        logActivity('error', 'Failed to delete teacher', { error: error.message, teacherId: teacherId });
        console.error("Error deleting teacher: ", error);
        alert("Error deleting teacher. See console for details.");
    }
}

// --- Open Update Modal (unchanged) ---
async function openUpdateModal(teacherId) {
    try {
        const teacherDocRef = doc(db, "users", teacherId);
        const teacherDoc = await getDoc(teacherDocRef);

        if (!teacherDoc.exists()) {
            logActivity('error', 'Attempted to update non-existent teacher', { teacherId: teacherId });
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
        logActivity('error', 'Failed to fetch teacher details for update', { error: error.message, teacherId: teacherId });
        console.error("Error getting teacher details: ", error);
        alert("Error fetching teacher details. See console.");
    }
}

// --- Handle Update Form Submit (unchanged) ---
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
        logActivity('info', 'Teacher details updated', { teacherId: teacherId, adminUid: adminAuth.currentUser?.uid });

        button.disabled = false;
        button.textContent = 'Save Changes';
        updateTeacherModal.hide(); 

    } catch (error) {
        logActivity('error', 'Failed to update teacher', { error: error.message, teacherId: teacherId });
        console.error("Error updating teacher: ", error);
        errorEl.textContent = "Error updating teacher. See console.";
        button.disabled = false;
        button.textContent = 'Save Changes';
    }
}


// --- Run on Page Load ---
loadUnapprovedStudents(); 
loadTeachers(); 

if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', addTeacher);
}

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

if (updateTeacherForm) {
    updateTeacherForm.addEventListener('submit', handleUpdateFormSubmit);
}