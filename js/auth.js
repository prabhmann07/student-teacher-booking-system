// js/auth.js (Complete file with validation)
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
import { auth, db } from './firebase-config.js';

// --- Simple Logging Function ---
export function logActivity(level, message, context = {}) { // Make sure to export it
    console[level](`[${new Date().toISOString()}] ${message}`, context);
}

// --- Get DOM Elements ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutButton = document.getElementById('logout-button');

// --- Registration Logic (WITH VALIDATION) ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('error-message');
        const registerButton = document.getElementById('register-btn');
        errorEl.textContent = ''; // Clear previous errors

        // --- VALIDATION LOGIC ---
        if (!name.trim() || !email.trim() || !password.trim()) {
            errorEl.textContent = 'All fields are required.';
            return; // Stop submission
        }
        if (password.length < 6) {
             errorEl.textContent = 'Password must be at least 6 characters long.';
             return; // Stop submission
        }
        // Simple email format check using a Regular Expression
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorEl.textContent = 'Please enter a valid email address.';
            return; // Stop submission
        }
        // --- END VALIDATION ---

        try {
            registerButton.disabled = true;
            registerButton.textContent = 'Registering...';

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            logActivity('info', 'New user registered in Auth', { email: user.email });

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: "student",
                isApproved: false 
            });
            logActivity('info', 'User document created in Firestore', { uid: user.uid });

            window.location.href = 'index.html?message=Registration successful. Please wait for admin approval.';

        } catch (error) {
            logActivity('error', 'Registration failed', { error: error.message });
            errorEl.textContent = error.message;
            registerButton.disabled = false;
            registerButton.textContent = 'Register';
        }
    });
}

// --- Login Logic (WITH VALIDATION) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('error-message');
        const loginButton = document.getElementById('login-btn');
        errorEl.textContent = ''; // Clear previous errors

        // --- VALIDATION LOGIC ---
        if (!email.trim() || !password.trim()) {
            errorEl.textContent = 'Email and password are required.';
            return; // Stop submission
        }
         if (password.length < 6) {
             errorEl.textContent = 'Password must be at least 6 characters long.';
             return; // Stop submission
        }
        // Simple email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorEl.textContent = 'Please enter a valid email address.';
            return; // Stop submission
        }
        // --- END VALIDATION ---

        try {
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            logActivity('info', 'User login attempt', { email: user.email });

            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                throw new Error("User data not found in database.");
            }

            const userData = userDoc.data();

            if (userData.role === 'student' && !userData.isApproved) {
                logActivity('warn', 'Unapproved student login attempt', { email: user.email });
                await signOut(auth); 
                errorEl.textContent = "Your account is not yet approved by an admin.";
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
                return; 
            }

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
            const userEmail = auth.currentUser?.email; // Get email before logging out
            await signOut(auth);
            logActivity('info', 'User logged out', { email: userEmail });
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
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                if (allowedRoles.includes(userData.role)) {
                    logActivity('info', `User authorized for page`, { email: user.email, role: userData.role, path: path });
                    document.body.dataset.user = JSON.stringify(userData);
                    document.body.dataset.uid = user.uid;
                    // Dispatch event for other scripts
                    document.body.dispatchEvent(new CustomEvent('authReady', { detail: { uid: user.uid, user: userData } }));
                } else {
                    logActivity('warn', `Role mismatch. Redirecting.`, { email: user.email, role: userData.role, attemptedPath: path });
                    window.location.href = loginUrl;
                }
            } else {
                logActivity('error', `User doc not found. Logging out.`, { email: user.email });
                await signOut(auth);
                window.location.href = loginUrl;
            }
        } else {
            if (isProtectedPage) {
                logActivity('info', `No user logged in. Redirecting to login. Attempted path: ${path}`);
                window.location.href = loginUrl;
            }
        }
    });
}