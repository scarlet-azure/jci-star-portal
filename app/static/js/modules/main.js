import { fetchAPI } from './api.js';
import { 
    checkAuthSession, 
    handleAuthLogin, 
    handleAuthRegister, 
    handleAuthForgotPassword, 
    handleAuthResetPassword, 
    handleLogout, 
    switchLandingForm, 
    state 
} from './auth.js';

import { 
    renderDashboard, 
    renderDeadlineCalendarWidget, 
    renderUpcomingDeadlines, 
    changeCalMonth 
} from './dashboard.js';

import { 
    renderCategoryPills, 
    filterCategory, 
    renderStandardsList, 
    openSubmissionModal, 
    closeSubmissionModal, 
    handleModalSubmit, 
    updateFileLabel 
} from './standards.js';

import { 
    loadChapters, 
    openAddChapterModal,
    closeAddChapterModal,
    handleAddChapterForm, 
    handleDeleteChapter, 
    openStandardModalForAdd, 
    openStandardModalForEdit, 
    closeStandardModal, 
    handleStandardFormSubmit, 
    handleDeleteStandard, 
    openAuditModal, 
    closeAuditModal, 
    handleAuditStatusChange, 
    handleAuditFormSubmit, 
    renderEvaluatorPortal, 
    renderAdminStandardsList, 
    loadPendingUsers, 
    approveUserAction,
    switchAdminSubTab,
    filterAuditStatus,
    loadHandbooks,
    loadAnnualArchives,
    loadAdminKpiSubmissions
} from './admin.js';

import { 
    loadLeaderboard, 
    loadStarLeaderboard, 
    loadKpiLeaderboard, 
    switchLeaderboardSubTab 
} from './leaderboard.js';

import { 
    switchTab, 
    changeChapter, 
    toggleKpiSection,
    loadChapterKpiFormData,
    handleKPISubmit,
    saveKpiDraft,
    submitKpiFinal
} from './ui.js';

let standardsData = [];
let chapterSubmissions = {};

export async function loadData() {
    try {
        await loadChapters();
        
        // Memuat draft KPI form chapter yang aktif
        try {
            if (typeof loadChapterKpiFormData === 'function') {
                await loadChapterKpiFormData();
            }
        } catch (kpiErr) {
            console.warn("Notice: Failed to load chapter KPI form data", kpiErr);
        }

        try {
            await loadHandbooks();
        } catch (hErr) {
            console.warn("Notice: Failed loading handbooks", hErr);
        }

        // Ambil Data Standards, Submissions, dan Leaderboard secara paralel
        const [stdRes, subRes, leadRes] = await Promise.all([
            fetchAPI('/standards'),
            fetchAPI(`/submissions/${encodeURIComponent(state.currentChapter)}`),
            fetchAPI('/leaderboard')
        ]);

        // SAFE PARSING STANDARDS
        let standardsData = [];
        if (stdRes && stdRes.ok) {
            const stdJson = await stdRes.json();
            standardsData = Array.isArray(stdJson) ? stdJson : (stdJson.data || stdJson.standards || []);
        } else {
            console.error("Gagal mengambil /standards - Status:", stdRes?.status);
        }

        // SAFE PARSING SUBMISSIONS
        chapterSubmissions = {};
        if (subRes && subRes.ok) {
            const subRaw = await subRes.json();
            if (Array.isArray(subRaw)) {
                subRaw.forEach(s => { chapterSubmissions[s.standard_id] = s; });
            } else if (typeof subRaw === 'object' && subRaw !== null) {
                chapterSubmissions = subRaw;
            }
        } else {
            console.error("Gagal mengambil /submissions - Status:", subRes?.status);
        }

        // SAFE PARSING LEADERBOARD
        let leadList = [];
        if (leadRes && leadRes.ok) {
            const leaderboardData = await leadRes.json();
            leadList = Array.isArray(leaderboardData) ? leaderboardData : [];
        } else {
            console.error("Gagal mengambil /leaderboard - Status:", leadRes?.status);
        }

        // Flexible Chapter Matching untuk Dashboard Widget Leaderboard
        const targetClean = state.currentChapter.replace(/jci/i, '').trim().toLowerCase();

        let currentLeaderboard = leadList.find(l => {
            const chapClean = (l.chapter_name || '').replace(/jci/i, '').trim().toLowerCase();
            return chapClean === targetClean || chapClean.includes(targetClean) || targetClean.includes(chapClean);
        }) || {
            efficiency_band: "Under Minimum Standard (<90 pts)",
            total_score: 0,
            qualified_stars: 0,
            breakdown: { Efficiency: 0, Network: 0, Experience: 0, Outreach: 0, Impact: 0 }
        };

        // Render Seluruh Komponen Utama UI
        renderCategoryPills(standardsData);
        renderDashboard(currentLeaderboard, leadList, chapterSubmissions);
        renderDeadlineCalendarWidget(standardsData, chapterSubmissions);
        renderUpcomingDeadlines(standardsData, chapterSubmissions);
        renderStandardsList(standardsData, chapterSubmissions);
        renderEvaluatorPortal(chapterSubmissions);
        renderAdminStandardsList(standardsData);
        
        // Render Star Leaderboard Table
        loadStarLeaderboard(leadList);

        // Isolasi error untuk fungsi opsional
        try {
            await loadAnnualArchives(state.currentChapter);
        } catch (archErr) {
            console.warn("Notice: Annual archives tidak ditemukan atau gagal dimuat.", archErr);
        }

        try {
            await loadPendingUsers();
        } catch (userErr) {
            console.warn("Notice: Failed to load pending users.", userErr);
        }

        try {
            await loadAdminKpiSubmissions();
        } catch (adminKpiErr) {
            console.warn("Notice: Failed to load admin KPI submissions.", adminKpiErr);
        }

    } catch (err) {
        console.error("Critical error loading data:", err);
    }
}

// BIND HELPER GLOBAL (UNTUK ONCLICK HTML)
window.loadData = loadData;
window.checkAuthSession = checkAuthSession;
window.handleAuthLogin = handleAuthLogin;
window.handleAuthRegister = handleAuthRegister;
window.handleAuthForgotPassword = handleAuthForgotPassword;
window.handleAuthResetPassword = handleAuthResetPassword;
window.handleLogout = handleLogout;
window.switchLandingForm = switchLandingForm;

window.switchTab = switchTab;
window.changeChapter = changeChapter;
window.filterCategory = filterCategory;
window.changeCalMonth = changeCalMonth;
window.toggleKpiSection = toggleKpiSection;
window.loadChapterKpiFormData = loadChapterKpiFormData;
window.handleKPISubmit = handleKPISubmit;
window.saveKpiDraft = saveKpiDraft;
window.submitKpiFinal = submitKpiFinal;
window.updateFileLabel = updateFileLabel;

window.openSubmissionModal = (stdId, stdName, defaultDeadline) => openSubmissionModal(stdId, stdName, defaultDeadline, chapterSubmissions);
window.closeSubmissionModal = closeSubmissionModal;
window.handleModalSubmit = handleModalSubmit;

window.loadChapters = loadChapters;
window.openAddChapterModal = openAddChapterModal;
window.closeAddChapterModal = closeAddChapterModal;
window.handleAddChapterForm = handleAddChapterForm;
window.handleDeleteChapter = handleDeleteChapter;

window.openStandardModalForAdd = openStandardModalForAdd;
window.openStandardModalForEdit = (stdId) => openStandardModalForEdit(stdId, standardsData);
window.closeStandardModal = closeStandardModal;
window.handleStandardFormSubmit = handleStandardFormSubmit;
window.handleDeleteStandard = handleDeleteStandard;

window.openAuditModal = (subId) => openAuditModal(subId, chapterSubmissions);
window.closeAuditModal = closeAuditModal;
window.handleAuditStatusChange = handleAuditStatusChange;
window.handleAuditFormSubmit = handleAuditFormSubmit;
window.loadPendingUsers = loadPendingUsers;
window.approveUserAction = approveUserAction;
window.switchAdminSubTab = switchAdminSubTab;
window.filterAuditStatus = filterAuditStatus;

window.loadLeaderboard = loadLeaderboard;
window.loadStarLeaderboard = loadStarLeaderboard;
window.loadKpiLeaderboard = loadKpiLeaderboard;
window.switchLeaderboardSubTab = switchLeaderboardSubTab;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession(loadData);
});