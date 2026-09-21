import { fetchAPI } from './api.js';
import { state } from './auth.js';

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
    const modal = document.getElementById('addChapterModal');
    if (modal) modal.classList.remove('hidden');
}

export function closeAddChapterModal() {
    const modal = document.getElementById('addChapterModal');
    if (modal) modal.classList.add('hidden');
}

export async function handleAddChapterForm(e) {
    if (e) e.preventDefault();
    const nameEl = document.getElementById('mChapterName');
    const nvpEl = document.getElementById('mNvpName');
    const name = nameEl ? nameEl.value.trim() : '';
    const nvp = nvpEl ? nvpEl.value.trim() : '';

    if (!name) return alert("Silakan masukkan nama Chapter baru!");

    try {
        const res = await fetchAPI('/chapters', { 
            method: 'POST', 
            body: JSON.stringify({ 
                name: name,
                nvp_name: nvp || "Unassigned" 
            }) 
        });
        const result = await res.json();
        alert(result.message || "Chapter berhasil ditambahkan!");
        closeAddChapterModal();
        loadChapters();
    } catch (err) {
        alert("Gagal menambah chapter: " + err.message);
    }
}

export async function loadChapters() {
    try {
        const res = await fetchAPI('/chapters');
        const loadedChaptersList = await res.json();
        
        if (!Array.isArray(loadedChaptersList)) return;

        const selectTop = document.getElementById('chapterSelect');
        const selectEval = document.getElementById('evalChapterSelect');
        const selectReg = document.getElementById('lRegChapterSelect');
        const evalChapterBadgeList = document.getElementById('evaluatorChapterList');

        const optionsHtml = loadedChaptersList.map(c => `
            <option value="${c.name}" class="text-slate-900" ${c.name === state.currentChapter ? 'selected' : ''}>
                ${c.name}
            </option>
        `).join('');

        if (selectTop) selectTop.innerHTML = optionsHtml;
        if (selectEval) selectEval.innerHTML = optionsHtml;
        if (selectReg) selectReg.innerHTML = optionsHtml;

        if (evalChapterBadgeList) {
            if (loadedChaptersList.length === 0) {
                evalChapterBadgeList.innerHTML = `<div class="w-full p-4 text-center text-slate-500 italic bg-white rounded-xl border border-slate-200">No registered chapters found.</div>`;
                return;
            }

            const rowsHtml = loadedChaptersList.map(c => `
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
                    <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <button onclick="handleDeleteChapter('${c.name}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" title="Delete Chapter">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            evalChapterBadgeList.innerHTML = `
                <div class="w-full block overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white mt-3">
                    <table class="w-full text-sm border-collapse">
                        <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                            <tr>
                                <th class="px-4 py-3 text-left">Chapter Name</th>
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
        alert(result.message || "Chapter berhasil dihapus!");
        loadChapters();
    } catch (err) {
        alert("Gagal menghapus chapter: " + err.message);
    }
}

// ==========================================
// 2. STANDARDS MANAGEMENT
// ==========================================
export function renderAdminStandardsList(standardsData = []) {
    const container = document.getElementById('evaluatorStandardsList');
    if (!container) return;

    if (!Array.isArray(standardsData) || standardsData.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">Belum ada standar yang terdaftar.</p>';
        return;
    }

    const grouped = standardsData.reduce((acc, std) => {
        let cat = std.star || std.star_category || 'OTHER';
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
            const maxScore = std.max_score || std.weight || 10;
            return `
                <div class="flex items-center justify-between bg-slate-50 p-3 border border-slate-200 rounded-xl hover:bg-white transition">
                    <div>
                        <span class="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">${stdId}</span>
                        <h5 class="text-xs font-bold text-slate-800 mt-1">${stdName} (${maxScore} pts)</h5>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="openStandardModalForEdit('${stdId}')" class="text-jci-blue hover:text-jci-navy bg-blue-50 px-2.5 py-1.5 rounded-lg font-bold text-xs transition" title="Edit Standard">
                            <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button onclick="handleDeleteStandard('${stdId}')" class="text-rose-500 hover:text-rose-700 bg-rose-50 p-1.5 rounded-lg transition" title="Delete Standard">
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
    document.getElementById('sFormMode').value = 'add';
    document.getElementById('stdModalTitle').textContent = 'Add New Standard';
    document.getElementById('sId').value = '';
    document.getElementById('sId').disabled = false;
    document.getElementById('sName').value = '';
    document.getElementById('sStar').value = 'EFFICIENCY';
    document.getElementById('sPurpose').value = '';
    document.getElementById('sScore').value = '10';
    document.getElementById('sDeadline').value = '2026-12-31';
    document.getElementById('standardModal').classList.remove('hidden');
}

export function openStandardModalForEdit(stdId, standardsData = []) {
    const std = standardsData.find(s => (s.id || s.standard_id || s.code) === stdId);
    if (!std) return;

    document.getElementById('sFormMode').value = 'edit';
    document.getElementById('stdModalTitle').textContent = `Edit Standard: ${stdId}`;
    document.getElementById('sId').value = stdId;
    document.getElementById('sId').disabled = true;
    document.getElementById('sName').value = std.name || std.title || '';
    document.getElementById('sStar').value = (std.star || std.star_category || 'EFFICIENCY').toUpperCase();
    document.getElementById('sPurpose').value = std.purpose || std.description || '';
    document.getElementById('sScore').value = std.max_score || std.weight || 10;
    document.getElementById('sDeadline').value = std.deadline ? String(std.deadline).substring(0,10) : '2026-12-31';
    
    document.getElementById('standardModal').classList.remove('hidden');
}

export function closeStandardModal() {
    document.getElementById('standardModal').classList.add('hidden');
}

export async function handleStandardFormSubmit(e) {
    if (e) e.preventDefault();
    const mode = document.getElementById('sFormMode').value;
    const payload = {
        id: document.getElementById('sId').value.trim(),
        name: document.getElementById('sName').value.trim(),
        star: document.getElementById('sStar').value,
        purpose: document.getElementById('sPurpose').value.trim(),
        requirement: document.getElementById('sPurpose').value.trim(),
        evidence_guide: "Buku Panduan V1",
        max_score: parseInt(document.getElementById('sScore').value),
        deadline: document.getElementById('sDeadline').value
    };

    try {
        let url = '/standards';
        let method = 'POST';

        if (mode === 'edit') {
            url = `/standards/${payload.id}`;
            method = 'PUT';
        }

        const res = await fetchAPI(url, {
            method: method,
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menyimpan standar");
        
        alert(result.message || "Standard berhasil disimpan!");
        closeStandardModal();
        if (window.loadData) window.loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

export async function handleDeleteStandard(stdId) {
    if (!confirm(`HAPUS STANDAR?\nApakah Anda yakin ingin menghapus standar [${stdId}]?`)) return;

    try {
        const res = await fetchAPI(`/standards/${encodeURIComponent(stdId)}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menghapus standar");
        
        alert(result.message || "Standard berhasil dihapus!");
        if (window.loadData) window.loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ==========================================
// 3. AUDIT SUBMISSIONS (STANDARDS)
// ==========================================
let currentSubmissionsCache = [];
let currentAuditFilter = 'all';

export function filterAuditStatus(status) {
    currentAuditFilter = status;
    document.querySelectorAll('.audit-filter-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'shadow-xs', 'text-slate-800');
        btn.classList.add('text-slate-600');
    });
    
    const activeBtn = document.getElementById(`audit-filter-${status}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-white', 'shadow-xs', 'text-slate-800');
        activeBtn.classList.remove('text-slate-600');
    }
    
    renderFilteredSubmissions();
}

function renderFilteredSubmissions() {
    const container = document.getElementById('evaluatorSubmissionsList');
    if (!container) return;

    let filtered = currentSubmissionsCache;
    if (currentAuditFilter === 'pending') {
        filtered = currentSubmissionsCache.filter(s => s.status === 'Submitted' || s.status === 'Pending' || s.status === 'Pending Review');
    } else if (currentAuditFilter === 'approved') {
        filtered = currentSubmissionsCache.filter(s => s.status === 'Approved');
    } else if (currentAuditFilter === 'revision') {
        filtered = currentSubmissionsCache.filter(s => s.status === 'Revision Requested');
    } else if (currentAuditFilter === 'rejected') {
        filtered = currentSubmissionsCache.filter(s => s.status === 'Rejected');
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">Tidak ada submission untuk kategori status ini.</div>`;
        return;
    }

    container.innerHTML = filtered.map(sub => {
        let badgeStyle = 'bg-slate-100 text-slate-800';
        if (sub.status === 'Approved') badgeStyle = 'bg-emerald-100 text-emerald-800';
        else if (sub.status === 'Revision Requested') badgeStyle = 'bg-amber-100 text-amber-800';
        else if (sub.status === 'Rejected') badgeStyle = 'bg-rose-100 text-rose-800';

        return `
            <div class="bg-white p-5 rounded-2xl border ${sub.status === 'Rejected' ? 'border-rose-200' : (sub.status === 'Revision Requested' ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200')} shadow-sm space-y-3 relative">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 uppercase">${sub.standard_id}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${badgeStyle}">${sub.status}</span>
                </div>
                <div>
                    <h4 class="font-bold text-slate-900 text-sm">${sub.title}</h4>
                    <p class="text-xs text-slate-600 mt-1"><strong>Description:</strong> ${sub.description}</p>
                    ${(sub.url || sub.evidence_url) ? `<p class="text-xs text-blue-600 mt-1"><a href="${sub.url || sub.evidence_url}" target="_blank" class="hover:underline"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${sub.url || sub.evidence_url}</a></p>` : ''}
                    ${sub.evaluator_notes ? `<p class="text-xs ${sub.status === 'Rejected' ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-amber-800 bg-amber-50 border-amber-200'} p-2 rounded mt-2 border"><strong>Evaluator Notes:</strong> ${sub.evaluator_notes}</p>` : ''}
                </div>
                <div class="flex items-center justify-between pt-2 border-t text-xs">
                    <span class="font-bold text-slate-700">Awarded Score: ${sub.score_earned || 0} pts</span>
                    <button onclick="openAuditModal(${sub.id})" class="px-4 py-1.5 bg-jci-blue hover:bg-jci-navy text-white rounded-xl font-bold shadow-xs transition">
                        <i class="fa-solid fa-clipboard-check mr-1"></i> Audit Score & Notes
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

export function renderEvaluatorPortal(chapterSubmissions = {}) {
    currentSubmissionsCache = Object.values(chapterSubmissions);

    const pendingCount = currentSubmissionsCache.filter(s => s.status === 'Submitted' || s.status === 'Pending' || s.status === 'Pending Review').length;
    const approvedCount = currentSubmissionsCache.filter(s => s.status === 'Approved').length;
    const revisionCount = currentSubmissionsCache.filter(s => s.status === 'Revision Requested').length;
    const rejectedCount = currentSubmissionsCache.filter(s => s.status === 'Rejected').length;

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

export function openAuditModal(subId) {
    const sub = currentSubmissionsCache.find(s => s.id === subId);
    if (!sub) return;

    document.getElementById('auditSubId').value = subId;
    document.getElementById('auditModalTitle').textContent = `[${sub.standard_id}] ${sub.title}`;
    document.getElementById('auditModalDesc').textContent = sub.description || 'Tidak ada deskripsi.';
    
    const urlContainer = document.getElementById('auditModalUrlContainer');
    if (sub.url || sub.evidence_url) {
        const linkVal = sub.url || sub.evidence_url;
        urlContainer.innerHTML = `<a href="${linkVal}" target="_blank" class="text-jci-blue hover:underline text-xs"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Evidence Link</a>`;
    } else {
        urlContainer.innerHTML = `<span class="text-slate-400 italic text-xs">No URL provided</span>`;
    }

    document.getElementById('auditStatus').value = sub.status === 'Approved' ? 'Approved' : 'Revision Requested';
    document.getElementById('auditScore').value = sub.score_earned || 0;
    document.getElementById('auditNotes').value = sub.evaluator_notes || '';
    handleAuditStatusChange(document.getElementById('auditStatus').value);

    document.getElementById('auditModal').classList.remove('hidden');
}

export function closeAuditModal() {
    document.getElementById('auditModal').classList.add('hidden');
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
    const score = status === 'Approved' ? parseInt(document.getElementById('auditScore').value || 0) : 0;
    const notes = document.getElementById('auditNotes').value.trim();

    try {
        const res = await fetchAPI(`/admin/verify/${subId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: status, score_earned: score, evaluator_notes: notes })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal mengaudit submission");

        alert(result.message || "Audit berhasil disimpan!");
        closeAuditModal();
        if (window.loadData) window.loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ==========================================
// 4. PENDING USERS MANAGEMENT
// ==========================================
export async function loadPendingUsers() {
    try {
        const res = await fetchAPI('/admin/pending-users');
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
                    <button onclick="approveUserAction(${u.id}, 'approve')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] transition">Approve</button>
                    <button onclick="approveUserAction(${u.id}, 'reject')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] transition">Reject</button>
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
        alert(result.message);
        loadPendingUsers();
    } catch (err) {
        alert("Gagal memproses user: " + err.message);
    }
}

// ==========================================
// 5. HANDBOOK / REFERENCE MANAGEMENT
// ==========================================
export function openAddHandbookModal() {
    document.getElementById('mDocTitle').value = '';
    document.getElementById('mDocCategory').value = 'Handbook';
    document.getElementById('mDocFile').value = '';
    document.getElementById('mDocUrl').value = '';
    document.getElementById('mDocDesc').value = '';
    document.getElementById('addHandbookModal').classList.remove('hidden');
}

export function closeAddHandbookModal() {
    document.getElementById('addHandbookModal').classList.add('hidden');
}

window.openAddHandbookModal = openAddHandbookModal;
window.closeAddHandbookModal = closeAddHandbookModal;

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
        const res = await fetch('/admin/handbooks', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menyimpan dokumen");

        alert("Handbook reference berhasil ditambahkan!");
        closeAddHandbookModal();
        loadHandbooks();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

window.handleAddHandbookSubmit = handleAddHandbookSubmit;

export async function loadHandbooks() {
    try {
        const res = await fetchAPI('/handbooks');
        if (!res.ok) return;
        
        const list = await res.json();
        const container = document.getElementById('evaluatorHandbookList');
        if (!container) return;

        if (!Array.isArray(list) || list.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">Belum ada dokumen handbook / reference yang di-upload.</div>`;
            return;
        }

        container.innerHTML = list.map(doc => `
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
                <button onclick="handleDeleteHandbook(${doc.id})" class="text-rose-500 hover:text-rose-700 bg-rose-50 p-2 rounded-lg transition" title="Delete Document">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `).join('');
    } catch (err) {
        console.error("Gagal load handbooks:", err);
    }
}

export async function handleDeleteHandbook(docId) {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen reference ini?")) return;

    try {
        const res = await fetchAPI(`/admin/handbooks/${docId}`, { method: 'DELETE' });
        const result = await res.json();
        alert(result.message || "Dokumen berhasil dihapus!");
        loadHandbooks();
    } catch (err) {
        alert("Gagal menghapus dokumen: " + err.message);
    }
}

window.handleDeleteHandbook = handleDeleteHandbook;

// ==========================================
// 6. ADMIN KPI SUBMISSIONS AUDIT
// ==========================================
let adminKpiSubmissionsCache = [];

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
                        ${sub.evaluator_feedback ? `<p class="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded mt-1"><strong>Catatan Evaluator:</strong> ${sub.evaluator_feedback}</p>` : ''}
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

export function openKpiAuditModal(subId) {
    const sub = adminKpiSubmissionsCache.find(s => s.id === subId);
    if (!sub) return;

    document.getElementById('kpiAuditSubId').value = sub.id;
    document.getElementById('kpiAuditChapterSubtitle').textContent = `Chapter: ${sub.chapter_name} (Tahun ${sub.year})`;
    document.getElementById('kpiAuditScore').value = sub.evaluator_score || 0;
    document.getElementById('kpiAuditStatus').value = sub.status || 'OK / Approved';
    document.getElementById('kpiAuditFeedback').value = sub.evaluator_feedback || '';

    const summaryContainer = document.getElementById('kpiAuditSummaryContainer');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="space-y-2 text-xs">
                <h5 class="font-bold text-slate-800 border-b pb-1">Isian Data Form KPI oleh Chapter:</h5>
                <p><strong>1. Membership:</strong> LBOD Score: ${sub.membership_data?.lbod_status_score ?? '-'}, Declared Member: ${sub.membership_data?.declared_count ?? 0}</p>
                <p><strong>2. Legalitas Folder:</strong> <a href="${sub.legality_data?.folder_url || '#'}" target="_blank" class="text-blue-600 underline">${sub.legality_data?.folder_url || 'Tidak Ada Link'}</a></p>
                <p><strong>3. PoA Executed:</strong> ${sub.poa_data?.pct ?? 0}%</p>
                <p><strong>4. Impact / Needs:</strong> ${sub.impact_data?.needs || '-'}</p>
                <p><strong>5. Skill Trainings:</strong> ${sub.skill_data?.trainings || '-'}</p>
                <p><strong>6. National Events:</strong> ${sub.national_events_data?.hosting || '-'}</p>
                <p><strong>7. Int'l Delegates:</strong> ${sub.intl_events_data?.delegates || '-'}</p>
                <p><strong>8. Website / Socmed:</strong> ${sub.branding_data?.website || '-'} / ${sub.branding_data?.socmed || '-'}</p>
            </div>
        `;
    }

    document.getElementById('kpiAuditModal').classList.remove('hidden');
}

export function closeKpiAuditModal() {
    document.getElementById('kpiAuditModal').classList.add('hidden');
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
// 7. ANNUAL ARCHIVES
// ==========================================
export async function loadAnnualArchives(chapterName) {
    const container = document.getElementById('archiveListContainer');
    if (!container) return;

    try {
        // Coba panggil endpoint archives
        let res = await fetchAPI(`/admin/archives/${encodeURIComponent(chapterName || state.currentChapter)}`);
        if (!res || !res.ok) {
            res = await fetchAPI(`/archives/${encodeURIComponent(chapterName || state.currentChapter)}`);
        }

        if (!res || !res.ok) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan untuk ${chapterName || state.currentChapter}.</div>`;
            return;
        }

        const archives = await res.json();

        if (!Array.isArray(archives) || archives.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan untuk ${chapterName || state.currentChapter}.</div>`;
            return;
        }

        container.innerHTML = archives.map(a => `
            <div class="p-4 bg-slate-50 border rounded-xl flex items-center justify-between">
                <div>
                    <span class="text-xs font-bold text-jci-blue">Tahun ${a.year}</span>
                    <h4 class="font-extrabold text-slate-800 text-sm mt-0.5">${a.chapter_name}</h4>
                    <p class="text-xs text-slate-500">${a.efficiency_band}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs font-bold text-amber-600"><i class="fa-solid fa-star"></i> ${a.qualified_stars} Stars</span>
                    <div class="text-sm font-black text-slate-800">${a.total_score} pts</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.warn("Notice: Archives tidak ditemukan / kosong:", err);
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan.</div>`;
    }
}
window.loadAnnualArchives = loadAnnualArchives;