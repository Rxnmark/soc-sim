/**
 * Global fetch interceptor that automatically attaches the JWT Bearer token
 * to all API requests and handles 401 responses by redirecting to login.
 */

async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = localStorage.getItem("auth-token");
    const headers = new Headers(init?.headers);

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Ensure JSON content type if not already set
    if (!headers.has("Content-Type") && init?.body) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(input, { ...init, headers });

    // On 401, token is invalid/expired — clear it and signal the app
    if (response.status === 401) {
        localStorage.removeItem("auth-token");
        // Dispatch a custom event so components can react (e.g., show login modal)
        window.dispatchEvent(new CustomEvent("auth-expired"));
    }

    return response;
}

export default authenticatedFetch;