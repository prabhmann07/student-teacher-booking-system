// Import all the functions we need from Firebase
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js'; // Import our services

// --- Simple Logging Function ---
function logActivity(level, message, context = {}) {
    console[level](`[${new Date().toISOString()}] ${message}`, context);
}

// --- Get DOM Elements ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutButton = document.getElementById('logout-button');

// --- Registration Logic (WITH LOADING STATE) ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('error-message');
        
        // Get the button by its new ID
        const registerButton = document.getElementById('register-btn');

        try {
            // Disable button and show loading text
            registerButton.disabled = true;
            registerButton.textContent = 'Registering...';

            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            logActivity('info', 'New user registered in Auth', { email: user.email });

            // 2. Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: "student",
                isApproved: false 
            });
            logActivity('info', 'User document created in Firestore', { uid: user.uid });
            
            // 3. Redirect to login page
            window.location.href = 'index.html?message=Registration successful. Please wait for admin approval.';

        } catch (error) {
            logActivity('error', 'Registration failed', { error: error.message });
            errorEl.textContent = error.message;

            // Re-enable button on failure
            registerButton.disabled = false;
            registerButton.textContent = 'Register';
        }
    });
}

// --- Login Logic (WITH LOADING STATE) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('error-message');
        
        // Get the button by its new ID
        const loginButton = document.getElementById('login-btn');

        try {
            // Disable button and show loading text
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';

            // 1. Sign in the user
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            logActivity('info', 'User login attempt', { email: user.email });

            // 2. Get the user's document from Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                throw new Error("User data not found in database.");
            }

            const userData = userDoc.data();

            // 3. Check for student approval
            if (userData.role === 'student' && !userData.isApproved) {
                logActivity('warn', 'Unapproved student login attempt', { email: user.email });
                await signOut(auth); // Log them out
                errorEl.textContent = "Your account is not yet approved by an admin.";
                
                // Re-enable button on this specific failure
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
                return; 
            }

            // 4. Redirect based on role
            logActivity('info', 'Login successful, redirecting', { role: userData.role });
            if (userData.role === 'admin') {
                window.location.href = 'admin/dashboard.html';
            } else if (userData.role === 'teacher') {
                window.location.href = 'teacher/dashboard.html';
            } else if (userData.role === 'student') {
                window.location.href = 'student/dashboard.html';
            }

        } catch (error) {
            logActivity('error', 'Login failed', { error: error.message });
            errorEl.textContent = "Invalid email or password.";

            // Re-enable button on failure
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    });

    // Display success message (e.g., after registration)
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        const successEl = document.createElement('p');
        successEl.textContent = message;
        successEl.className = 'text-success';
        loginForm.prepend(successEl);
    }
}

// --- Logout Logic ---
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            logActivity('info', 'User logged out');
            if (window.location.pathname.includes('/admin/') || 
                window.location.pathname.includes('/teacher/') || 
                window.location.pathname.includes('/student/')) {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            logActivity('error', 'Logout failed', { error: error.message });
        }
    });
}

// --- AUTH GUARD ---
export async function protectPage(allowedRoles = []) {
    onAuthStateChanged(auth, async (user) => {
        const path = window.location.pathname;
        const isProtectedPage = path.includes('/admin/') || path.includes('/teacher/') || path.includes('/student/');
        
        let loginUrl = 'index.html';
        if (isProtectedPage) {
            loginUrl = '../index.html';
        }

        if (user) {
            // User is logged in. Now, check their role.
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                if (allowedRoles.includes(userData.role)) {
                    // User is logged in and has the correct role. Stay on the page.
                    logActivity('info', `User authorized for page`, { email: user.email, role: userData.role });
                    document.body.dataset.user = JSON.stringify(userData);
                    document.body.dataset.uid = user.uid;
                    document.body.dispatchEvent(new CustomEvent('authReady', { detail: { uid: user.uid, user: userData } }));
                } else {
                    // User has the wrong role. Redirect them to login.
                    logActivity('warn', `Role mismatch. Redirecting.`, { email: user.email, role: userData.role });
                    window.location.href = loginUrl;
                }
            } else {
                // User is in Auth, but not in Firestore.
                logActivity('error', `User doc not found. Logging out.`, { email: user.email });
                await signOut(auth);
                window.location.href = loginUrl;
            }
        } else {
            // No user is logged in. Redirect to login.
            if (isProtectedPage) {
                logActivity('info', `No user logged in. Redirecting to login.`);
                window.location.href = loginUrl;
            }
            // If we are on index.html or register.html, do nothing.
        }
    });
}