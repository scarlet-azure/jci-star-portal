import { fetchAPI } from './api.js';
import { state } from './auth.js';
import { getDeadlineStatus } from './calendar.js';

let currentCategoryFilter = 'ALL';

/**
 * Render Pill Tombol Kategori (ALL, EFFICIENCY, NETWORK, dll)
 */
export function renderCategoryPills(standardsData = []) {
    const container = document.getElementById('categoryPillsContainer');
    if (!container) return;

    const categories = ['ALL', 'EFFICIENCY', 'NETWORK', 'EXPERIENCE', 'OUTREACH', 'IMPACT'];
    const counts = { ALL: standardsData.length };
    
    // Hitung jumlah item per kategori
    categories.slice(1).forEach(cat => {
        counts[cat] = standardsData.filter(s => {
            const starVal = (s.star || s.star_category || s.category || '').toUpperCase();
            return starVal === cat;
        }).length;
    });
    
    container.innerHTML = categories.map(cat => {
        const countText = counts[cat] !== undefined ? ` (${counts[cat]})` : ' (0)';
        const isActive = currentCategoryFilter === cat;
        
        return `
            <button onclick="filterCategory('${cat}')" 
                class="px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                    isActive 
                        ? 'bg-jci-blue text-white shadow-md' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                ${cat}${countText}
            </button>
        `;
    }).join('');
}

/**
 * Handler Filter Berdasarkan Kategori
 */
export function filterCategory(cat) {
    currentCategoryFilter = String(cat).toUpperCase();

    // Update style tombol kategori yang aktif
    document.querySelectorAll('#categoryPillsContainer button').forEach(btn => {
        const btnText = btn.textContent.trim().toUpperCase();
        if (btnText.startsWith(currentCategoryFilter)) {
            btn.className = "px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer bg-jci-blue text-white shadow-md";
        } else {
            btn.className = "px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200";
        }
    });

    if (typeof renderStandardsList === 'function' && Array.isArray(window.standardsData)) {
        renderStandardsList(window.standardsData, window.chapterSubmissions || {});
    } else if (window.loadData) {
        window.loadData();
    }
}

/**
 * Render Daftar Standar & Tabel
 */
export function renderStandardsList(standardsData = [], chapterSubmissions = {}) {
    const container = document.getElementById('standardsSectionsContainer');
    const searchInput = document.getElementById('searchInput');

    if (!container) return;

    // Cache global data
    window.standardsData = standardsData;
    window.chapterSubmissions = chapterSubmissions;

    if (!Array.isArray(standardsData) || standardsData.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                Belum ada data standar yang dimuat dari database.
            </div>`;
        return;
    }

    // Role User
    const userRole = localStorage.getItem('userRole') || window.state?.userRole || 'user';
    const isAdmin = userRole === 'admin' || userRole === 'EVALUATOR';

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Filter data berdasarkan kategori dan query pencarian
    const filtered = standardsData.filter(std => {
        const stdId = String(std.id || std.standard_id || std.code || '').toLowerCase();
        const stdName = String(std.name || std.title || '').toLowerCase();
        const stdStar = (std.star || std.star_category || std.category || '').toUpperCase();

        const matchesCat = (currentCategoryFilter === 'ALL') || (stdStar === currentCategoryFilter);
        const matchesSearch = !query || stdName.includes(query) || stdId.includes(query);
        return matchesCat && matchesSearch;
    });

    // Grouping standar berdasarkan Star Category
    const grouped = {};
    filtered.forEach(std => {
        const cat = (std.star || std.star_category || std.category || 'OTHER').toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(std);
    });

    // --- TAMPILAN JIKA PENCARIAN KOSONG ---
    if (Object.keys(grouped).length === 0) {
        const rawSearchVal = searchInput ? searchInput.value.trim() : '';
        const catLabel = currentCategoryFilter || 'ALL';

        const notFoundMessage = rawSearchVal 
            ? `Tidak ditemukan standar dengan kata kunci "<strong class="text-slate-800">${rawSearchVal}</strong>" pada kategori <span class="uppercase font-bold text-jci-blue">${catLabel}</span>.`
            : `Belum ada standar terdaftar untuk kategori <span class="uppercase font-bold text-jci-blue">${catLabel}</span>.`;

        container.innerHTML = `
            <div class="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 my-4">
                <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-lg">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h4 class="font-extrabold text-slate-800 text-sm">Tidak Ada Standar Ditemukan</h4>
                <p class="text-xs text-slate-500 max-w-md mx-auto">
                    ${notFoundMessage}
                </p>
                ${rawSearchVal ? `
                    <button onclick="resetSearchStandards()" class="mt-2 px-4 py-2 bg-jci-blue hover:bg-jci-navy text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-1.5">
                        <i class="fa-solid fa-rotate-left"></i> Reset Pencarian
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    // Render Tabel Per Kategori
    container.innerHTML = Object.keys(grouped).map(cat => {
        const rowsHtml = grouped[cat].map(std => {
            const stdId = String(std.id || std.standard_id || std.code || '');
            const stdName = std.name || std.title || '';
            const stdStar = (std.star || std.star_category || std.category || cat).toUpperCase();
            const maxScore = std.max_score || std.weight || std.points || 10;
            const stdPurpose = std.purpose || std.description || std.requirement || '';
            const stdDeadline = std.deadline ? String(std.deadline).substring(0, 10) : '2026-12-31';

            // Ambil data submission untuk standar ini
            const sub = chapterSubmissions[stdId] || 
                        chapterSubmissions[std.id] || 
                        Object.values(chapterSubmissions).find(s => String(s.standard_id) === stdId || String(s.id) === stdId);

            const statusUpper = sub ? String(sub.status || '').toUpperCase() : 'NOT_SUBMITTED';
            const isApproved = statusUpper === 'APPROVED';

            // Pengecekan Expired & Selisih Hari
            const statusInfo = typeof getDeadlineStatus === 'function' 
                ? getDeadlineStatus(stdDeadline) 
                : { isExpired: false, diffDays: 999 };
            
            const isExpired = statusInfo.isExpired;
            const diffDays = statusInfo.diffDays;

            // Format Teks Deadline dengan "xx days left"
            let deadlineTextHtml = '';
            if (isExpired) {
                deadlineTextHtml = `<span class="text-rose-600 font-bold">${stdDeadline} (Expired)</span>`;
            } else if (diffDays === 0) {
                deadlineTextHtml = `<span class="text-amber-600 font-bold">${stdDeadline} (Today)</span>`;
            } else if (diffDays < 999) {
                deadlineTextHtml = `<span class="text-slate-600">${stdDeadline} <strong class="text-blue-600">(${diffDays}d left)</strong></span>`;
            } else {
                deadlineTextHtml = `<span class="text-slate-600">${stdDeadline}</span>`;
            }

            // 1. Render Verification Status Badge
            let statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">Not Submitted</span>`;
            
            if (sub) {
                if (isApproved) {
                    statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap"><i class="fa-solid fa-circle-check mr-1"></i>Approved</span>`;
                } else if (statusUpper.includes('REVISION')) {
                    statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Revision Req.</span>`;
                } else if (statusUpper.includes('REJECT')) {
                    statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap"><i class="fa-solid fa-circle-xmark mr-1"></i>Rejected</span>`;
                } else {
                    statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap"><i class="fa-solid fa-clock mr-1"></i>Under Review</span>`;
                }
            } else if (isExpired) {
                statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300 whitespace-nowrap"><i class="fa-solid fa-lock mr-1"></i>Expired</span>`;
            }

            const earnedScore = isApproved ? (sub.score_earned || sub.score || maxScore) : 0;
            const safeName = stdName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            // 2. Render Action Button (whitespace-nowrap & shrink-0 dipasang agar selalu 1 baris)
            let actionBtnHtml = '';
            if (isApproved) {
                actionBtnHtml = `
                    <span class="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl inline-flex items-center gap-1 whitespace-nowrap">
                        <i class="fa-solid fa-circle-check"></i> Complete
                    </span>
                `;
            } else if (isExpired && !isAdmin) {
                actionBtnHtml = `
                    <button disabled class="px-3.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 font-bold rounded-xl text-xs cursor-not-allowed inline-flex items-center gap-1.5 whitespace-nowrap">
                        <i class="fa-solid fa-lock text-[10px]"></i> Locked
                    </button>
                `;
            } else {
                actionBtnHtml = `
                    <button onclick="openSubmissionModal('${stdId}', '${safeName}', '${stdDeadline}')" class="px-3.5 py-1.5 bg-jci-blue hover:bg-jci-navy text-white font-bold rounded-xl shadow-xs text-xs transition cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        <i class="fa-solid ${isExpired && isAdmin ? 'fa-key text-amber-300' : 'fa-pen-to-square'} mr-1"></i> 
                        ${isExpired && isAdmin ? 'Admin Submit' : (sub ? 'Edit Evidence' : 'Submit Evidence')}
                    </button>
                `;
            }

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3 px-3">
                        <div class="font-bold text-slate-900">${stdId}. ${stdName}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">${stdPurpose}</div>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                        <span class="text-[10px] font-extrabold text-jci-blue uppercase bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">${stdStar}</span>
                    </td>
                    <td class="py-3 px-3 text-[11px] font-medium whitespace-nowrap">
                        ${deadlineTextHtml}
                    </td>
                    <td class="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">${maxScore} pts</td>
                    <td class="py-3 px-3 font-extrabold whitespace-nowrap ${isApproved ? 'text-emerald-600' : 'text-slate-400'}">${earnedScore} pts</td>
                    <td class="py-3 px-3 whitespace-nowrap">${statusBadge}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                        ${actionBtnHtml}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5 mb-6">
                <div class="flex items-center justify-between border-b pb-3">
                    <h3 class="font-extrabold text-slate-900 text-sm flex items-center gap-2 uppercase">
                        <i class="fa-solid fa-star text-jci-gold"></i> ${cat} STAR STANDARDS
                    </h3>
                    <span class="text-xs bg-blue-50 text-jci-blue font-bold px-3 py-1 rounded-full">${grouped[cat].length} Standards</span>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 border-b text-[11px] font-bold text-slate-400 uppercase">
                                <th class="py-3 px-3">Standard & Purpose</th>
                                <th class="py-3 px-3">Star Category</th>
                                <th class="py-3 px-3">Deadline</th>
                                <th class="py-3 px-3">Weight Max</th>
                                <th class="py-3 px-3">Score Earned</th>
                                <th class="py-3 px-3">Verification Status</th>
                                <th class="py-3 px-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-xs">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Reset Input Pencarian
 */
export function resetSearchStandards() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderStandardsList(window.standardsData || [], window.chapterSubmissions || {});
}

/**
 * Buka Modal Submit Bukti
 */
export function openSubmissionModal(stdId, stdName, defaultDeadline) {
    const modal = document.getElementById('submissionModal');
    if (!modal) return;

    const modalStdId = document.getElementById('modalStdId');
    if (modalStdId) modalStdId.value = stdId;

    const modalTitle = document.getElementById('modalStdTitle') || 
                       document.querySelector('#submissionModal h3') || 
                       document.getElementById('mSubTitleHeader');
    if (modalTitle) modalTitle.textContent = `${stdId}. ${stdName}`;
    
    const existing = (window.chapterSubmissions || {})[stdId];
    let formattedDate = (existing && existing.deadline) ? existing.deadline.substring(0, 10) : (defaultDeadline || '2026-12-31');

    const titleInput = document.getElementById('modalSubTitle') || document.getElementById('mSubTitle');
    const descInput = document.getElementById('modalSubDesc') || document.getElementById('mSubDesc');
    const urlInput = document.getElementById('modalSubUrl') || document.getElementById('mSubUrl');
    const deadlineInput = document.getElementById('modalSubDeadline') || document.getElementById('mSubDeadline');

    if (existing) {
        if (titleInput) titleInput.value = existing.title || '';
        if (descInput) descInput.value = existing.description || '';
        if (urlInput) urlInput.value = existing.url || existing.evidence_url || '';
    } else {
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        if (urlInput) urlInput.value = '';
    }

    if (deadlineInput) {
        deadlineInput.value = formattedDate;
        deadlineInput.setAttribute('readonly', 'true');
        deadlineInput.classList.add('bg-slate-100', 'cursor-not-allowed');
    }

    const fileInput = document.getElementById('modalSubFile');
    if (fileInput) fileInput.value = '';

    const label = document.getElementById('fileSelectText');
    if (label) label.textContent = "Click or drag & drop file to upload";

    modal.classList.remove('hidden');
}

/**
 * Tutup Modal Submit Bukti
 */
export function closeSubmissionModal() {
    const modal = document.getElementById('submissionModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Handle Submit Form Bukti ke API
 */
export async function handleModalSubmit(e) {
    if (e) e.preventDefault();

    const submitBtn = document.querySelector('#submissionForm button[type="submit"]') || document.getElementById('modalSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Submitting...';
    }

    const stdId = document.getElementById('modalStdId')?.value;
    const title = (document.getElementById('modalSubTitle') || document.getElementById('mSubTitle'))?.value;
    const desc = (document.getElementById('modalSubDesc') || document.getElementById('mSubDesc'))?.value;
    const url = (document.getElementById('modalSubUrl') || document.getElementById('mSubUrl'))?.value;
    const fileInput = document.getElementById('modalSubFile');

    const formData = new FormData();
    formData.append('standard_id', stdId);
    formData.append('chapter_name', state?.currentChapter || localStorage.getItem('currentChapter') || 'Jakarta');
    formData.append('title', title);
    formData.append('description', desc);
    if (url) formData.append('evidence_url', url);
    if (fileInput && fileInput.files[0]) formData.append('file', fileInput.files[0]);

    try {
        const res = await fetchAPI('/submissions', { method: 'POST', body: formData });
        const result = await res.json();
        
        if (!res.ok) throw new Error(result.detail || "Gagal mengirim bukti");

        alert(result.message || "Bukti berhasil dikirim!");
        closeSubmissionModal();
        
        if (window.loadData) await window.loadData();
    } catch (err) {
        alert("Gagal kirim bukti: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Evidence';
        }
    }
}

/**
 * Update Label Input File saat Ada File Dipilih
 */
export function updateFileLabel(input) {
    const label = document.getElementById('fileSelectText');
    if (input.files && input.files[0]) {
        label.innerHTML = `<i class="fa-solid fa-file-pdf text-rose-500 mr-1"></i> ${input.files[0].name}`;
    } else {
        label.textContent = "Click or drag & drop file to upload";
    }
}

// Bind fungsi ke objek window
window.filterCategory = filterCategory;
window.resetSearchStandards = resetSearchStandards;
window.openSubmissionModal = openSubmissionModal;
window.closeSubmissionModal = closeSubmissionModal;
window.handleModalSubmit = handleModalSubmit;
window.updateFileLabel = updateFileLabel;