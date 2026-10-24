import { fetchAPI } from './api.js';
import { state } from './auth.js';

// Internal cache untuk mendukung modal edit, audit, dan template/schema KPI
let loadedChaptersCache = [];
let adminStandardsCache = [];
let currentSubmissionsCache = [];
let adminKpiSubmissionsCache = [];
let currentAuditFilter = 'ALL';
let kpiSchemaCache = [];

// ==========================================
// HELPER MODAL SAFE CLOSE & TOGGLE
// ==========================================
function safeCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function safeOpenModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        return true;
    }
    return false;
}

// ==========================================
// 0. SUB-TAB NAVIGATION FOR ADMIN/EVALUATOR
// ==========================================
export function switchAdminSubTab(subTabName) {
    document.querySelectorAll('.admin-subtab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-subtab-btn').forEach(btn => {
        btn.classList.remove('bg-jci-blue', 'text-white');
        btn.classList.add('text-slate-600');
    });

    const targetContent = document.getElementById(`admin-subtab-${subTabName}`);
    const targetBtn = document.getElementById(`subtab-btn-${subTabName}`);

    if (targetContent) targetContent.classList.remove('hidden');
    if (targetBtn) {
        targetBtn.classList.add('bg-jci-blue', 'text-white');
        targetBtn.classList.remove('text-slate-600');
    }

    if (subTabName === 'kpi-audit') {
        loadAdminKpiSubmissions();
    } else if (subTabName === 'kpi-template') {
        loadKpiTemplate();
    } else if (subTabName === 'handbooks') {
        loadHandbooks();
    } else if (subTabName === 'pending-users') {
        loadPendingUsers();
    }
}
window.switchAdminSubTab = switchAdminSubTab;

// ==========================================
// 1. CHAPTER ROSTER MANAGEMENT
// ==========================================
export function openAddChapterModal() {
    const nameEl = document.getElementById('mChapterName');
    const nvpEl = document.getElementById('mNvpName');
    if (nameEl) nameEl.value = '';
    if (nvpEl) nvpEl.value = '';

    const modalTitle = document.querySelector('#addChapterModal h3') || document.querySelector('#addChapterModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fa-solid fa-square-plus text-jci-blue mr-2"></i>Add New Local Chapter';
    }

    safeOpenModal('addChapterModal');
}

export function closeAddChapterModal() {
    safeCloseModal('addChapterModal');
}

export async function handleAddChapterForm(e) {
    if (e) e.preventDefault();
    const nameEl = document.getElementById('mChapterName');
    const nvpEl = document.getElementById('mNvpName');
    const name = nameEl ? nameEl.value.trim() : '';
    const nvp = nvpEl ? nvpEl.value.trim() : '';

    if (!name) return alert("Silakan masukkan nama Chapter baru!");

    const payload = { 
        name: name,
        chapter_name: name,
        nvp_name: nvp || "Unassigned" 
    };

    const endpointsToTry = [
        { url: '/chapters', method: 'POST' },
        { url: '/chapters/', method: 'POST' },
        { url: '/admin/chapters', method: 'POST' },
        { url: '/api/chapters', method: 'POST' }
    ];

    let success = false;
    let lastErrorMessage = "Method Not Allowed";

    for (const ep of endpointsToTry) {
        try {
            const res = await fetchAPI(ep.url, {
                method: ep.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const result = await res.json();
                alert(result.message || "Local Chapter berhasil ditambahkan!");
                closeAddChapterModal();

                await loadChapters();
                if (typeof window.loadData === 'function') {
                    await window.loadData();
                }
                success = true;
                break;
            } else if (res && res.status !== 405 && res.status !== 404) {
                const errJson = await res.json();
                lastErrorMessage = errJson.detail || errJson.message || lastErrorMessage;
                break;
            }
        } catch (err) {
            console.warn(`Attempt failed for ${ep.url}:`, err);
        }
    }

    if (!success) {
        alert("Gagal menambah chapter: " + lastErrorMessage);
    }
}

export function openEditChapterModal(chapName) {
    const chap = loadedChaptersCache.find(c => c.name === chapName);
    if (!chap) return alert("Data Chapter tidak ditemukan!");

    const oldNameEl = document.getElementById('mEditChapterOldName');
    const nameEl = document.getElementById('mEditChapterName');
    const nvpEl = document.getElementById('mEditNvpName');
    const picEmailEl = document.getElementById('mEditPicEmail');

    if (oldNameEl) oldNameEl.value = chap.name;
    if (nameEl) nameEl.value = chap.name;
    if (nvpEl) nvpEl.value = chap.nvp_name || '';
    if (picEmailEl) picEmailEl.value = chap.pic_email || '';

    safeOpenModal('editChapterModal');
}

export function closeEditChapterModal() {
    safeCloseModal('editChapterModal');
}

export async function handleEditChapterFormSubmit(e) {
    if (e) e.preventDefault();
    const oldName = document.getElementById('mEditChapterOldName').value;
    const newName = document.getElementById('mEditChapterName').value.trim();
    const nvpName = document.getElementById('mEditNvpName').value.trim();
    const picEmail = document.getElementById('mEditPicEmail') ? document.getElementById('mEditPicEmail').value.trim() : '';

    if (!newName) return alert("Nama Chapter tidak boleh kosong!");

    const payload = {
        name: newName,
        chapter_name: newName,
        nvp_name: nvpName || "Unassigned",
        pic_email: picEmail || ""
    };

    const endpointsToTry = [
        { url: `/chapters/${encodeURIComponent(oldName)}`, method: 'PUT' },
        { url: `/chapters/${encodeURIComponent(oldName)}/`, method: 'PUT' },
        { url: `/admin/chapters/${encodeURIComponent(oldName)}`, method: 'PUT' }
    ];

    let success = false;
    let lastErrorMessage = "Gagal memperbarui chapter";

    for (const ep of endpointsToTry) {
        try {
            const res = await fetchAPI(ep.url, {
                method: ep.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const result = await res.json();
                alert(result.message || "Data Chapter berhasil diperbarui!");
                closeEditChapterModal();

                await loadChapters();
                if (typeof window.loadData === 'function') {
                    await window.loadData();
                }
                success = true;
                break;
            } else if (res && res.status !== 405 && res.status !== 404) {
                const errJson = await res.json();
                lastErrorMessage = errJson.detail || errJson.message || lastErrorMessage;
                break;
            }
        } catch (err) {
            console.warn(`Attempt failed for ${ep.url}:`, err);
        }
    }

    if (!success) {
        alert("Gagal memperbarui chapter: " + lastErrorMessage);
    }
}

export async function loadChapters() {
    try {
        const res = await fetchAPI('/chapters');
        if (!res || !res.ok) {
            console.error("Gagal mengambil data /chapters:", res ? res.status : "No response");
            return;
        }

        loadedChaptersCache = await res.json();

        if (!Array.isArray(loadedChaptersCache)) {
            loadedChaptersCache = [];
        }

        const selectTop = document.getElementById('chapterSelect');
        const selectEval = document.getElementById('evalChapterSelect');
        const selectReg = document.getElementById('lRegChapterSelect');
        const evalChapterBadgeList = document.getElementById('evaluatorChapterList');

        const optionsHtml = loadedChaptersCache.map(c => `
            <option value="${c.name}" class="text-slate-900" ${c.name === state.currentChapter ? 'selected' : ''}>
                ${c.name}
            </option>
        `).join('');

        if (selectTop) selectTop.innerHTML = optionsHtml;
        if (selectEval) selectEval.innerHTML = optionsHtml;
        if (selectReg) selectReg.innerHTML = optionsHtml;

        if (evalChapterBadgeList) {
            if (loadedChaptersCache.length === 0) {
                evalChapterBadgeList.innerHTML = `
                    <div class="w-full p-8 text-center text-slate-400 italic bg-white rounded-2xl border border-slate-200 mt-4 shadow-2xs">
                        <i class="fa-solid fa-building-circle-exclamation text-2xl mb-2 text-slate-300 block"></i>
                        Belum ada Local Chapter yang terdaftar. Klik tombol <strong>+ Add Chapter</strong> di atas untuk menambahkan.
                    </div>`;
                return;
            }

            const rowsHtml = loadedChaptersCache.map(c => `
                <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td class="px-4 py-3.5 text-left font-bold text-slate-800 whitespace-nowrap">${c.name || '-'}</td>
                    <td class="px-4 py-3.5 text-left text-slate-700 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-bold text-xs">
                            <i class="fa-solid fa-user-tie text-[10px]"></i> ${c.nvp_name || 'Unassigned'}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-left text-slate-600 whitespace-nowrap font-medium">${c.pic_email || '-'}</td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            ${c.total_score ?? 0} pts
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                        ${(c.pending_reviews || 0) > 0 
                            ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">${c.pending_reviews} Pending</span>` 
                            : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">0</span>`}
                    </td>
                    <td class="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                        <button onclick="openEditChapterModal('${c.name}')" class="text-jci-blue hover:text-jci-navy p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Edit Chapter">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="handleDeleteChapter('${c.name}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" title="Delete Chapter">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            evalChapterBadgeList.innerHTML = `
                <div class="w-full block overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs bg-white mt-4">
                    <table class="w-full text-sm border-collapse">
                        <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                            <tr>
                                <th class="px-4 py-3 text-left">Local Chapter Name</th>
                                <th class="px-4 py-3 text-left">Assigned NVP</th>
                                <th class="px-4 py-3 text-left">Email PIC</th>
                                <th class="px-4 py-3 text-center">Score</th>
                                <th class="px-4 py-3 text-center">Pending Review</th>
                                <th class="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (err) {
        console.error("Gagal load chapters:", err);
    }
}

export async function handleDeleteChapter(chapName) {
    if (!confirm(`Apakah Anda yakin ingin menghapus chapter "${chapName}"?`)) return;

    try {
        const res = await fetchAPI(`/chapters/${encodeURIComponent(chapName)}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menghapus chapter");

        alert(result.message || "Chapter berhasil dihapus!");
        await loadChapters();
        if (typeof window.loadData === 'function') {
            await window.loadData();
        }
    } catch (err) {
        alert("Gagal menghapus chapter: " + err.message);
    }
}

window.openAddChapterModal = openAddChapterModal;
window.closeAddChapterModal = closeAddChapterModal;
window.handleAddChapterForm = handleAddChapterForm;
window.openEditChapterModal = openEditChapterModal;
window.closeEditChapterModal = closeEditChapterModal;
window.handleEditChapterFormSubmit = handleEditChapterFormSubmit;
window.handleDeleteChapter = handleDeleteChapter;

// ==========================================
// 2. STANDARDS (5-STAR) MANAGEMENT
// ==========================================
export function renderAdminStandardsList(standardsData = []) {
    adminStandardsCache = Array.isArray(standardsData) ? standardsData : [];
    const container = document.getElementById('evaluatorStandardsList') || document.getElementById('adminStandardsList');
    if (!container) return;

    if (adminStandardsCache.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 p-4 border border-slate-200 rounded-xl bg-white text-center">Belum ada standar yang terdaftar.</p>';
        return;
    }

    const grouped = adminStandardsCache.reduce((acc, std) => {
        let cat = std.star || std.star_category || std.category || 'OTHER';
        if (typeof cat === 'object' && cat !== null) cat = cat.value || cat.name || 'OTHER';
        cat = String(cat).toUpperCase();

        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(std);
        return acc;
    }, {});

    const categoryOrder = ['EFFICIENCY', 'NETWORK', 'EXPERIENCE', 'OUTREACH', 'IMPACT'];
    const allCategories = Array.from(new Set([...categoryOrder, ...Object.keys(grouped)]));

    container.innerHTML = allCategories.map(cat => {
        const list = grouped[cat];
        if (!list || list.length === 0) return '';

        const itemsHtml = list.map(std => {
            const stdId = std.id || std.standard_id || std.code;
            const stdName = std.name || std.title;
            const maxScore = std.max_score || std.weight || std.score || 10;
            return `
                <div class="flex items-center justify-between bg-slate-50 p-3 border border-slate-200 rounded-xl hover:bg-white transition">
                    <div>
                        <span class="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">${stdId}</span>
                        <h5 class="text-xs font-bold text-slate-800 mt-1">${stdName} (${maxScore} pts)</h5>
                        <p class="text-[11px] text-slate-500 line-clamp-1">${std.purpose || std.description || '-'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="openStandardModalForEdit('${stdId}')" class="text-jci-blue hover:text-jci-navy bg-blue-50 px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer" title="Edit Standard">
                            <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button onclick="handleDeleteStandard('${stdId}')" class="text-rose-500 hover:text-rose-700 bg-rose-50 p-1.5 rounded-lg transition cursor-pointer" title="Delete Standard">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="space-y-2">
                <div class="flex items-center space-x-2 border-b border-slate-100 pb-1">
                    <span class="w-2.5 h-2.5 rounded-full bg-jci-blue"></span>
                    <h5 class="font-extrabold text-xs text-slate-700 uppercase tracking-wider">${cat} STAR</h5>
                    <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">${list.length} Items</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${itemsHtml}</div>
            </div>
        `;
    }).join('');
}

export function openStandardModalForAdd() {
    if (document.getElementById('sFormMode')) document.getElementById('sFormMode').value = 'add';
    if (document.getElementById('stdModalTitle')) document.getElementById('stdModalTitle').textContent = 'Add New Standard';
    if (document.getElementById('sId')) {
        document.getElementById('sId').value = '';
        document.getElementById('sId').disabled = false;
    }
    if (document.getElementById('sName')) document.getElementById('sName').value = '';
    if (document.getElementById('sStar')) document.getElementById('sStar').value = 'EFFICIENCY';
    if (document.getElementById('sPurpose')) document.getElementById('sPurpose').value = '';
    if (document.getElementById('sScore')) document.getElementById('sScore').value = '10';
    if (document.getElementById('sDeadline')) document.getElementById('sDeadline').value = '2026-12-31';

    safeOpenModal('standardModal');
}

export function openStandardModalForEdit(stdId, standardsData = []) {
    const sourceList = (Array.isArray(standardsData) && standardsData.length > 0) ? standardsData : adminStandardsCache;
    const std = sourceList.find(s => String(s.id || s.standard_id || s.code) === String(stdId));
    if (!std) return alert("Data Standar tidak ditemukan!");

    if (document.getElementById('sFormMode')) document.getElementById('sFormMode').value = 'edit';
    if (document.getElementById('stdModalTitle')) document.getElementById('stdModalTitle').textContent = `Edit Standard: ${stdId}`;
    if (document.getElementById('sId')) {
        document.getElementById('sId').value = stdId;
        document.getElementById('sId').disabled = true;
    }
    if (document.getElementById('sName')) document.getElementById('sName').value = std.name || std.title || '';
    if (document.getElementById('sStar')) document.getElementById('sStar').value = String(std.star || std.star_category || std.category || 'EFFICIENCY').toUpperCase();
    if (document.getElementById('sPurpose')) document.getElementById('sPurpose').value = std.purpose || std.description || '';
    if (document.getElementById('sScore')) document.getElementById('sScore').value = std.max_score || std.weight || std.score || 10;
    if (document.getElementById('sDeadline')) document.getElementById('sDeadline').value = std.deadline ? String(std.deadline).substring(0, 10) : '2026-12-31';

    safeOpenModal('standardModal');
}

export function closeStandardModal() {
    safeCloseModal('standardModal');
}

export async function handleStandardFormSubmit(e) {
    if (e) e.preventDefault();

    const mode = document.getElementById('sFormMode') ? document.getElementById('sFormMode').value : 'add';
    const stdId = document.getElementById('sId') ? document.getElementById('sId').value.trim() : '';

    if (!stdId) return alert("Standard ID / Code wajib diisi!");

    const payload = {
        id: stdId,
        code: stdId,
        name: document.getElementById('sName') ? document.getElementById('sName').value.trim() : '',
        title: document.getElementById('sName') ? document.getElementById('sName').value.trim() : '',
        star: document.getElementById('sStar') ? document.getElementById('sStar').value : 'EFFICIENCY',
        star_category: document.getElementById('sStar') ? document.getElementById('sStar').value : 'EFFICIENCY',
        category: document.getElementById('sStar') ? document.getElementById('sStar').value : 'EFFICIENCY',
        purpose: document.getElementById('sPurpose') ? document.getElementById('sPurpose').value.trim() : '',
        description: document.getElementById('sPurpose') ? document.getElementById('sPurpose').value.trim() : '',
        requirement: document.getElementById('sPurpose') ? document.getElementById('sPurpose').value.trim() : '',
        evidence_guide: "Buku Panduan V1",
        max_score: parseInt((document.getElementById('sScore') ? document.getElementById('sScore').value : 10) || 10),
        weight: parseInt((document.getElementById('sScore') ? document.getElementById('sScore').value : 10) || 10),
        score: parseInt((document.getElementById('sScore') ? document.getElementById('sScore').value : 10) || 10),
        deadline: document.getElementById('sDeadline') ? document.getElementById('sDeadline').value : '2026-12-31'
    };

    const endpointsToTry = mode === 'edit' 
        ? [
            { url: `/standards/${encodeURIComponent(stdId)}`, method: 'PUT' },
            { url: `/standards/${encodeURIComponent(stdId)}/`, method: 'PUT' },
            { url: `/admin/standards/${encodeURIComponent(stdId)}`, method: 'PUT' }
          ]
        : [
            { url: '/standards', method: 'POST' },
            { url: '/standards/', method: 'POST' },
            { url: '/admin/standards', method: 'POST' },
            { url: '/api/standards', method: 'POST' }
          ];

    let success = false;
    let lastErrorMessage = "Gagal menyimpan standar. Periksa koneksi atau hak akses Admin.";

    for (const ep of endpointsToTry) {
        try {
            const res = await fetchAPI(ep.url, {
                method: ep.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const result = await res.json();
                alert(result.message || "Standard berhasil disimpan!");
                closeStandardModal();
                if (typeof window.loadData === 'function') {
                    await window.loadData();
                }
                success = true;
                break;
            } else if (res && res.status !== 405 && res.status !== 404) {
                const errJson = await res.json();
                lastErrorMessage = errJson.detail || errJson.message || lastErrorMessage;
                break;
            }
        } catch (err) {
            console.warn(`Attempt failed for ${ep.url}:`, err);
        }
    }

    if (!success) {
        alert("Error: " + lastErrorMessage);
    }
}

export async function handleDeleteStandard(stdId) {
    if (!confirm(`HAPUS STANDAR?\nApakah Anda yakin ingin menghapus standar [${stdId}]?`)) return;

    const endpointsToTry = [
        { url: `/standards/${encodeURIComponent(stdId)}`, method: 'DELETE' },
        { url: `/standards/${encodeURIComponent(stdId)}/`, method: 'DELETE' },
        { url: `/admin/standards/${encodeURIComponent(stdId)}`, method: 'DELETE' },
        { url: `/admin/standards/${encodeURIComponent(stdId)}/`, method: 'DELETE' }
    ];

    let success = false;
    let lastError = "Gagal menghapus standar (Not Found)";

    for (const ep of endpointsToTry) {
        try {
            const res = await fetchAPI(ep.url, { method: ep.method });
            if (res && res.ok) {
                const result = await res.json();
                alert(result.message || "Standard berhasil dihapus!");
                if (typeof window.loadData === 'function') {
                    await window.loadData();
                }
                success = true;
                break;
            } else if (res && res.status !== 404 && res.status !== 405) {
                const errJson = await res.json();
                lastError = errJson.detail || errJson.message || lastError;
                break;
            }
        } catch (err) {
            console.warn(`Delete attempt failed for ${ep.url}:`, err);
        }
    }

    if (!success) {
        alert("Error: " + lastError);
    }
}

window.openStandardModalForAdd = openStandardModalForAdd;
window.openStandardModalForEdit = openStandardModalForEdit;
window.closeStandardModal = closeStandardModal;
window.handleStandardFormSubmit = handleStandardFormSubmit;
window.handleDeleteStandard = handleDeleteStandard;

// ==========================================
// 3. AUDIT SUBMISSIONS (STANDARDS 5-STAR)
// ==========================================
export function filterAuditStatus(filterType) {
    currentAuditFilter = String(filterType).toUpperCase();

    document.querySelectorAll('.audit-filter-btn').forEach(btn => {
        const type = (btn.getAttribute('data-filter') || btn.textContent || '').trim().toUpperCase();
        if (type.includes(currentAuditFilter) || currentAuditFilter.includes(type)) {
            btn.className = "px-3.5 py-1.5 rounded-xl font-bold text-xs bg-jci-blue text-white shadow-xs transition cursor-pointer audit-filter-btn";
        } else {
            btn.className = "px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer audit-filter-btn";
        }
    });

    renderFilteredSubmissions();
}

export function renderEvaluatorPortal(chapterSubmissions = {}) {
    currentSubmissionsCache = Array.isArray(chapterSubmissions) 
        ? chapterSubmissions 
        : Object.values(chapterSubmissions);

    const pendingCount = currentSubmissionsCache.filter(s => {
        const st = (s.status || '').toLowerCase();
        return st === 'submitted' || st === 'pending' || st === 'pending review' || st === 'under review';
    }).length;

    const approvedCount = currentSubmissionsCache.filter(s => (s.status || '').toLowerCase() === 'approved').length;
    const revisionCount = currentSubmissionsCache.filter(s => (s.status || '').toLowerCase().includes('revision')).length;
    const rejectedCount = currentSubmissionsCache.filter(s => (s.status || '').toLowerCase().includes('reject')).length;

    const elPending = document.getElementById('auditCountPending');
    const elApproved = document.getElementById('auditCountApproved');
    const elRevision = document.getElementById('auditCountRevision');
    const elRejected = document.getElementById('auditCountRejected');

    if (elPending) elPending.textContent = pendingCount;
    if (elApproved) elApproved.textContent = approvedCount;
    if (elRevision) elRevision.textContent = revisionCount;
    if (elRejected) elRejected.textContent = rejectedCount;

    const auditBadge = document.getElementById('auditNotificationBadge');
    if (auditBadge) {
        if (pendingCount > 0) {
            auditBadge.textContent = `${pendingCount} New`;
            auditBadge.classList.remove('hidden');
        } else {
            auditBadge.classList.add('hidden');
        }
    }

    renderFilteredSubmissions();
}

export function renderFilteredSubmissions() {
    const container = document.getElementById('evaluatorSubmissionsList');
    if (!container) return;

    let filtered = currentSubmissionsCache;
    if (currentAuditFilter !== 'ALL') {
        filtered = currentSubmissionsCache.filter(s => {
            const st = (s.status || '').toLowerCase();
            if (currentAuditFilter === 'PENDING') return st === 'submitted' || st === 'pending' || st === 'under review' || st === 'pending review';
            if (currentAuditFilter === 'APPROVED') return st === 'approved';
            if (currentAuditFilter === 'REVISION') return st.includes('revision');
            if (currentAuditFilter === 'REJECTED') return st.includes('reject');
            return true;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">Tidak ada berkas submission yang cocok untuk kategori status ini.</div>`;
        return;
    }

    container.innerHTML = filtered.map(sub => {
        const stdId = sub.standard_id || sub.id || 'N/A';
        const subTitle = sub.title || sub.submission_title || stdId;
        const subDesc = sub.description || 'No description provided.';
        const subScore = sub.score_earned || sub.score || 0;
        const subStatus = sub.status || 'Pending';
        const evaluatorNotes = sub.evaluator_notes || sub.notes || '';
        const evidenceUrl = sub.url || sub.evidence_url || '';

        let badgeClass = 'bg-sky-100 text-sky-800 border-sky-300';
        if (subStatus.toUpperCase() === 'APPROVED') badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        if (subStatus.toUpperCase().includes('REVISION')) badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        if (subStatus.toUpperCase().includes('REJECT')) badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';

        const notesHtml = evaluatorNotes ? `
            <div class="mt-2 p-2.5 ${subStatus.toUpperCase().includes('REJECT') ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-amber-800 bg-amber-50 border-amber-200'} border rounded-xl text-xs">
                <strong>Evaluator Notes:</strong> ${evaluatorNotes}
            </div>
        ` : '';

        const linkHtml = evidenceUrl ? `
            <p class="text-xs text-blue-600 mt-1">
                <a href="${evidenceUrl}" target="_blank" class="hover:underline font-bold inline-flex items-center gap-1">
                    <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> ${evidenceUrl}
                </a>
            </p>
        ` : '';

        return `
            <div class="bg-white rounded-2xl border ${subStatus.toUpperCase().includes('REJECT') ? 'border-rose-200' : (subStatus.toUpperCase().includes('REVISION') ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200')} p-5 shadow-sm space-y-3">
                <div class="flex items-center justify-between">
                    <span class="px-3 py-1 rounded-lg bg-blue-50 text-jci-blue font-extrabold text-xs uppercase">${stdId}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}">${subStatus}</span>
                </div>

                <div>
                    <h4 class="font-extrabold text-slate-900 text-sm">${subTitle}</h4>
                    <p class="text-xs text-slate-500 mt-1"><strong>Description:</strong> ${subDesc}</p>
                    ${linkHtml}
                </div>

                ${notesHtml}

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-700">Awarded Score: <span class="text-jci-blue">${subScore} pts</span></span>

                    <div class="flex items-center gap-2">
                        <button onclick="deleteSubmission('${sub.id || stdId}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition cursor-pointer">
                            <i class="fa-solid fa-trash mr-1"></i> Delete
                        </button>
                        <button onclick="openAuditModal('${sub.id || stdId}')" class="px-3.5 py-1.5 bg-jci-blue hover:bg-jci-navy text-white font-bold rounded-xl text-xs transition cursor-pointer">
                            <i class="fa-solid fa-clipboard-check mr-1"></i> Audit Score & Notes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export async function deleteSubmission(submissionId) {
    if (!confirm("Apakah Anda yakin ingin menghapus submission ini? Action ini tidak bisa dibatalkan.")) return;

    const endpointsToTry = [
        { url: `/submissions/${encodeURIComponent(submissionId)}`, method: 'DELETE' },
        { url: `/submissions/${encodeURIComponent(submissionId)}/`, method: 'DELETE' },
        { url: `/admin/submissions/${encodeURIComponent(submissionId)}`, method: 'DELETE' }
    ];

    let success = false;
    let lastError = "Method Not Allowed";

    for (const ep of endpointsToTry) {
        try {
            const res = await fetchAPI(ep.url, { method: ep.method });
            if (res && res.ok) {
                alert("Submission berhasil dihapus!");
                if (window.loadData) await window.loadData();
                success = true;
                break;
            } else if (res && res.status !== 405 && res.status !== 404) {
                const err = await res.json().catch(() => ({}));
                lastError = err.detail || err.message || lastError;
                break;
            }
        } catch (err) {
            console.warn(`Delete attempt failed for ${ep.url}:`, err);
        }
    }

    if (!success) {
        alert(`Gagal menghapus: ${lastError}`);
    }
}

export function openAuditModal(subId, chapterSubmissions = {}) {
    if (typeof chapterSubmissions === 'object' && Object.keys(chapterSubmissions).length > 0) {
        currentSubmissionsCache = Array.isArray(chapterSubmissions) ? chapterSubmissions : Object.values(chapterSubmissions);
    }
    const sub = currentSubmissionsCache.find(s => String(s.id) === String(subId)) || (typeof subId === 'object' ? subId : null);
    if (!sub) return alert("Submission tidak ditemukan!");

    const std = adminStandardsCache.find(s => String(s.id || s.standard_id || s.code) === String(sub.standard_id));
    const maxScore = std ? (std.max_score || std.weight || std.score || 10) : 100;

    if (document.getElementById('auditSubId')) document.getElementById('auditSubId').value = sub.id || subId;
    if (document.getElementById('auditModalTitle')) document.getElementById('auditModalTitle').textContent = `[${sub.standard_id}] ${sub.title || sub.submission_title || sub.standard_id}`;
    if (document.getElementById('auditModalDesc')) document.getElementById('auditModalDesc').textContent = sub.description || 'Tidak ada deskripsi.';

    const scoreInput = document.getElementById('auditScore');
    if (scoreInput) {
        scoreInput.value = sub.score_earned || sub.score || 0;
        scoreInput.setAttribute('max', maxScore);
        scoreInput.setAttribute('data-max', maxScore);
    }

    const maxBadge = document.getElementById('auditScoreMaxLabel');
    if (maxBadge) maxBadge.textContent = `(Max Allowed: ${maxScore} pts)`;

    const urlContainer = document.getElementById('auditModalUrlContainer');
    if (urlContainer) {
        if (sub.url || sub.evidence_url) {
            const linkVal = sub.url || sub.evidence_url;
            urlContainer.innerHTML = `<a href="${linkVal}" target="_blank" class="text-jci-blue hover:underline text-xs font-bold"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Evidence Link</a>`;
        } else {
            urlContainer.innerHTML = `<span class="text-slate-400 italic text-xs">No URL provided</span>`;
        }
    }

    if (document.getElementById('auditStatus')) document.getElementById('auditStatus').value = sub.status === 'Approved' ? 'Approved' : (sub.status || 'Revision Requested');
    if (document.getElementById('auditNotes')) document.getElementById('auditNotes').value = sub.evaluator_notes || '';
    handleAuditStatusChange(document.getElementById('auditStatus') ? document.getElementById('auditStatus').value : 'Approved');

    safeOpenModal('auditModal');
}

export function closeAuditModal() {
    safeCloseModal('auditModal');
}

export function handleAuditStatusChange(status) {
    const scoreGroup = document.getElementById('auditScoreGroup');
    if (scoreGroup) {
        if (status === 'Approved') scoreGroup.classList.remove('hidden');
        else scoreGroup.classList.add('hidden');
    }
}

export async function handleAuditFormSubmit(e) {
    if (e) e.preventDefault();
    const subId = document.getElementById('auditSubId').value;
    const status = document.getElementById('auditStatus').value;
    const scoreInput = document.getElementById('auditScore');
    const score = status === 'Approved' ? parseInt(scoreInput.value || 0) : 0;
    const maxScoreAllowed = parseInt(scoreInput ? (scoreInput.getAttribute('data-max') || scoreInput.getAttribute('max') || 100) : 100);
    const notes = document.getElementById('auditNotes') ? document.getElementById('auditNotes').value.trim() : '';

    if (status === 'Approved' && score > maxScoreAllowed) {
        return alert(`Skor melebihi batas maksimal! Nilai maksimal standar ini adalah ${maxScoreAllowed} pts.`);
    }

    const endpointsToTry = [
        { url: `/submissions/audit/${subId}`, method: 'PUT' },
        { url: `/admin/verify/${subId}`, method: 'PUT' }
    ];

    let success = false;
    let lastError = "Gagal mengaudit submission";

    for (const ep of endpointsToTry) {
        try {
            const res = await fetchAPI(ep.url, {
                method: ep.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status, score: score, score_earned: score, evaluator_notes: notes })
            });
            if (res && res.ok) {
                const result = await res.json();
                alert(result.message || "Audit berhasil disimpan!");
                closeAuditModal();
                if (typeof window.loadData === 'function') window.loadData();
                success = true;
                break;
            }
        } catch (err) {
            console.warn(`Audit attempt failed for ${ep.url}:`, err);
        }
    }

    if (!success) {
        alert("Error: " + lastError);
    }
}

window.filterAuditStatus = filterAuditStatus;
window.renderEvaluatorPortal = renderEvaluatorPortal;
window.renderFilteredSubmissions = renderFilteredSubmissions;
window.deleteSubmission = deleteSubmission;
window.openAuditModal = openAuditModal;
window.closeAuditModal = closeAuditModal;
window.handleAuditStatusChange = handleAuditStatusChange;
window.handleAuditFormSubmit = handleAuditFormSubmit;

// ==========================================
// 4. DYNAMIC KPI SCHEMA & FIELD MANAGEMENT
// ==========================================
export async function loadKpiSchema() {
    try {
        const res = await fetchAPI('/kpi/schema');
        if (res && res.ok) {
            kpiSchemaCache = await res.json();
        } else {
            const fallbackRes = await fetchAPI('/kpi/template');
            if (fallbackRes && fallbackRes.ok) kpiSchemaCache = await fallbackRes.json();
        }
        renderKpiTemplateAdmin();
    } catch (err) {
        console.error("Gagal memuat skema KPI:", err);
    }
}

export const loadKpiTemplate = loadKpiSchema;

export function renderKpiTemplateAdmin() {
    const container = document.getElementById('evaluatorKpiTemplateList');
    if (!container) return;

    if (!Array.isArray(kpiSchemaCache) || kpiSchemaCache.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p>Belum ada Tab Sheet KPI yang dikonfigurasi.</p>
                <button onclick="openTabEditorModal()" class="px-4 py-2 bg-jci-blue text-white rounded-lg font-bold hover:bg-jci-navy transition cursor-pointer">
                    <i class="fa-solid fa-folder-plus mr-1"></i> Tambah Tab Sheet Pertama
                </button>
            </div>`;
        return;
    }

    if (kpiSchemaCache[0] && kpiSchemaCache[0].fields !== undefined) {
        const tabsHtml = kpiSchemaCache.map(tab => {
            const fieldsHtml = (tab.fields || []).map(field => {
                const optionsBadge = (field.options && field.options.length > 0)
                    ? field.options.map(o => `<span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">${o.label} (${o.score} pts)</span>`).join(' ')
                    : '<span class="text-slate-400 italic text-[10px]">Input Direct Text / Score</span>';

                const fieldDescHtml = field.description 
                    ? `<p class="text-xs text-slate-500 mt-0.5">${field.description}</p>` 
                    : '';

                return `
                    <div class="bg-slate-50 p-3.5 border border-slate-200 rounded-xl hover:bg-white transition flex items-center justify-between">
                        <div class="space-y-1">
                            <div class="flex items-center space-x-2">
                                <span class="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">${field.key}</span>
                                <h5 class="text-xs font-bold text-slate-800">${field.label}</h5>
                                <span class="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase font-bold">${field.type || 'Input'}</span>
                            </div>
                            ${fieldDescHtml}
                            <div class="pt-1 flex flex-wrap gap-1">${optionsBadge}</div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="openEditKpiFieldModal('${tab.id}', '${field.key}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-jci-blue rounded-lg font-bold text-xs transition cursor-pointer">
                                <i class="fa-solid fa-pen-to-square mr-1"></i> Edit Field
                            </button>
                            <button onclick="handleDeleteKpiField('${tab.id}', '${field.key}')" class="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer" title="Hapus Field">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="space-y-3 border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 rounded-full bg-jci-blue"></span>
                            <h4 class="font-extrabold text-xs text-slate-800 uppercase tracking-wider">${tab.title || tab.id}</h4>
                            <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full">${(tab.fields || []).length} Kriteria</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="openAddKpiFieldModal('${tab.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition cursor-pointer">
                                <i class="fa-solid fa-plus mr-1"></i> Tambah Field Baru
                            </button>
                            <button onclick="openTabEditorModal('${tab.id}')" class="p-1.5 text-jci-blue hover:bg-blue-50 rounded-lg transition cursor-pointer" title="Edit Judul Tab">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="handleDeleteTab('${tab.id}')" class="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer" title="Hapus Tab Sheet">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                    <div class="space-y-2 pt-1">${fieldsHtml || '<div class="text-xs text-slate-400 italic p-3 text-center">Belum ada field kriteria.</div>'}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold text-xs text-slate-700">Daftar Tab Sheets & Kriteria Formulir Self-Assessment</h4>
                <button onclick="openTabEditorModal()" class="px-3.5 py-1.5 bg-jci-blue hover:bg-jci-navy text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-xs">
                    <i class="fa-solid fa-folder-plus mr-1.5"></i> Tambah Tab Sheet Baru
                </button>
            </div>
            <div class="space-y-4">${tabsHtml}</div>
        `;
    }
}

export function openTabEditorModal(tabId = null) {
    if (tabId) {
        const tab = kpiSchemaCache.find(t => String(t.id) === String(tabId));
        if (!tab) return;
        if (document.getElementById('tabModalTitle')) document.getElementById('tabModalTitle').textContent = `Edit Tab Sheet: ${tab.title || tab.id}`;
        if (document.getElementById('mTabOldId')) document.getElementById('mTabOldId').value = tab.id;
        if (document.getElementById('mTabId')) document.getElementById('mTabId').value = tab.id;
        if (document.getElementById('mTabTitle')) document.getElementById('mTabTitle').value = tab.title || tab.id;
        if (document.getElementById('mTabOrder')) document.getElementById('mTabOrder').value = tab.order || 1;
    } else {
        if (document.getElementById('tabModalTitle')) document.getElementById('tabModalTitle').textContent = 'Tambah Tab Sheet Baru';
        if (document.getElementById('mTabOldId')) document.getElementById('mTabOldId').value = '';
        if (document.getElementById('mTabId')) document.getElementById('mTabId').value = `tab_${Date.now()}`;
        if (document.getElementById('mTabTitle')) document.getElementById('mTabTitle').value = '';
        if (document.getElementById('mTabOrder')) document.getElementById('mTabOrder').value = kpiSchemaCache.length + 1;
    }

    safeOpenModal('tabEditorModal');
}

export function closeTabEditorModal() {
    safeCloseModal('tabEditorModal');
}

export async function handleSaveTabSubmit(e) {
    if (e) e.preventDefault();
    const oldId = document.getElementById('mTabOldId') ? document.getElementById('mTabOldId').value : '';
    const tabId = document.getElementById('mTabId') ? document.getElementById('mTabId').value.trim() : `tab_${Date.now()}`;
    const title = document.getElementById('mTabTitle') ? document.getElementById('mTabTitle').value.trim() : 'Tab Baru';
    const order = parseInt((document.getElementById('mTabOrder') ? document.getElementById('mTabOrder').value : 1) || 1);

    if (oldId) {
        const tab = kpiSchemaCache.find(t => String(t.id) === String(oldId));
        if (tab) { tab.id = tabId; tab.title = title; tab.order = order; }
    } else {
        kpiSchemaCache.push({ id: tabId, title: title, order: order, fields: [] });
    }

    await saveKpiSchemaToServer();
    closeTabEditorModal();
}

export async function handleDeleteTab(tabId) {
    if (!confirm(`Hapus seluruh Tab Sheet [${tabId}]?`)) return;
    kpiSchemaCache = kpiSchemaCache.filter(t => String(t.id) !== String(tabId));
    await saveKpiSchemaToServer();
}

export function toggleOptionScoringSection() {
    const type = document.getElementById('mFieldType') ? document.getElementById('mFieldType').value : '';
    const section = document.getElementById('optionsSection');
    if (section) {
        if (type === 'select') section.classList.remove('hidden');
        else section.classList.add('hidden');
    }
}

export function addOptionRow(label = '', score = 0) {
    const list = document.getElementById('optionsList');
    if (!list) return;

    const rowId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200';
    div.id = rowId;
    div.innerHTML = `
        <input type="text" placeholder="Label Opsi Pilihan" value="${label}" class="opt-label w-2/3 bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800">
        <input type="number" placeholder="Pts" value="${score}" class="opt-score w-1/3 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-emerald-700">
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-rose-500 hover:text-rose-700 p-1"><i class="fa-solid fa-trash-can"></i></button>
    `;
    list.appendChild(div);
}

export function openAddKpiFieldModal(tabId) {
    let targetTab = tabId || (kpiSchemaCache[0] ? kpiSchemaCache[0].id : '');

    const tabIdEl = document.getElementById('editorTabId');
    if (tabIdEl) tabIdEl.value = targetTab;

    const oldKeyEl = document.getElementById('editorOldFieldKey');
    if (oldKeyEl) oldKeyEl.value = '';

    const keyEl = document.getElementById('mFieldKey') || document.getElementById('mKpiFieldKey');
    if (keyEl) { keyEl.value = `field_${Date.now()}`; keyEl.disabled = false; }

    const labelEl = document.getElementById('mFieldLabel') || document.getElementById('mKpiFieldLabel');
    if (labelEl) labelEl.value = '';

    const typeEl = document.getElementById('mFieldType');
    if (typeEl) typeEl.value = 'select';

    const maxScoreEl = document.getElementById('mFieldMaxScore') || document.getElementById('mKpiFieldMaxPoints');
    if (maxScoreEl) maxScoreEl.value = '25';

    const descEl = document.getElementById('mFieldDesc') || document.getElementById('mKpiFieldDesc');
    if (descEl) descEl.value = '';

    const optionsList = document.getElementById('optionsList');
    if (optionsList) optionsList.innerHTML = '';

    toggleOptionScoringSection();

    const targetModal = document.getElementById('fieldEditorModal') || document.getElementById('editKpiFieldModal');
    if (targetModal) safeOpenModal(targetModal.id);
    else alert("Modal editor field KPI tidak ditemukan di HTML!");
}

export function openEditKpiFieldModal(tabId, fieldKey) {
    let field = null;
    let targetTabId = tabId;

    if (tabId) {
        const tab = kpiSchemaCache.find(t => String(t.id) === String(tabId));
        if (tab) field = (tab.fields || []).find(f => String(f.key) === String(fieldKey));
    } else {
        for (const t of kpiSchemaCache) {
            const f = (t.fields || []).find(x => String(x.key) === String(fieldKey));
            if (f) { field = f; targetTabId = t.id; break; }
        }
    }

    if (!field) return alert("Field KPI tidak ditemukan!");

    const tabIdEl = document.getElementById('editorTabId');
    if (tabIdEl) tabIdEl.value = targetTabId || '';

    const oldKeyEl = document.getElementById('editorOldFieldKey');
    if (oldKeyEl) oldKeyEl.value = field.key;

    const keyEl = document.getElementById('mFieldKey') || document.getElementById('mKpiFieldKey');
    if (keyEl) { keyEl.value = field.key; keyEl.disabled = true; }

    const labelEl = document.getElementById('mFieldLabel') || document.getElementById('mKpiFieldLabel');
    if (labelEl) labelEl.value = field.label || '';

    const maxScoreEl = document.getElementById('mFieldMaxScore') || document.getElementById('mKpiFieldMaxPoints');
    if (maxScoreEl) maxScoreEl.value = field.max_score || field.max_points || 25;

    const descEl = document.getElementById('mFieldDesc') || document.getElementById('mKpiFieldDesc');
    if (descEl) descEl.value = field.description || '';

    const typeEl = document.getElementById('mFieldType');
    if (typeEl) typeEl.value = field.type || 'select';

    const list = document.getElementById('optionsList');
    if (list) {
        list.innerHTML = '';
        if (field.options && Array.isArray(field.options)) {
            field.options.forEach(opt => addOptionRow(opt.label, opt.score));
        }
    }

    toggleOptionScoringSection();
    const targetModal = document.getElementById('fieldEditorModal') || document.getElementById('editKpiFieldModal');
    if (targetModal) safeOpenModal(targetModal.id);
}

export function closeFieldEditorModal() {
    const modal = document.getElementById('fieldEditorModal') || document.getElementById('editKpiFieldModal');
    if (modal) safeCloseModal(modal.id);
}
export const closeEditKpiFieldModal = closeFieldEditorModal;

export async function handleSaveFieldSubmit(e) {
    if (e) e.preventDefault();

    const tabId = document.getElementById('editorTabId') ? document.getElementById('editorTabId').value : null;
    const oldKey = document.getElementById('editorOldFieldKey') ? document.getElementById('editorOldFieldKey').value : '';

    const keyEl = document.getElementById('mFieldKey') || document.getElementById('mKpiFieldKey');
    const key = keyEl ? keyEl.value.trim() : `field_${Date.now()}`;

    const labelEl = document.getElementById('mFieldLabel') || document.getElementById('mKpiFieldLabel');
    const label = labelEl ? labelEl.value.trim() : '';

    if (!label) return alert("Label Kriteria tidak boleh kosong!");

    const type = document.getElementById('mFieldType') ? document.getElementById('mFieldType').value : 'select';
    const maxScoreEl = document.getElementById('mFieldMaxScore') || document.getElementById('mKpiFieldMaxPoints');
    const maxScore = parseInt((maxScoreEl ? maxScoreEl.value : 0) || 25);

    const descEl = document.getElementById('mFieldDesc') || document.getElementById('mKpiFieldDesc');
    const desc = descEl ? descEl.value.trim() : '';

    let options = [];
    if (type === 'select' && document.querySelectorAll('#optionsList > div').length > 0) {
        document.querySelectorAll('#optionsList > div').forEach(row => {
            const l = row.querySelector('.opt-label') ? row.querySelector('.opt-label').value.trim() : '';
            const s = parseInt((row.querySelector('.opt-score') ? row.querySelector('.opt-score').value : 0) || 0);
            if (l) options.push({ label: l, score: s });
        });
    }

    const fieldData = { key, label, type, max_score: maxScore, description: desc, options };

    let targetTab = kpiSchemaCache.find(t => String(t.id) === String(tabId));
    if (!targetTab && kpiSchemaCache.length > 0) {
        targetTab = kpiSchemaCache[0];
    }

    if (!targetTab) return alert("Tab Sheet tidak ditemukan!");

    if (!targetTab.fields) targetTab.fields = [];

    if (oldKey) {
        const idx = targetTab.fields.findIndex(f => String(f.key) === String(oldKey));
        if (idx !== -1) {
            targetTab.fields[idx] = fieldData;
        } else {
            targetTab.fields.push(fieldData);
        }
    } else {
        targetTab.fields.push(fieldData);
    }

    await saveKpiSchemaToServer();
    closeFieldEditorModal();
}
export const handleSaveKpiFieldSubmit = handleSaveFieldSubmit;

export async function handleDeleteKpiField(tabId, fieldKey) {
    if (!confirm(`Hapus kriteria [${fieldKey}]?`)) return;

    let tab = kpiSchemaCache.find(t => String(t.id) === String(tabId));
    if (!tab) {
        tab = kpiSchemaCache.find(t => (t.fields || []).some(f => String(f.key) === String(fieldKey)));
    }

    if (tab && tab.fields) {
        tab.fields = tab.fields.filter(f => String(f.key) !== String(fieldKey));
        await saveKpiSchemaToServer();
    }
}

async function saveKpiSchemaToServer() {
    const endpointsToTry = [
        { url: '/kpi/schema', body: JSON.stringify(kpiSchemaCache) },
        { url: '/kpi/schema', body: JSON.stringify({ schema: kpiSchemaCache }) },
        { url: '/kpi/template', body: JSON.stringify(kpiSchemaCache) },
        { url: '/admin/kpi/schema', body: JSON.stringify(kpiSchemaCache) }
    ];

    let success = false;
    let lastError = "Gagal menyimpan skema";

    for (const ep of endpointsToTry) {
        try {
            const res = await fetchAPI(ep.url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: ep.body
            });

            if (res && res.ok) {
                alert("Struktur Form KPI berhasil disimpan!");
                renderKpiTemplateAdmin();
                success = true;
                break;
            } else if (res && res.status !== 404 && res.status !== 405) {
                const errJson = await res.json().catch(() => ({}));
                lastError = errJson.detail || errJson.message || lastError;
            }
        } catch (err) {
            console.warn(`Attempt failed for ${ep.url}:`, err);
        }
    }

    if (!success) {
        alert("Error: " + lastError);
    }
}

window.loadKpiTemplate = loadKpiTemplate;
window.openTabEditorModal = openTabEditorModal;
window.closeTabEditorModal = closeTabEditorModal;
window.handleSaveTabSubmit = handleSaveTabSubmit;
window.handleDeleteTab = handleDeleteTab;
window.toggleOptionScoringSection = toggleOptionScoringSection;
window.addOptionRow = addOptionRow;
window.openAddKpiFieldModal = openAddKpiFieldModal;
window.openEditKpiFieldModal = openEditKpiFieldModal;
window.closeFieldEditorModal = closeFieldEditorModal;
window.closeEditKpiFieldModal = closeEditKpiFieldModal;
window.handleSaveFieldSubmit = handleSaveFieldSubmit;
window.handleSaveKpiFieldSubmit = handleSaveFieldSubmit;
window.handleDeleteKpiField = handleDeleteKpiField;

// ==========================================
// 5. ENHANCED AUDIT KPI WITH TABS & PER-ITEM GRADING
// ==========================================
export async function loadAdminKpiSubmissions() {
    try {
        const res = await fetchAPI('/kpi/admin/submissions');
        if (!res || !res.ok) return;

        adminKpiSubmissionsCache = await res.json();
        const container = document.getElementById('evaluatorKpiSubmissionsList');
        if (!container) return;

        if (!Array.isArray(adminKpiSubmissionsCache) || adminKpiSubmissionsCache.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">Belum ada pengajuan KPI Self-Assessment dari Chapter.</div>`;
            return;
        }

        container.innerHTML = adminKpiSubmissionsCache.map(sub => {
            let statusBadgeClass = 'bg-slate-100 text-slate-700 border border-slate-300';
            if (sub.status === 'OK / Approved') statusBadgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
            else if (sub.status === 'Needs Clarification') statusBadgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
            else if (sub.status === 'Rejected') statusBadgeClass = 'bg-rose-100 text-rose-800 border border-rose-300';
            else if (sub.status === 'Submitted') statusBadgeClass = 'bg-blue-100 text-blue-800 border border-blue-300';

            const submittedDate = sub.submitted_at 
                ? new Date(sub.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                : '-';

            return `
                <div class="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-xl hover:shadow-xs transition">
                    <div class="space-y-1">
                        <div class="flex items-center space-x-2">
                            <span class="font-extrabold text-slate-900 text-sm">${sub.chapter_name}</span>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass}">${sub.status}</span>
                        </div>
                        <p class="text-xs text-slate-500">Tahun: <strong>${sub.year || 2026}</strong> • Terakhir diperbarui: ${submittedDate}</p>
                        ${sub.evaluator_feedback ? `<p class="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded mt-1"><strong>Catatan Evaluator:</strong> \${sub.evaluator_feedback}</p>` : ''}
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="text-right">
                            <span class="text-[10px] text-slate-400 font-bold block uppercase">Nilai Evaluator</span>
                            <span class="text-base font-black text-emerald-700">${sub.evaluator_score || 0} pts</span>
                        </div>
                        <button onclick="openKpiAuditModal(${sub.id})" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                            <i class="fa-solid fa-clipboard-check"></i> Audit KPI
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Gagal memuat data KPI Submissions:", err);
    }
}

export async function openKpiAuditModal(subId) {
    const sub = adminKpiSubmissionsCache.find(s => s.id === subId);
    if (!sub) return alert("Data pengajuan tidak ditemukan!");

    if (document.getElementById('kpiAuditSubId')) document.getElementById('kpiAuditSubId').value = sub.id;
    if (document.getElementById('kpiAuditChapterSubtitle')) document.getElementById('kpiAuditChapterSubtitle').textContent = `Chapter: ${sub.chapter_name} (Tahun ${sub.year || 2026})`;
    if (document.getElementById('kpiAuditStatus')) document.getElementById('kpiAuditStatus').value = sub.status || 'OK / Approved';
    if (document.getElementById('kpiAuditFeedback')) document.getElementById('kpiAuditFeedback').value = sub.evaluator_feedback || '';

    const summaryContainer = document.getElementById('kpiAuditSummaryContainer');
    if (!summaryContainer) return;

    // 1. Dapatkan Skema KPI Asli secara Dinamis
    if (!kpiSchemaCache || kpiSchemaCache.length === 0) {
        try {
            const res = await fetchAPI('/kpi/schema');
            if (res && res.ok) kpiSchemaCache = await res.json();
        } catch(e) { console.error("Gagal load schema:", e); }
    }

    const schema = kpiSchemaCache && kpiSchemaCache.length > 0 ? kpiSchemaCache : [];

    if (schema.length === 0) {
        summaryContainer.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Belum ada skema tab KPI terdaftar di sistem.</div>`;
        safeOpenModal('kpiAuditModal');
        return;
    }

    // 2. Parse Data Pengajuan Chapter
    let rawData = sub.form_data || sub.membership_data || {};
    if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch(e) { rawData = {}; }
    }

    // 3. Render SEMUA Tab Header Tanpa Batasan (Berdasarkan jumlah tab aktual di kpiSchemaCache)
    const tabsHeaderHtml = schema.map((tab, idx) => `
        <button type="button" 
                onclick="switchKpiAuditTab('audit_tab_${idx}')" 
                id="kpi-audit-btn-audit_tab_${idx}" 
                class="kpi-audit-tab-btn px-3 py-1.5 rounded-lg font-bold text-xs border transition whitespace-nowrap ${idx === 0 ? 'bg-jci-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            ${tab.title || `Aspect #\${idx+1}`}
        </button>
    `).join('');

    // 4. Render Konten Kriteria per Tab
    const tabsContentHtml = schema.map((tab, idx) => {
        const fields = tab.fields || [];
        const fieldsHtml = fields.length > 0 ? fields.map(field => {
            const userVal = rawData[field.key] !== undefined ? rawData[field.key] : '-';
            const itemScore = calculateItemScore(field, userVal);

            return `
                <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div class="flex items-start justify-between">
                        <div>
                            <span class="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">${field.key}</span>
                            <h6 class="text-xs font-bold text-slate-800 mt-1">${field.label}</h6>
                            ${field.description ? `<p class="text-[11px] text-slate-500">\${field.description}</p>` : ''}
                        </div>
                        <span class="text-xs font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                            Max: ${field.max_score || 25} pts
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-100 items-center">
                        <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span class="text-[10px] font-bold text-slate-400 block uppercase">Jawaban / Output Chapter:</span>
                            <span class="text-xs font-semibold text-slate-800">${userVal}</span>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-500 block uppercase mb-1">Poin Diberikan (Audit):</label>
                            <input type="number" 
                                   name="score_${field.key}" 
                                   data-max="${field.max_score || 25}" 
                                   value="${itemScore}" 
                                   onchange="recalculateTotalKpiAuditScore()" 
                                   class="kpi-item-score-input w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500">
                        </div>
                    </div>
                </div>
            `;
        }).join('') : `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">
                Belum ada kriteria terdaftar pada aspek ini.
            </div>
        `;

        return `
            <div id="kpi-audit-panel-audit_tab_${idx}" class="kpi-audit-tab-panel space-y-3 ${idx === 0 ? '' : 'hidden'}">
                ${fieldsHtml}
            </div>
        `;
    }).join('');

    summaryContainer.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-200">
                ${tabsHeaderHtml}
            </div>
            <div class="pt-1 max-h-80 overflow-y-auto pr-1">
                ${tabsContentHtml}
            </div>
        </div>
    `;

    recalculateTotalKpiAuditScore();
    safeOpenModal('kpiAuditModal');
}

function calculateItemScore(field, userVal) {
    if (userVal === '-' || userVal === '' || userVal === null) return 0;
    if (field.type === 'select' && field.options) {
        const found = field.options.find(o => String(o.label) === String(userVal));
        if (found) return parseInt(found.score || 0);
    }
    const parsed = parseInt(userVal);
    return isNaN(parsed) ? 0 : Math.min(parsed, field.max_score || 25);
}

export function recalculateTotalKpiAuditScore() {
    let total = 0;
    document.querySelectorAll('.kpi-item-score-input').forEach(input => {
        const max = parseInt(input.getAttribute('data-max') || 25);
        let val = parseInt(input.value || 0);
        if (val > max) {
            val = max;
            input.value = max;
        }
        total += Math.max(0, val);
    });

    const scoreEl = document.getElementById('kpiAuditScore');
    if (scoreEl) scoreEl.value = total;
}
window.recalculateTotalKpiAuditScore = recalculateTotalKpiAuditScore;

export function switchKpiAuditTab(tabKey) {
    document.querySelectorAll('.kpi-audit-tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.kpi-audit-tab-btn').forEach(btn => {
        btn.classList.remove('bg-jci-blue', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-600');
    });

    const activePanel = document.getElementById(`kpi-audit-panel-${tabKey}`);
    const activeBtn = document.getElementById(`kpi-audit-btn-${tabKey}`);

    if (activePanel) activePanel.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.add('bg-jci-blue', 'text-white');
        activeBtn.classList.remove('bg-slate-100', 'text-slate-600');
    }
}
window.switchKpiAuditTab = switchKpiAuditTab;

export function closeKpiAuditModal() {
    safeCloseModal('kpiAuditModal');
}

export async function handleKpiAuditSubmit(e) {
    if (e) e.preventDefault();
    const subId = document.getElementById('kpiAuditSubId').value;
    const score = parseInt(document.getElementById('kpiAuditScore').value || 0);
    const status = document.getElementById('kpiAuditStatus').value;
    const feedback = document.getElementById('kpiAuditFeedback').value.trim();

    try {
        const res = await fetchAPI(`/kpi/admin/${subId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                evaluator_score: score,
                status: status,
                evaluator_feedback: feedback
            })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menyimpan evaluasi");

        alert("Hasil audit KPI berhasil disimpan!");
        closeKpiAuditModal();
        loadAdminKpiSubmissions();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

window.loadAdminKpiSubmissions = loadAdminKpiSubmissions;
window.openKpiAuditModal = openKpiAuditModal;
window.closeKpiAuditModal = closeKpiAuditModal;
window.handleKpiAuditSubmit = handleKpiAuditSubmit;

// ==========================================
// 6. PENDING USERS MANAGEMENT
// ==========================================
export async function loadPendingUsers() {
    try {
        const res = await fetchAPI('/admin/pending-users');
        if (!res.ok) return;
        const pending = await res.json();

        const badge = document.getElementById('pendingUsersBadge');
        if (badge) {
            if (Array.isArray(pending) && pending.length > 0) {
                badge.textContent = pending.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const container = document.getElementById('pendingUsersList');
        if (!container) return;

        if (!Array.isArray(pending) || pending.length === 0) {
            container.innerHTML = `<p class="text-slate-400 italic text-xs">Tidak ada pendaftaran PIC yang tertunda.</p>`;
            return;
        }

        container.innerHTML = pending.map(u => `
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                    <span class="font-bold text-slate-800 text-xs">${u.full_name} (${u.email})</span>
                    <p class="text-[10px] text-slate-500">Chapter: ${u.chapter_name}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="approveUserAction(${u.id}, 'approve')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] transition cursor-pointer">Approve</button>
                    <button onclick="approveUserAction(${u.id}, 'reject')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] transition cursor-pointer">Reject</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Gagal load pending users:", err);
    }
}

export async function approveUserAction(userId, action) {
    try {
        const res = await fetchAPI(`/admin/approve-user/${userId}?action=${action}`, { method: 'PUT' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal memproses user");

        alert(result.message || "Aksi user berhasil diproses!");
        loadPendingUsers();
    } catch (err) {
        alert("Gagal memproses user: " + err.message);
    }
}

window.loadPendingUsers = loadPendingUsers;
window.approveUserAction = approveUserAction;

// ==========================================
// 7. HANDBOOK / REFERENCE MANAGEMENT (CONNECTED TO REFERENCE TAB)
// ==========================================
export function openAddHandbookModal() {
    if (document.getElementById('mDocTitle')) document.getElementById('mDocTitle').value = '';
    if (document.getElementById('mDocCategory')) document.getElementById('mDocCategory').value = 'Handbook';
    if (document.getElementById('mDocFile')) document.getElementById('mDocFile').value = '';
    if (document.getElementById('mDocUrl')) document.getElementById('mDocUrl').value = '';
    if (document.getElementById('mDocDesc')) document.getElementById('mDocDesc').value = '';
    safeOpenModal('addHandbookModal');
}

export function closeAddHandbookModal() {
    safeCloseModal('addHandbookModal');
}

export async function handleAddHandbookSubmit(e) {
    if (e) e.preventDefault();

    const title = document.getElementById('mDocTitle').value.trim();
    const category = document.getElementById('mDocCategory').value;
    const fileInput = document.getElementById('mDocFile');
    const urlInput = document.getElementById('mDocUrl').value.trim();
    const description = document.getElementById('mDocDesc').value.trim();

    if (!fileInput.files[0] && !urlInput) {
        return alert("Silakan unggah dokumen berkas ATAU isi File URL / Link Drive!");
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('file_url', urlInput);

    if (fileInput.files[0]) {
        formData.append('file', fileInput.files[0]);
    }

    try {
        const res = await fetchAPI('/admin/handbooks', {
            method: 'POST',
            body: formData
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menyimpan dokumen");

        alert("Handbook reference berhasil ditambahkan!");
        closeAddHandbookModal();
        await loadHandbooks();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

export async function loadHandbooks() {
    try {
        let res = await fetchAPI('/handbooks');
        if (!res || !res.ok) {
            res = await fetchAPI('/admin/handbooks');
        }
        if (!res || !res.ok) return;

        const list = await res.json();

        // 1. Render di halaman Admin Evaluator (#evaluatorHandbookList)
        const adminContainer = document.getElementById('evaluatorHandbookList');
        if (adminContainer) {
            if (!Array.isArray(list) || list.length === 0) {
                adminContainer.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">Belum ada dokumen handbook / reference yang di-upload.</div>`;
            } else {
                adminContainer.innerHTML = list.map(doc => `
                    <div class="flex items-center justify-between bg-slate-50 p-4 border border-slate-200 rounded-xl hover:bg-white transition">
                        <div class="space-y-1">
                            <div class="flex items-center space-x-2">
                                <span class="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">${doc.category || 'Handbook'}</span>
                                <h5 class="text-xs font-bold text-slate-800">${doc.title}</h5>
                            </div>
                            ${doc.description ? `<p class="text-xs text-slate-500">${doc.description}</p>` : ''}
                            <a href="${doc.file_url}" target="_blank" class="text-xs text-jci-blue hover:underline inline-flex items-center gap-1 font-semibold">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Open / Download Document
                            </a>
                        </div>
                        <button type="button" onclick="handleDeleteHandbook('${doc.id}')" class="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition cursor-pointer" title="Delete Document">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `).join('');
            }
        }

        // 2. Render juga di Tab Reference Publik/Chapter (#referenceHandbookList)
        renderPublicReferenceTab(list);

    } catch (err) {
        console.error("Gagal load handbooks:", err);
    }
}

export function renderPublicReferenceTab(list = []) {
    const refContainer = document.getElementById('referenceHandbookList') 
        || document.getElementById('referenceListContainer') 
        || document.getElementById('publicHandbookList');
    if (!refContainer) return;

    if (!Array.isArray(list) || list.length === 0) {
        refContainer.innerHTML = `<div class="col-span-full p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">Belum ada dokumen referensi resmi yang diunggah oleh National Admin.</div>`;
        return;
    }

    refContainer.innerHTML = list.map(doc => {
        let badgeColor = 'bg-blue-50 text-jci-blue border-blue-200';
        if (doc.category === 'Template') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (doc.category === 'Policy') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

        const uploadDate = doc.uploaded_at
            ? new Date(doc.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';

        return `
            <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-jci-blue/50 hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md border ${badgeColor}">
                            ${doc.category || 'Handbook'}
                        </span>
                        ${uploadDate ? `<span class="text-[11px] text-slate-400"><i class="fa-regular fa-calendar mr-1"></i>${uploadDate}</span>` : ''}
                    </div>
                    <h4 class="font-extrabold text-slate-900 text-sm pt-0.5">${doc.title}</h4>
                    ${doc.description ? `<p class="text-xs text-slate-500">${doc.description}</p>` : ''}
                </div>
                <div class="shrink-0">
                    <a href="${doc.file_url}" target="_blank" download class="px-4 py-2 bg-jci-blue hover:bg-jci-navy text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-2 shadow-xs">
                        <i class="fa-solid fa-download"></i> Download / View
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

export async function handleDeleteHandbook(docId) {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen reference ini?")) return;

    const endpointsToTry = [
        `/admin/handbooks/${encodeURIComponent(docId)}`,
        `/handbooks/${encodeURIComponent(docId)}`
    ];

    let deleted = false;
    let lastErr = "Gagal menghapus dokumen";

    for (const url of endpointsToTry) {
        try {
            const res = await fetchAPI(url, { method: 'DELETE' });
            if (res && res.ok) {
                const result = await res.json().catch(() => ({}));
                alert(result.message || "Dokumen berhasil dihapus!");
                await loadHandbooks();
                deleted = true;
                break;
            } else if (res && res.status !== 404 && res.status !== 405) {
                const errData = await res.json().catch(() => ({}));
                lastErr = errData.detail || errData.message || lastErr;
                break;
            }
        } catch (err) {
            console.warn(`Gagal delete ke ${url}:`, err);
        }
    }

    if (!deleted) {
        alert("Gagal menghapus dokumen: " + lastErr);
    }
}

window.openAddHandbookModal = openAddHandbookModal;
window.closeAddHandbookModal = closeAddHandbookModal;
window.handleAddHandbookSubmit = handleAddHandbookSubmit;
window.loadHandbooks = loadHandbooks;
window.renderPublicReferenceTab = renderPublicReferenceTab;
window.handleDeleteHandbook = handleDeleteHandbook;

// ==========================================
// 8. ANNUAL ARCHIVES & YEARLY ROLLOVER
// ==========================================
let loadedArchivesCache = [];

export async function loadAnnualArchives(requestedChapterName) {
    const container = document.getElementById('archiveListContainer');
    if (!container) return;

    const roleStr = state.currentRole || localStorage.getItem('jci_role') || 'CHAPTER_PIC';
    const isUserAdmin = (roleStr === 'ADMIN' || roleStr === 'UserRole.ADMIN');
    const myChapter = state.currentChapter || localStorage.getItem('jci_chapter') || 'Jakarta';

    // ISOLASI CHAPTER: Jika bukan Admin, selalu kunci ke myChapter
    const targetChapter = isUserAdmin ? (requestedChapterName || myChapter) : myChapter;

    // Update badge nama chapter di header tab Archive
    const badgeEl = document.getElementById('archiveActiveChapterBadge');
    if (badgeEl) {
        badgeEl.textContent = isUserAdmin ? `Viewing: ${targetChapter}` : `Khusus Chapter: ${myChapter}`;
    }

    // Tampilkan/sembunyikan kontrol Admin & isi dropdown chapter untuk Admin
    const adminControls = document.getElementById('adminArchiveControls');
    const archiveSelect = document.getElementById('archiveChapterSelect');
    if (adminControls) {
        if (isUserAdmin) {
            adminControls.classList.remove('hidden');
            if (archiveSelect && loadedChaptersCache.length > 0 && archiveSelect.options.length <= 1) {
                archiveSelect.innerHTML = loadedChaptersCache.map(c => `
                    <option value="${c.name}" ${c.name === targetChapter ? 'selected' : ''}>${c.name}</option>
                `).join('');
            } else if (archiveSelect) {
                archiveSelect.value = targetChapter;
            }
        } else {
            adminControls.classList.add('hidden');
        }
    }

    try {
        let res = await fetchAPI(`/admin/archives/${encodeURIComponent(targetChapter)}`);
        if (!res || !res.ok) {
            res = await fetchAPI(`/archives/${encodeURIComponent(targetChapter)}`);
        }

        if (!res || !res.ok) {
            const errData = res ? await res.json().catch(() => ({})) : {};
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">${errData.detail || `Belum ada arsip tahunan untuk ${targetChapter}.`}</div>`;
            return;
        }

        loadedArchivesCache = await res.json();

        if (!Array.isArray(loadedArchivesCache) || loadedArchivesCache.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">Belum ada arsip tahunan yang difinalisasi untuk <strong>${targetChapter}</strong>.</div>`;
            return;
        }

        container.innerHTML = loadedArchivesCache.map((a, idx) => {
            const details = a.breakdown_json || {};
            const picInfo = details.pic_info || {};
            const subsList = Array.isArray(details.submissions) ? details.submissions : [];
            const kpiInfo = details.kpi || null;

            const picLabel = (picInfo.pic_names && picInfo.pic_names.length > 0)
                ? picInfo.pic_names.join(', ')
                : (picInfo.pic_email && picInfo.pic_email !== '-' ? picInfo.pic_email : 'PIC Periode ' + a.year);

            const subsRowsHtml = subsList.length > 0
                ? subsList.map(s => `
                    <div class="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                        <div>
                            <span class="font-bold text-jci-blue">[${s.standard_id}]</span>
                            <span class="font-semibold text-slate-800 ml-1">${s.title}</span>
                            <p class="text-[11px] text-slate-500 mt-0.5">${s.description || '-'}</p>
                            ${s.url ? `<a href="${s.url}" target="_blank" class="text-[11px] text-blue-600 hover:underline font-bold inline-flex items-center gap-1 mt-1"><i class="fa-solid fa-link"></i> Bukti Dokumen (${a.year})</a>` : ''}
                        </div>
                        <div class="text-right whitespace-nowrap ml-3">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">${s.status}</span>
                            <div class="font-extrabold text-emerald-700 mt-1">${s.score_earned || 0} pts</div>
                        </div>
                    </div>
                `).join('')
                : `<p class="text-xs text-slate-400 italic">Tidak ada rekaman detail dokumen submission pada arsip tahun ini.</p>`;

            const kpiSummaryHtml = kpiInfo
                ? `
                    <div class="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div>
                            <span class="text-[10px] font-bold uppercase text-emerald-700">Arsip KPI Self-Assessment (${a.year})</span>
                            <p class="text-xs text-slate-600 mt-0.5">Status Akhir: <strong>${kpiInfo.status || '-'}</strong></p>
                            ${kpiInfo.evaluator_feedback ? `<p class="text-[11px] text-slate-500 mt-0.5">Catatan Evaluator: ${kpiInfo.evaluator_feedback}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <span class="text-sm font-black text-emerald-700">${kpiInfo.evaluator_score || 0} pts</span>
                        </div>
                    </div>
                `
                : '';

            return `
                <div class="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                    <div class="p-4 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-md bg-jci-blue text-white text-xs font-extrabold">Arsip Tahun ${a.year}</span>
                                <h4 class="font-extrabold text-slate-900 text-sm">${a.chapter_name}</h4>
                            </div>
                            <p class="text-xs text-slate-500 mt-1">
                                <i class="fa-solid fa-user-check mr-1 text-slate-400"></i> <strong>PIC (${a.year}):</strong> ${picLabel} 
                                • <strong>NVP:</strong> ${picInfo.nvp_name || '-'}
                                • <strong>Band:</strong> ${a.efficiency_band}
                            </p>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="text-right">
                                <span class="text-xs font-bold text-amber-600 block"><i class="fa-solid fa-star"></i> ${a.qualified_stars} / 5 Stars</span>
                                <span class="text-sm font-black text-slate-900">${a.total_score} pts (Star)</span>
                            </div>
                            <button type="button" onclick="toggleArchiveDetailPanel(${idx})" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer">
                                <i class="fa-solid fa-folder-open mr-1 text-jci-blue"></i> Lihat Rincian Arsip
                            </button>
                        </div>
                    </div>

                    <div id="archive-detail-panel-${idx}" class="hidden p-4 border-t border-slate-200 space-y-3 bg-slate-50/40">
                        ${kpiSummaryHtml}
                        <div>
                            <h5 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                Daftar Bukti Submission 5-Star (${subsList.length} Dokumen)
                            </h5>
                            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                                ${subsRowsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.warn("Notice: Archives tidak ditemukan / kosong:", err);
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan.</div>`;
    }
}

export function toggleArchiveDetailPanel(idx) {
    const panel = document.getElementById(`archive-detail-panel-${idx}`);
    if (panel) panel.classList.toggle('hidden');
}

export async function handleFinalizeAnnualArchive(yearToArchive = 2026) {
    const inputYear = prompt("Masukkan Tahun Siklus yang akan DIFINALISASI & DIARSIPKAN:", String(yearToArchive));
    if (!inputYear) return;

    const yearNum = parseInt(inputYear, 10);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
        return alert("Tahun tidak valid!");
    }

    const confirmMsg = `PERINGATAN FINALISASI TAHUN ${yearNum}:\n\n` +
        `1. Seluruh skor & bukti submission (5-Star & KPI) tahun ${yearNum} dari semua Chapter akan disimpan ke Arsip Tahunan.\n` +
        `2. Lembar kerja aktif akan dikosongkan untuk siklus tahun ${yearNum + 1}.\n` +
        `3. Akun PIC periode ${yearNum} akan di-reset agar PIC baru tahun ${yearNum + 1} dapat didaftarkan.\n\n` +
        `Lanjutkan finalisasi & arsip tahun ${yearNum}?`;

    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetchAPI(`/admin/archive-year/${yearNum}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_pic_accounts: true })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal memfinalisasi arsip tahunan");

        alert(result.message || `Tahun ${yearNum} berhasil diarsipkan!`);
        await loadAnnualArchives();
        if (typeof window.loadData === 'function') await window.loadData();
    } catch (err) {
        alert("Gagal memfinalisasi tahun: " + err.message);
    }
}

window.loadAnnualArchives = loadAnnualArchives;
window.toggleArchiveDetailPanel = toggleArchiveDetailPanel;
window.handleFinalizeAnnualArchive = handleFinalizeAnnualArchive;