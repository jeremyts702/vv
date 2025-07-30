// public/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const emailInputGroup = document.getElementById('emailInput');
    const phoneInputGroup = document.getElementById('phoneInput');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const useEmailBtn = document.getElementById('useEmail');
    const usePhoneBtn = document.getElementById('usePhone');
    const toggleText = document.getElementById('toggleText');
    const authMessage = document.getElementById('authMessage'); // Get the auth message element

    // Elements for Terms and Conditions
    const termsAgreementGroup = document.getElementById('termsAgreementGroup');
    const termsCheckbox = document.getElementById('terms-checkbox');

    let isLoginMode = true; // Start in login mode
    let useEmail = true; // Default to email login
    const currentPage = window.location.pathname.split('/').pop(); // Gets the current page file name

    // Pages that require authentication
    const authenticatedPages = ['trade.html', 'wallet.html', 'profile.html', ]; // Added index.html and admin.html

   

    // Function to show/hide message
    function showMessage(message, type) {
        authMessage.textContent = message;
        authMessage.className = `auth-message show ${type}`; // Add show and type classes
        // Hide message after 3 seconds
        setTimeout(() => {
            authMessage.classList.remove('show');
        }, 3000);
    }

    // Check if the current page is one of the authenticated pages
    // This logic should run immediately on authenticated pages
    if (authenticatedPages.includes(currentPage) && currentPage !== 'login.html') { // Exclude login.html from this check
        const isLoggedIn = localStorage.getItem('isLoggedIn'); // Check localStorage for login status
        const token = localStorage.getItem('token'); // Also check for a token

        if (isLoggedIn !== 'true' || !token) { // User is not logged in or no token, redirect to login page
            window.location.href = 'login.html';
            return; // Stop further execution of this script on authenticated pages if not logged in
        }
    }


    // Function to update UI based on input type (Email/Phone)
    function updateInputMode() {
        if (useEmail) {
            emailInputGroup.classList.remove('hidden');
            phoneInputGroup.classList.add('hidden');
            emailInput.setAttribute('required', 'required');
            phoneInput.removeAttribute('required');
        } else {
            emailInputGroup.classList.add('hidden');
            phoneInputGroup.classList.remove('hidden');
            phoneInput.setAttribute('required', 'required');
            emailInput.removeAttribute('required');
        }
    }

    // Function to update UI based on mode (Login/Signup)
    function updateAuthModeUI() {
        if (isLoginMode) {
            document.querySelector('.auth-container h2').textContent = 'Login'; // Update title
            toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="authToggleLink">Sign Up</a>';
            authForm.querySelector('button[type="submit"]').textContent = 'Login';
            
            // Hide terms for login mode
            termsAgreementGroup.classList.add('hidden'); 
            termsCheckbox.removeAttribute('required'); 
            document.getElementById('forgotPasswordGroup').classList.remove('hidden'); // Show forgot password link
        } else {
            document.querySelector('.auth-container h2').textContent = 'Signup'; // Update title
            toggleText.innerHTML = 'Already have an account? <a href="#" id="authToggleLink">Login</a>';
            authForm.querySelector('button[type="submit"]').textContent = 'Sign Up';

            // Show terms for signup mode
            termsAgreementGroup.classList.remove('hidden'); 
            termsCheckbox.setAttribute('required', 'required'); 
            document.getElementById('forgotPasswordGroup').classList.add('hidden'); // Hide forgot password link
        }
        // Re-attach event listener for the toggle link as its content is re-rendered
        document.getElementById('authToggleLink').onclick = toggleAuth;
    }

    // Toggle between Login and Signup modes
    function toggleAuth(event) {
        if (event) event.preventDefault(); // Prevent default link behavior
        isLoginMode = !isLoginMode;
        updateAuthModeUI();
        // Clear password field when toggling modes for security/UX
        passwordInput.value = '';
        showMessage('', ''); // Clear any existing messages
    }

    // Switch between Email and Phone input
    useEmailBtn.addEventListener('click', () => {
        useEmail = true;
        updateInputMode();
        useEmailBtn.classList.add('active');
        usePhoneBtn.classList.remove('active');
    });

    usePhoneBtn.addEventListener('click', () => {
        useEmail = false;
        updateInputMode();
        usePhoneBtn.classList.add('active');
        useEmailBtn.classList.remove('active');
    });

    // Handle form submission
    authForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const password = passwordInput.value;
        let authData = { password };
        let endpoint = '';

        if (useEmail) {
            authData.email = emailInput.value;
        } else {
            authData.phoneNumber = iti.getNumber(); // Use iti.getNumber() for international phone number
        }

        const BASE_URL = 'https://vv-ncd0.onrender.com'; // Define your backend base URL

        if (isLoginMode) {
            endpoint = `${BASE_URL}/api/auth/login`; 
            showMessage('Logging in...', 'info');
        } else {
            endpoint = `${BASE_URL}/api/auth/register`; 

            // Client-side validation for terms agreement during signup
            if (!termsCheckbox.checked) {
                showMessage('You must agree to the Terms & Conditions to sign up.', 'error');
                return; // Stop form submission
            }
            showMessage('Signing up...', 'info');
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(authData),
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message, 'success');
                localStorage.setItem('token', data.token); 
                localStorage.setItem('userId', data.user.id); 
                localStorage.setItem('userEmail', data.user.email); 
                localStorage.setItem('userBalance', data.user.balance); 
                localStorage.setItem('userRole', data.user.role); 
                localStorage.setItem('isLoggedIn', 'true'); // Set isLoggedIn to true upon successful auth

                const userRole = data.user.role; 

                setTimeout(() => { // Add a slight delay for the message to be seen
                    if (userRole === 'admin') {
                        window.location.href = 'admin.html'; 
                    } else {
                        window.location.href = 'index.html'; 
                    }
                }, 1000); // 1 second delay
            } else {
                showMessage(`Error: ${data.message || 'Something went wrong.'}`, 'error'); 
                console.error('Auth Error:', data); 
            }
        } catch (error) {
            console.error('Network or server error:', error); 
            showMessage('A network error occurred. Please try again.', 'error'); 
        }
    });

    // Event listener for forgot password link
   
    // Event listener for back to login link
    const backToLoginLink = document.getElementById('backToLoginLink');
    if (backToLoginLink) { // Ensure element exists
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Restore form state
            document.querySelector('.auth-container h2').classList.remove('hidden');
            document.querySelector('.form-switch').classList.remove('hidden');
            authForm.classList.remove('hidden');
            toggleText.classList.remove('hidden');
            document.getElementById('forgotPasswordGroup').classList.remove('hidden');
            backToLoginLink.classList.add('hidden'); // Hide back button
            showMessage('', ''); // Clear message
            updateAuthModeUI(); // Reset form to login or signup based on isLoginMode
        });
    }

    // Initial setup on page load
    useEmailBtn.classList.add('active'); // Default active button
    updateInputMode(); // Set initial input mode (Email)
    updateAuthModeUI(); // Set initial auth mode UI (Login)
});
