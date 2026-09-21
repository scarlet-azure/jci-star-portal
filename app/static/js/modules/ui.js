import { fetchAPI } from './api.js';
import { state } from './auth.js';

// ==========================================
// 1. SWITCH TAB UTAMA PORTAL
// ==========================================
export function switchTab(tabId) {
    const isAdmin = (state.currentRole === 'ADMIN' || state.currentRole === 'UserRole.ADMIN');

    if (tabId === 'evaluator' && !isAdmin) {
        alert("Evaluator Portal hanya dapat diakses oleh National Admin.");
        return;
    }

    // Sembunyikan semua konten tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // Tampilkan tab yang dipilih
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    // Reset style button navigasi
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('border-jci-blue', 'text-jci-blue', 'font-semibold');
        btn.classList.add('border-transparent', 'text-slate-500', 'font-medium');
    });
    
    // Highlight button aktif
    const active = document.getElementById(`tabBtn-${tabId}`);
    if (active) {
        active.classList.remove('border-transparent', 'text-slate-500', 'font-medium');
        active.classList.add('border-jci-blue', 'text-jci-blue', 'font-semibold');
    }

    // Pemicu prapemuatan data sesuai tab yang diklik
    if (tabId === 'leaderboard' && typeof window.loadLeaderboard === 'function') {
        window.loadLeaderboard();
    } else if (tabId === 'kpi' && typeof loadChapterKpiFormData === 'function') {
        loadChapterKpiFormData();
    } else if (tabId === 'evaluator' && typeof window.loadAdminKpiSubmissions === 'function') {
        window.loadAdminKpiSubmissions();
    }
}

// ==========================================
// 2. CHANGE CHAPTER HANDLER
// ==========================================
export function changeChapter(chap) {
    state.currentChapter = chap;
    localStorage.setItem('jci_chapter', chap);

    const dashTitle = document.getElementById('dashChapterTitle');
    if (dashTitle) dashTitle.textContent = chap;
    
    const subTitle = document.getElementById('evalAuditSubtitle');
    if (subTitle) subTitle.textContent = `Showing submissions for ${chap}`;
    
    if (window.loadData) window.loadData();
}

// ==========================================
// 3. KPI SUB-TAB NAVIGATOR (10 ASPEK)
// ==========================================
export function switchKpiTab(tabIdx) {
    document.querySelectorAll('.kpi-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.kpi-tab-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-600', 'text-white');
        btn.classList.add('text-slate-600');
    });

    const activeContent = document.getElementById(`kpi-tab-content-${tabIdx}`);
    const activeBtn = document.getElementById(`kpi-tab-btn-${tabIdx}`);

    if (activeContent) activeContent.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.add('bg-emerald-600', 'text-white');
        activeBtn.classList.remove('text-slate-600');
    }
}

export function toggleKpiSection(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
}

// ==========================================
// 4. LOAD KPI DRAFT & SUBMITTED DATA TO FORM
// ==========================================
export async function loadChapterKpiFormData() {
    try {
        const res = await fetchAPI(`/kpi/${encodeURIComponent(state.currentChapter)}`);
        if (!res || !res.ok) return;

        const data = await res.json();
        if (!data) return;

        const badgeEl = document.getElementById('kpiStatusBadge');
        const scoreEl = document.getElementById('kpiScoreTotal');
        if (badgeEl) badgeEl.textContent = `Status: ${data.status || 'Draft'}`;
        if (scoreEl) scoreEl.textContent = `${data.evaluator_score || 0} pts`;

        // Fill Form Fields jika data tersimpan
        if (data.membership_data) {
            if (data.membership_data.lbod_status_score && document.getElementById('kpi_lbod_status')) document.getElementById('kpi_lbod_status').value = data.membership_data.lbod_status_score;
            if (data.membership_data.declare_status_score && document.getElementById('kpi_declare_status')) document.getElementById('kpi_declare_status').value = data.membership_data.declare_status_score;
            if (data.membership_data.declared_count && document.getElementById('kpi_declared_count')) document.getElementById('kpi_declared_count').value = data.membership_data.declared_count;
            if (data.membership_data.dues_status_score && document.getElementById('kpi_dues_status')) document.getElementById('kpi_dues_status').value = data.membership_data.dues_status_score;
            if (data.membership_data.dues_amount && document.getElementById('kpi_dues_amount')) document.getElementById('kpi_dues_amount').value = data.membership_data.dues_amount;
            if (data.membership_data.has_database_score && document.getElementById('kpi_has_database')) document.getElementById('kpi_has_database').value = data.membership_data.has_database_score;
            if (data.membership_data.database_url && document.getElementById('kpi_database_url')) document.getElementById('kpi_database_url').value = data.membership_data.database_url;
        }

        if (data.legality_data) {
            if (document.getElementById('kpi_leg_adart')) document.getElementById('kpi_leg_adart').checked = !!data.legality_data.adart;
            if (document.getElementById('kpi_leg_notaris')) document.getElementById('kpi_leg_notaris').checked = !!data.legality_data.notaris;
            if (document.getElementById('kpi_leg_sk')) document.getElementById('kpi_leg_sk').checked = !!data.legality_data.sk;
            if (document.getElementById('kpi_leg_npwp')) document.getElementById('kpi_leg_npwp').checked = !!data.legality_data.npwp;
            if (document.getElementById('kpi_leg_bank')) document.getElementById('kpi_leg_bank').checked = !!data.legality_data.bank;
            if (document.getElementById('kpi_leg_pajak')) document.getElementById('kpi_leg_pajak').checked = !!data.legality_data.pajak;
            if (document.getElementById('kpi_leg_keuangan')) document.getElementById('kpi_leg_keuangan').checked = !!data.legality_data.keuangan;
            if (document.getElementById('kpi_leg_audit')) document.getElementById('kpi_leg_audit').checked = !!data.legality_data.audit;
            if (data.legality_data.folder_url && document.getElementById('kpi_legality_folder_url')) document.getElementById('kpi_legality_folder_url').value = data.legality_data.folder_url;
        }

        if (data.poa_data) {
            if (data.poa_data.time_score && document.getElementById('kpi_poa_time')) document.getElementById('kpi_poa_time').value = data.poa_data.time_score;
            if (data.poa_data.pct && document.getElementById('kpi_poa_pct')) document.getElementById('kpi_poa_pct').value = data.poa_data.pct;
            if (data.poa_data.strategic_plan_desc && document.getElementById('kpi_strategic_plan_desc')) document.getElementById('kpi_strategic_plan_desc').value = data.poa_data.strategic_plan_desc;
        }

        if (data.impact_data) {
            if (data.impact_data.needs && document.getElementById('kpi_impact_needs')) document.getElementById('kpi_impact_needs').value = data.impact_data.needs;
            if (data.impact_data.projects && document.getElementById('kpi_impact_projects')) document.getElementById('kpi_impact_projects').value = data.impact_data.projects;
        }

        if (data.skill_data) {
            if (data.skill_data.trainings && document.getElementById('kpi_skill_official_trainings')) document.getElementById('kpi_skill_official_trainings').value = data.skill_data.trainings;
            if (data.skill_data.trainers && document.getElementById('kpi_skill_trainers')) document.getElementById('kpi_skill_trainers').value = data.skill_data.trainers;
        }

        if (data.national_events_data) {
            if (data.national_events_data.hosting && document.getElementById('kpi_nat_hosting')) document.getElementById('kpi_nat_hosting').value = data.national_events_data.hosting;
            if (data.national_events_data.delegates && document.getElementById('kpi_nat_delegates')) document.getElementById('kpi_nat_delegates').value = data.national_events_data.delegates;
        }

        if (data.intl_events_data) {
            if (data.intl_events_data.delegates && document.getElementById('kpi_intl_delegates')) document.getElementById('kpi_intl_delegates').value = data.intl_events_data.delegates;
        }

        if (data.branding_data) {
            if (data.branding_data.website && document.getElementById('kpi_brand_website')) document.getElementById('kpi_brand_website').value = data.branding_data.website;
            if (data.branding_data.socmed && document.getElementById('kpi_brand_socmed')) document.getElementById('kpi_brand_socmed').value = data.branding_data.socmed;
            if (data.branding_data.media && document.getElementById('kpi_brand_media')) document.getElementById('kpi_brand_media').value = data.branding_data.media;
        }

        if (data.awarding_data) {
            if (data.awarding_data.local && document.getElementById('kpi_award_local')) document.getElementById('kpi_award_local').value = data.awarding_data.local;
            if (data.awarding_data.submissions && document.getElementById('kpi_award_submissions')) document.getElementById('kpi_award_submissions').value = data.awarding_data.submissions;
        }

        if (data.misc_data) {
            if (data.misc_data.fav_members && document.getElementById('kpi_misc_fav_members')) document.getElementById('kpi_misc_fav_members').value = data.misc_data.fav_members;
            if (data.misc_data.best_member && document.getElementById('kpi_misc_best_member')) document.getElementById('kpi_misc_best_member').value = data.misc_data.best_member;
            if (data.misc_data.nvp_rating && document.getElementById('kpi_misc_nvp_rating')) document.getElementById('kpi_misc_nvp_rating').value = data.misc_data.nvp_rating;
        }
    } catch (err) {
        console.error("Gagal memuat draft KPI form:", err);
    }
}

// ==========================================
// 5. HANDLE KPI SUBMIT & SAVE DRAFT
// ==========================================
async function sendKpiFormData(statusVal) {
    const payload = {
        chapter_name: state.currentChapter,
        year: 2026,
        membership_data: {
            lbod_status_score: parseInt(document.getElementById('kpi_lbod_status')?.value || 0),
            declare_status_score: parseInt(document.getElementById('kpi_declare_status')?.value || 0),
            declared_count: parseInt(document.getElementById('kpi_declared_count')?.value || 0),
            dues_status_score: parseInt(document.getElementById('kpi_dues_status')?.value || 0),
            dues_amount: document.getElementById('kpi_dues_amount')?.value.trim() || '',
            has_database_score: parseInt(document.getElementById('kpi_has_database')?.value || 0),
            database_url: document.getElementById('kpi_database_url')?.value.trim() || ''
        },
        legality_data: {
            adart: !!document.getElementById('kpi_leg_adart')?.checked,
            notaris: !!document.getElementById('kpi_leg_notaris')?.checked,
            sk: !!document.getElementById('kpi_leg_sk')?.checked,
            npwp: !!document.getElementById('kpi_leg_npwp')?.checked,
            bank: !!document.getElementById('kpi_leg_bank')?.checked,
            pajak: !!document.getElementById('kpi_leg_pajak')?.checked,
            keuangan: !!document.getElementById('kpi_leg_keuangan')?.checked,
            audit: !!document.getElementById('kpi_leg_audit')?.checked,
            folder_url: document.getElementById('kpi_legality_folder_url')?.value.trim() || ''
        },
        poa_data: {
            time_score: parseInt(document.getElementById('kpi_poa_time')?.value || 0),
            pct: parseInt(document.getElementById('kpi_poa_pct')?.value || 0),
            strategic_plan_desc: document.getElementById('kpi_strategic_plan_desc')?.value.trim() || ''
        },
        impact_data: {
            needs: document.getElementById('kpi_impact_needs')?.value.trim() || '',
            projects: document.getElementById('kpi_impact_projects')?.value.trim() || ''
        },
        skill_data: {
            trainings: document.getElementById('kpi_skill_official_trainings')?.value.trim() || '',
            trainers: document.getElementById('kpi_skill_trainers')?.value.trim() || ''
        },
        national_events_data: {
            hosting: document.getElementById('kpi_nat_hosting')?.value.trim() || '',
            delegates: document.getElementById('kpi_nat_delegates')?.value.trim() || ''
        },
        intl_events_data: {
            delegates: document.getElementById('kpi_intl_delegates')?.value.trim() || ''
        },
        branding_data: {
            website: document.getElementById('kpi_brand_website')?.value.trim() || '',
            socmed: document.getElementById('kpi_brand_socmed')?.value.trim() || '',
            media: document.getElementById('kpi_brand_media')?.value.trim() || ''
        },
        awarding_data: {
            local: document.getElementById('kpi_award_local')?.value.trim() || '',
            submissions: document.getElementById('kpi_award_submissions')?.value.trim() || ''
        },
        misc_data: {
            fav_members: document.getElementById('kpi_misc_fav_members')?.value.trim() || '',
            best_member: document.getElementById('kpi_misc_best_member')?.value.trim() || '',
            nvp_rating: parseInt(document.getElementById('kpi_misc_nvp_rating')?.value || 100)
        },
        status: statusVal
    };

    try {
        const res = await fetchAPI('/kpi/submit', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menyimpan data KPI");

        if (statusVal === 'Draft') {
            alert("Draft Formulir KPI Self-Assessment berhasil disimpan!");
        } else {
            alert("Formulir KPI Self-Assessment 2026 berhasil dikirim!");
        }

        if (window.loadData) window.loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

export function saveKpiDraft(e) {
    if (e) e.preventDefault();
    sendKpiFormData('Draft');
}

export function submitKpiFinal(e) {
    if (e) e.preventDefault();
    sendKpiFormData('Submitted');
}

export function handleKPISubmit(e) {
    if (e) e.preventDefault();
    submitKpiFinal(e);
}

// BIND HELPER GLOBAL (UNTUK ONCLICK HTML)
window.switchTab = switchTab;
window.changeChapter = changeChapter;
window.switchKpiTab = switchKpiTab;
window.toggleKpiSection = toggleKpiSection;
window.loadChapterKpiFormData = loadChapterKpiFormData;
window.saveKpiDraft = saveKpiDraft;
window.submitKpiFinal = submitKpiFinal;
window.handleKPISubmit = handleKPISubmit;