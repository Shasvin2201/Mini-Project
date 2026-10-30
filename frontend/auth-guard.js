/* ==========================================================================
   CAMPUS SPACE UTILIZATION - UNIFIED AUTHENTICATION & NAVIGATION GUARD
   ========================================================================== */

(function (window) {
    "use strict";

    const STORAGE_KEY = "loggedInUser";

    const ROLE_DASHBOARDS = {
        admin: "admin.html",
        faculty: "faculty.html",
        management: "management.html"
    };

    /**
     * Retrieve the currently logged-in user object safely from localStorage.
     */
    function getLoggedInUser() {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return null;

        try {
            const user = JSON.parse(json);
            if (user && user.id && user.role) {
                return user;
            }
            localStorage.removeItem(STORAGE_KEY);
            return null;
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    /**
     * Map a role to its authorized dashboard URL.
     */
    function getDashboardForRole(role) {
        if (!role) return "login.html";
        return ROLE_DASHBOARDS[String(role).toLowerCase()] || "login.html";
    }

    /**
     * Used on protected pages (admin.html, faculty.html, management.html).
     * Enforces that the user is authenticated AND belongs to the expected role.
     * Uses location.replace() so unauthorized navigation doesn't pollute history.
     */
    function requireRole(expectedRole) {
        function validate() {
            const user = getLoggedInUser();

            // 1. Not logged in -> send to login page
            if (!user) {
                window.location.replace("login.html");
                return false;
            }

            // 2. Logged in, but wrong role -> send to their authorized dashboard
            const userRole = String(user.role).toLowerCase();
            const targetRole = String(expectedRole).toLowerCase();

            if (userRole !== targetRole) {
                const authorizedPage = getDashboardForRole(userRole);
                window.location.replace(authorizedPage);
                return false;
            }

            return true;
        }

        // Validate immediately
        const isValid = validate();

        // Also validate on bfcache restoration (Back/Forward in Chrome)
        window.addEventListener("pageshow", function (event) {
            validate();
        });

        return isValid;
    }

    /**
     * Used on the login page (login.html).
     * If user is already authenticated, immediately redirects them to their dashboard.
     */
    function redirectIfAuthenticated() {
        function check() {
            const user = getLoggedInUser();
            if (user && user.role) {
                const target = getDashboardForRole(user.role);
                if (target !== "login.html") {
                    window.location.replace(target);
                }
            }
        }

        // Check immediately
        check();

        // Check on bfcache restoration (Back button to login)
        window.addEventListener("pageshow", function (event) {
            check();
        });
    }

    /**
     * Perform an explicit logout:
     * - Clears credentials from localStorage & sessionStorage
     * - Replaces current history entry with login.html
     */
    /**
     * Perform an explicit logout:
     * - Clears credentials from localStorage & sessionStorage
     * - Replaces current history entry with login.html
     */
    function logout() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem("authToken");
            sessionStorage.clear();
        } catch (e) {
            console.error("Error clearing session:", e);
        }
        window.location.replace("login.html");
    }

    /**
     * Transparently attach Authorization: Bearer <token> to every API fetch request
     * and automatically redirect to login if session expires (401 Unauthorized)
     */
    if (typeof window.fetch === "function") {
        const nativeFetch = window.fetch;
        window.fetch = function(resource, init = {}) {
            init = init || {};
            const token = localStorage.getItem("authToken");
            if (token) {
                if (!init.headers) {
                    init.headers = { "Authorization": `Bearer ${token}` };
                } else if (init.headers instanceof Headers) {
                    if (!init.headers.has("Authorization")) {
                        init.headers.set("Authorization", `Bearer ${token}`);
                    }
                } else if (Array.isArray(init.headers)) {
                    init.headers.push(["Authorization", `Bearer ${token}`]);
                } else if (typeof init.headers === "object") {
                    init.headers["Authorization"] = `Bearer ${token}`;
                }
            }
            return nativeFetch.call(this, resource, init).then(response => {
                if (response.status === 401 && !window.location.pathname.endsWith("login.html")) {
                    logout();
                }
                return response;
            });
        };
    }

    // Expose globally on window
    window.authGuard = {
        getLoggedInUser: getLoggedInUser,
        getDashboardForRole: getDashboardForRole,
        requireRole: requireRole,
        redirectIfAuthenticated: redirectIfAuthenticated,
        logout: logout
    };

})(window);
