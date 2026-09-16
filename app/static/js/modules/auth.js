import { fetchAPI } from './api.js';

export let state = {
    isLoggedIn: false,
    currentRole: 'CHAPTER_PIC',
    currentChapter: 'Jakarta',
    currentUserFullName: '',
    currentUserEmail: ''
};

export function checkAuthSession(onSuccess) {
    if (window.loadChapters) window.loadChapters();

    const savedChapter = localStorage.getItem('jci_chapter');
    const savedRole = localStorage.getItem('jci_role');
    const savedEmail = localStorage.getItem('jci_email');
    const savedName = localStorage.getItem('jci_name');

    if (savedEmail && savedRole) {
        state.isLoggedIn = true;
        state.currentRole = savedRole;

        if (savedChapter && (savedRole === 'CHAPTER_PIC' || savedRole === 'UserRole.CHAPTER_PIC')) {
            state.currentChapter = savedChapter;
        }

        state.currentUserEmail = savedEmail;
        state.currentUserFullName = savedName || savedEmail;

        document.getElementById('landingLoginScreen')?.classList.add('hidden');
        
        const label = document.getElementById('headerUserLabel');
        if (label) {
            label.textContent = (state.currentRole === 'ADMIN' || state.currentRole === 'UserRole.ADMIN')
                ? `${state.currentUserFullName} (Admin)`
                : `${state.currentUserFullName} (${state.currentChapter})`;
        }

        applyRolePermissions();
        if (onSuccess) onSuccess();
    } else {
        state.isLoggedIn = false;
        document.getElementById('landingLoginScreen')?.classList.remove('hidden');
    }
}

export function applyRolePermissions() {
    const headerSelectWrapper = document.getElementById('headerChapterSelectWrapper');
    const tabEvaluatorBtn = document.getElementById('tabBtn-evaluator');
    const adminPendingCard = document.getElementById('adminPendingUsersCard');
    const isAdmin = (state.currentRole === 'ADMIN' || state.currentRole === 'UserRole.ADMIN');

    if (isAdmin) {
        if (headerSelectWrapper) headerSelectWrapper.classList.remove('hidden');
        if (tabEvaluatorBtn) tabEvaluatorBtn.classList.remove('hidden');
        if (adminPendingCard) {
            adminPendingCard.classList.remove('hidden');
            if (window.loadPendingUsers) window.loadPendingUsers();
        }

        const roleBanner = document.getElementById('roleAlertBanner');
        if (roleBanner) roleBanner.className = "mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between shadow-sm";
        
        const bannerTitle = document.getElementById('roleBannerTitle');
        if (bannerTitle) bannerTitle.textContent = "Active Mode: National Admin / Evaluator Desk";
        
        const bannerDesc = document.getElementById('roleBannerDesc');
        if (bannerDesc) bannerDesc.innerHTML = `You have full verification privileges. Audit chapter submissions, edit standards, and manage national chapter roster.`;
        
        const roleTag = document.getElementById('roleTag');
        if (roleTag) roleTag.textContent = "Admin Mode";
    } else {
        if (headerSelectWrapper) headerSelectWrapper.classList.add('hidden');
        if (tabEvaluatorBtn) tabEvaluatorBtn.classList.add('hidden');
        if (adminPendingCard) adminPendingCard.classList.add('hidden');

        const roleBanner = document.getElementById('roleAlertBanner');
        if (roleBanner) roleBanner.className = "mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start justify-between shadow-sm";
        
        const bannerTitle = document.getElementById('roleBannerTitle');
        if (bannerTitle) bannerTitle.textContent = `Active Mode: Chapter PIC (${state.currentChapter})`;
        
        const bannerDesc = document.getElementById('roleBannerDesc');
        if (bannerDesc) bannerDesc.innerHTML = `You are managing standard entries for <strong>${state.currentChapter}</strong>. Submit standard evidence files and track progress.`;
        
        const roleTag = document.getElementById('roleTag');
        if (roleTag) roleTag.textContent = "PIC Mode";

        const activeTab = document.querySelector('.tab-content:not(.hidden)');
        if (activeTab && activeTab.id === 'tab-evaluator') {
            if (window.switchTab) window.switchTab('dashboard');
        }
    }
}

export function switchLandingForm(view) {
    document.getElementById('loginAlert')?.classList.add('hidden');
    document.getElementById('landingLoginForm')?.classList.add('hidden');
    document.getElementById('landingRegisterForm')?.classList.add('hidden');
    document.getElementById('landingForgotForm')?.classList.add('hidden');
    document.getElementById('landingResetForm')?.classList.add('hidden');

    if (view === 'login') document.getElementById('landingLoginForm')?.classList.remove('hidden');
    if (view === 'register') {
        if (window.loadChapters) window.loadChapters();
        document.getElementById('landingRegisterForm')?.classList.remove('hidden');
    }
    if (view === 'forgot') document.getElementById('landingForgotForm')?.classList.remove('hidden');
    if (view === 'reset') document.getElementById('landingResetForm')?.classList.remove('hidden');
}

export function showLoginAlert(message, type = 'error') {
    const alertBox = document.getElementById('loginAlert');
    const alertText = document.getElementById('loginAlertText');
    const alertIcon = document.getElementById('loginAlertIcon');
    if (!alertBox || !alertText || !alertIcon) return;

    alertBox.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'border', 'border-rose-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200');

    if (type === 'error') {
        alertBox.classList.add('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200');
        alertIcon.className = "fa-solid fa-circle-exclamation text-rose-500 text-sm";
    } else {
        alertBox.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
        alertIcon.className = "fa-solid fa-circle-check text-emerald-500 text-sm";
    }

    alertText.textContent = typeof message === 'object' ? (message.detail || JSON.stringify(message)) : message;
}

export async function handleAuthLogin(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnLoginSubmit');
    const alertBox = document.getElementById('loginAlert');
    if (alertBox) alertBox.classList.add('hidden');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin"></i> <span>Verifying...</span>`;
    }

    const email = document.getElementById('lEmail').value.trim();
    const password = document.getElementById('lPassword').value;

    try {
        const res = await fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        let result = await res.json();
        if (!res.ok) throw result;

        showLoginAlert("Login Berhasil! Mengarahkan...", "success");

        state.isLoggedIn = true;
        state.currentRole = result.role;
        state.currentUserEmail = result.email || email;
        state.currentUserFullName = result.full_name || state.currentUserEmail;

        if (result.chapter_name && (result.role === 'CHAPTER_PIC' || result.role === 'UserRole.CHAPTER_PIC')) {
            state.currentChapter = result.chapter_name;
        }

        if (result.access_token) {
            localStorage.setItem('jci_token', result.access_token);
        }
        localStorage.setItem('jci_email', state.currentUserEmail);
        localStorage.setItem('jci_name', state.currentUserFullName);
        localStorage.setItem('jci_role', state.currentRole);
        localStorage.setItem('jci_chapter', state.currentChapter);

        setTimeout(() => {
            document.getElementById('landingLoginScreen')?.classList.add('hidden');
            const label = document.getElementById('headerUserLabel');
            if (label) {
                label.textContent = (state.currentRole === 'ADMIN' || state.currentRole === 'UserRole.ADMIN')
                    ? `${state.currentUserFullName} (Admin)`
                    : `${state.currentUserFullName} (${state.currentChapter})`;
            }

            applyRolePermissions();
            if (window.loadData) window.loadData();
        }, 500);

    } catch (err) {
        let errorMsg = "Email atau password salah";
        if (typeof err === 'string') errorMsg = err;
        else if (err && typeof err.detail === 'string') errorMsg = err.detail;

        showLoginAlert(errorMsg, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>Sign In to Portal</span>`;
        }
    }
}

export async function handleAuthRegister(e) {
    if (e) e.preventDefault();
    const fullName = document.getElementById('lRegFullName').value.trim();
    const email = document.getElementById('lRegEmail').value.trim();
    const password = document.getElementById('lRegPassword').value;
    const chapter = document.getElementById('lRegChapterSelect').value;

    try {
        const res = await fetchAPI('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ full_name: fullName, email, password, chapter_name: chapter })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Registrasi Gagal");

        showLoginAlert(result.message, "success");
        switchLandingForm('login');
    } catch (err) {
        showLoginAlert(err.message, "error");
    }
}

export async function handleAuthForgotPassword(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('lForgotEmail').value.trim();

    try {
        const res = await fetchAPI('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal mengirim OTP");

        showLoginAlert(result.message, "success");
        document.getElementById('lResetEmail').value = email;
        switchLandingForm('reset');
    } catch (err) {
        showLoginAlert(err.message, "error");
    }
}

export async function handleAuthResetPassword(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('lResetEmail').value.trim();
    const code = document.getElementById('lResetCode').value.trim();
    const new_password = document.getElementById('lResetNewPassword').value;

    try {
        const res = await fetchAPI('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, code, new_password })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal memperbarui password");

        showLoginAlert(result.message, "success");
        switchLandingForm('login');
    } catch (err) {
        showLoginAlert(err.message, "error");
    }
}

export function handleLogout() {
    localStorage.clear();
    state.isLoggedIn = false;
    location.reload();
}