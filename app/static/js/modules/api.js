export const API_BASE = window.location.origin;

export async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('jci_token');
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return await fetch(`${API_BASE}${url}`, { ...options, headers });
}