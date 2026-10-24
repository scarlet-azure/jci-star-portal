export const API_BASE = window.location.origin;

export async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('jci_token') || localStorage.getItem('token');
    const savedEmail = localStorage.getItem('jci_email');
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (savedEmail) {
        headers['X-User-Email'] = savedEmail;
    }

    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return await fetch(`${API_BASE}${url}`, { ...options, headers });
}