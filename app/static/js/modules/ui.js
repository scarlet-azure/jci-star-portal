import { state } from './auth.js';

export function switchTab(tabId) {
    const isAdmin = (state.currentRole === 'ADMIN' || state.currentRole === 'UserRole.ADMIN');

    if (tabId === 'evaluator' && !isAdmin) {
        alert("Evaluator Portal hanya dapat diakses oleh National Admin.");
        return;
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('border-jci-blue', 'text-jci-blue', 'font-semibold');
        btn.classList.add('border-transparent', 'text-slate-500', 'font-medium');
    });
    
    const active = document.getElementById(`tabBtn-${tabId}`);
    if (active) {
        active.classList.remove('border-transparent', 'text-slate-500', 'font-medium');
        active.classList.add('border-jci-blue', 'text-jci-blue', 'font-semibold');
    }
}

export function changeChapter(chap) {
    state.currentChapter = chap;
    localStorage.setItem('jci_chapter', chap);

    const dashTitle = document.getElementById('dashChapterTitle');
    if (dashTitle) dashTitle.textContent = chap;
    
    const subTitle = document.getElementById('evalAuditSubtitle');
    if (subTitle) subTitle.textContent = `Showing submissions for ${chap}`;
    
    if (window.loadData) window.loadData();
}

export function toggleKpiSection(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
}

export function handleKPISubmit(e) {
    if (e) e.preventDefault();
    alert("Form KPI Self-Assessment berhasil disubmit!");
}