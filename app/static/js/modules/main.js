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
    handleAddChapter, 
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
    approveUserAction 
} from './admin.js';

import { renderLeaderboard, loadAnnualArchives } from './leaderboard.js';
import { switchTab, changeChapter, toggleKpiSection, handleKPISubmit } from './ui.js';

let standardsData = [];
let chapterSubmissions = {};

export async function loadData() {
    try {
        await loadChapters();

        const [stdRes, subRes, leadRes] = await Promise.all([
            fetchAPI('/standards'),
            fetchAPI(`/submissions/${encodeURIComponent(state.currentChapter)}`),
            fetchAPI('/leaderboard')
        ]);

        const stdJson = await stdRes.json();
        standardsData = Array.isArray(stdJson) ? stdJson : (stdJson.data || stdJson.standards || []);

        const subRaw = await subRes.json();
        chapterSubmissions = {};
        if (Array.isArray(subRaw)) {
            subRaw.forEach(s => { chapterSubmissions[s.standard_id] = s; });
        } else if (typeof subRaw === 'object' && subRaw !== null) {
            chapterSubmissions = subRaw;
        }

        const leaderboardData = await leadRes.json();
        const leadList = Array.isArray(leaderboardData) ? leaderboardData : [];

        // Flexible Chapter Matching
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

        // Render Seluruh Komponen UI
        renderCategoryPills(standardsData);
        renderDashboard(currentLeaderboard, leadList, chapterSubmissions);
        renderDeadlineCalendarWidget(standardsData, chapterSubmissions);
        renderUpcomingDeadlines(standardsData, chapterSubmissions);
        renderStandardsList(standardsData, chapterSubmissions);
        renderEvaluatorPortal(chapterSubmissions);
        renderAdminStandardsList(standardsData);
        renderLeaderboard(leadList);
        loadAnnualArchives();

    } catch (err) {
        console.error("Error loading data:", err);
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
window.handleKPISubmit = handleKPISubmit;
window.updateFileLabel = updateFileLabel;

window.openSubmissionModal = (stdId, stdName, defaultDeadline) => openSubmissionModal(stdId, stdName, defaultDeadline, chapterSubmissions);
window.closeSubmissionModal = closeSubmissionModal;
window.handleModalSubmit = handleModalSubmit;

window.loadChapters = loadChapters;
window.handleAddChapter = handleAddChapter;
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

document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession(loadData);
});