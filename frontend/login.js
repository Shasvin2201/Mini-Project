// Immediately redirect if already authenticated
if (window.authGuard) {
    authGuard.redirectIfAuthenticated();
}

const API_URL = "http://localhost:5000/api";

/* =========================================
   LOGIN FORM
========================================= */

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");


/* =========================================
   LOGIN
========================================= */

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {

        message.textContent = "Please enter email and password.";
        message.style.color = "#ef4444";

        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    message.textContent = "";


    try {

        const response = await fetch(
            `${API_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );


        const data = await response.json();


        /* =========================================
           LOGIN FAILED
        ========================================= */

        if (!response.ok) {

            message.textContent =
                data.message || "Login failed.";

            message.style.color = "#ef4444";

            loginBtn.disabled = false;
            loginBtn.textContent = "Login";

            return;
        }


        /* =========================================
           LOGIN SUCCESSFUL
        ========================================= */

        message.textContent = "Login successful!";

        message.style.color = "#22c55e";


        /*
            Store logged-in user information.

            This is important because later
            Faculty requests will use the
            actual logged-in faculty ID.
        */

        if (data.token) {
            localStorage.setItem("authToken", data.token);
        }

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(data.user)
        );


        /* =========================================
           ROLE BASED REDIRECT
        ========================================= */

        const targetPage = window.authGuard
            ? authGuard.getDashboardForRole(data.user.role)
            : (data.user.role === "admin" ? "admin.html" : data.user.role === "faculty" ? "faculty.html" : "management.html");

        if (targetPage !== "login.html") {
            setTimeout(() => {
                window.location.replace(targetPage);
            }, 300);
        } else {
            message.textContent = "Unknown user role.";
            message.style.color = "#ef4444";
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }


    } catch (error) {

        console.log(error);

        message.textContent =
            "Cannot connect to server.";

        message.style.color = "#ef4444";

        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }

});