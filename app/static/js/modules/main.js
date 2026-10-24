import { fetchAPI } from './api.js';
import { 
    checkAuthSession, handleAuthLogin, handleAuthRegister, 
    handleAuthForgotPassword, handleAuthResetPassword, handleLogout, switchLandingForm, state 
} from './auth.js';

import { renderDashboard } from './dashboard.js';
import { renderDeadlineCalendarWidget, renderUpcomingDeadlines, changeCalMonth, onCalendarDateClick, clearDeadlineFilter } from './calendar.js';
import { renderCategoryPills, filterCategory, renderStandardsList, openSubmissionModal, closeSubmissionModal, handleModalSubmit, updateFileLabel } from './standards.js';

import { 
    loadChapters, openAddChapterModal, closeAddChapterModal, handleAddChapterForm, 
    openEditChapterModal, closeEditChapterModal, handleEditChapterFormSubmit, handleDeleteChapter,
    openStandardModalForAdd, openStandardModalForEdit, closeStandardModal, handleStandardFormSubmit, handleDeleteStandard, renderAdminStandardsList,
    openAuditModal, closeAuditModal, handleAuditStatusChange, handleAuditFormSubmit, renderEvaluatorPortal, filterAuditStatus,
    loadKpiSchema, openTabEditorModal, closeTabEditorModal, handleSaveTabSubmit, handleDeleteTab,
    toggleOptionScoringSection, addOptionRow, openAddKpiFieldModal, openEditKpiFieldModal, closeEditKpiFieldModal, handleSaveKpiFieldSubmit, handleDeleteKpiField,
    loadAdminKpiSubmissions, openKpiAuditModal, closeKpiAuditModal, handleKpiAuditSubmit,
    loadPendingUsers, approveUserAction, switchAdminSubTab, loadHandbooks, loadAnnualArchives
} from './admin.js';

import { loadLeaderboard, loadStarLeaderboard, loadKpiLeaderboard, switchLeaderboardSubTab } from './leaderboard.js';
import { switchTab, changeChapter, toggleKpiSection, loadChapterKpiFormData, handleKPISubmit, saveKpiDraft, submitKpiFinal } from './ui.js';
import { renderDynamicKpiForm, switchDynamicKpiTab, loadExistingKpiSubmission } from './kpi.js';

let standardsData = [];
let chapterSubmissions = {};

export async function loadData() {
    try {
        await loadChapters();

        try { if (typeof renderDynamicKpiForm === 'function') await renderDynamicKpiForm(); } catch (e) {}
        try { if (typeof loadChapterKpiFormData === 'function') await loadChapterKpiFormData(); } catch (e) {}
        try { await loadHandbooks(); } catch (e) {}

        const [stdRes, subRes, leadRes] = await Promise.all([
            fetchAPI('/standards'),
            fetchAPI(`/submissions/${encodeURIComponent(state.currentChapter)}`),
            fetchAPI('/leaderboard')
        ]);

        standardsData = [];
        if (stdRes && stdRes.ok) {
            const stdJson = await stdRes.json();
            standardsData = Array.isArray(stdJson) ? stdJson : (stdJson.data || stdJson.standards || []);
        }

        chapterSubmissions = {};
        if (subRes && subRes.ok) {
            const subRaw = await subRes.json();
            if (Array.isArray(subRaw)) {
                subRaw.forEach(s => { chapterSubmissions[s.standard_id] = s; });
            } else if (typeof subRaw === 'object' && subRaw !== null) {
                chapterSubmissions = subRaw;
            }
        }

        let leadList = [];
        if (leadRes && leadRes.ok) {
            const leaderboardData = await leadRes.json();
            leadList = Array.isArray(leaderboardData) ? leaderboardData : [];
        }

        // =========================================================
        // PERBAIKAN: CARI & NORMALSASI DATA CHAPTER AKTIF DARI LEADERBOARD
        // =========================================================
        const currentChapName = (state.currentChapter || 'Jakarta').replace(/^JCI\s+/i, '').trim().toLowerCase();
        
        let currentChapterData = leadList.find(item => {
            const itemClean = (item.chapter_name || item.name || '').replace(/^JCI\s+/i, '').trim().toLowerCase();
            return itemClean === currentChapName || itemClean.includes(currentChapName) || currentChapName.includes(itemClean);
        });

        // Fallback jika chapter belum terdaftar di leaderboard
        if (!currentChapterData) {
            currentChapterData = {
                chapter_name: state.currentChapter,
                total_score: 0,
                breakdown: { Efficiency: 0, Network: 0, Experience: 0, Outreach: 0, Impact: 0 }
            };
        }

        renderCategoryPills(standardsData);
        
        // Kirim currentChapterData (bukan {}) ke renderDashboard
        renderDashboard(currentChapterData, leadList, chapterSubmissions, standardsData);
        
        renderDeadlineCalendarWidget(standardsData, chapterSubmissions);
        renderUpcomingDeadlines(standardsData, chapterSubmissions);
        renderStandardsList(standardsData, chapterSubmissions);
        renderEvaluatorPortal(chapterSubmissions);
        renderAdminStandardsList(standardsData);
        
        loadStarLeaderboard(leadList);
        loadPendingUsers();
        loadAdminKpiSubmissions();

    } catch (err) {
        console.error("Critical error loading data:", err);
    }
}

// Global Binds
window.loadData = loadData;
window.checkAuthSession = checkAuthSession;
window.handleAuthLogin = handleAuthLogin;
window.handleAuthRegister = handleAuthRegister;
window.handleLogout = handleLogout;
window.switchTab = switchTab;
window.changeChapter = changeChapter;

// Standards Binds
window.filterCategory = filterCategory;
window.openStandardModalForAdd = openStandardModalForAdd;
window.openStandardModalForEdit = openStandardModalForEdit;
window.closeStandardModal = closeStandardModal;
window.handleStandardFormSubmit = handleStandardFormSubmit;
window.handleDeleteStandard = handleDeleteStandard;

// KPI Binds
window.loadKpiSchema = loadKpiSchema;
window.openTabEditorModal = openTabEditorModal;
window.closeTabEditorModal = closeTabEditorModal;
window.handleSaveTabSubmit = handleSaveTabSubmit;
window.handleDeleteTab = handleDeleteTab;
window.toggleOptionScoringSection = toggleOptionScoringSection;
window.addOptionRow = addOptionRow;
window.openAddKpiFieldModal = openAddKpiFieldModal;
window.openEditKpiFieldModal = openEditKpiFieldModal;
window.closeEditKpiFieldModal = closeEditKpiFieldModal;
window.handleSaveKpiFieldSubmit = handleSaveKpiFieldSubmit;
window.handleDeleteKpiField = handleDeleteKpiField;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession(loadData);
  
    const subForm = document.getElementById('submissionForm');
      if (subForm) {
          subForm.addEventListener('submit', handleModalSubmit);
      }
  
  	// Event listener untuk Search Input di Standards
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (typeof renderStandardsList === 'function' && Array.isArray(window.standardsData)) {
                renderStandardsList(window.standardsData, window.chapterSubmissions || {});
            }
        });
    }
});

// Listener Global Keyboard Escape untuk menutup SEMUA modal yang terbuka
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.fixed:not(.hidden)').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.classList.remove('overflow-hidden');
    }
});

// Helper penutup modal generik yang bisa dipanggil dari tombol X
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    document.body.classList.remove('overflow-hidden');
}
window.closeModal = closeModal;

// Tambahkan di bagian paling bawah app/static/js/modules/admin.js:
document.addEventListener('DOMContentLoaded', () => {
    loadHandbooks();

    // Jika tombol tab Reference di navbar diklik, muat ulang daftar dokumen terbaru
    const refTabBtn = document.getElementById('tabBtn-reference') || document.querySelector('[onclick*="reference"]');
    if (refTabBtn) {
        refTabBtn.addEventListener('click', () => loadHandbooks());
    }
});