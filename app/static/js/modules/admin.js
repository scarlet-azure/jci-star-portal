import { fetchAPI } from './api.js';
import { state } from './auth.js';

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
            evalChapterBadgeList.innerHTML = loadedChaptersList.map(c => `
                <span class="inline-flex items-center bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                    ${c.name}
                    <button onclick="handleDeleteChapter('${c.name}')" class="ml-1.5 text-rose-500 hover:text-rose-700" title="Delete Chapter">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </span>
            `).join('');
        }
    } catch (err) {
        console.error("Gagal load chapters:", err);
    }
}

export async function handleAddChapter() {
    const input = document.getElementById('newChapterNameInput');
    const name = input.value.trim();
    if (!name) return alert("Silakan masukkan nama Chapter baru!");

    try {
        const res = await fetchAPI('/chapters', { 
            method: 'POST', 
            body: JSON.stringify({ name: name }) 
        });
        const result = await res.json();
        alert(result.message || "Chapter berhasil ditambahkan!");
        input.value = '';
        loadChapters();
    } catch (err) {
        alert("Gagal menambah chapter: " + err.message);
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

export function openAuditModal(subId, chapterSubmissions = {}) {
    const entries = Object.values(chapterSubmissions);
    const sub = entries.find(s => s.id === subId);
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

export function renderEvaluatorPortal(chapterSubmissions = {}) {
    const container = document.getElementById('evaluatorSubmissionsList');
    if (!container) return;

    const entries = Object.values(chapterSubmissions);
    if (entries.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border">Belum ada submission dari ${state.currentChapter}.</div>`;
        return;
    }

    container.innerHTML = entries.map(sub => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 uppercase">${sub.standard_id}</span>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : (sub.status === 'Revision Requested' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">${sub.status}</span>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 text-sm">${sub.title}</h4>
                <p class="text-xs text-slate-600 mt-1"><strong>Description:</strong> ${sub.description}</p>
                ${(sub.url || sub.evidence_url) ? `<p class="text-xs text-blue-600 mt-1"><a href="${sub.url || sub.evidence_url}" target="_blank" class="hover:underline"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${sub.url || sub.evidence_url}</a></p>` : ''}
                ${sub.evaluator_notes ? `<p class="text-xs text-amber-800 bg-amber-50 p-2 rounded mt-2 border border-amber-200"><strong>Evaluator Notes:</strong> ${sub.evaluator_notes}</p>` : ''}
            </div>
            <div class="flex items-center justify-between pt-2 border-t text-xs">
                <span class="font-bold text-slate-700">Awarded Score: ${sub.score_earned || 0} pts</span>
                <button onclick="openAuditModal(${sub.id})" class="px-4 py-1.5 bg-jci-blue hover:bg-jci-navy text-white rounded-xl font-bold shadow-xs transition">
                    <i class="fa-solid fa-clipboard-check mr-1"></i> Audit Score & Notes
                </button>
            </div>
        </div>
    `).join('');
}

export function renderAdminStandardsList(standardsData = []) {
    const container = document.getElementById('evaluatorStandardsList');
    if (!container) return;

    if (!Array.isArray(standardsData) || standardsData.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">Belum ada standar yang terdaftar.</p>';
        return;
    }

    container.innerHTML = standardsData.map(std => {
        const stdId = std.id || std.standard_id || std.code;
        const stdName = std.name || std.title;
        let stdStar = std.star || std.star_category;
        if (typeof stdStar === 'object' && stdStar !== null) {
            stdStar = stdStar.value || stdStar.name || '';
        }
        const maxScore = std.max_score || std.weight || 10;
        return `
            <div class="flex items-center justify-between bg-slate-50 p-2.5 border border-slate-200 rounded-xl hover:bg-white transition">
                <div>
                    <span class="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">${stdId}</span>
                    <span class="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1">${stdStar}</span>
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
}

export async function loadPendingUsers() {
    try {
        const res = await fetchAPI('/admin/pending-users');
        const pending = await res.json();
        const container = document.getElementById('pendingUsersList');
        if (!container) return;

        if (!Array.isArray(pending) || pending.length === 0) {
            container.innerHTML = `<p class="text-slate-400 italic text-xs">Tidak ada pendaftaran PIC yang tertunda.</p>`;
            return;
        }

        container.innerHTML = pending.map(u => `
            <div class="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between">
                <div>
                    <span class="font-bold text-slate-800 text-xs">${u.full_name} (${u.email})</span>
                    <p class="text-[10px] text-slate-500">Chapter: ${u.chapter_name}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="approveUserAction(${u.id}, 'approve')" class="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded text-[10px]">Approve</button>
                    <button onclick="approveUserAction(${u.id}, 'reject')" class="px-2.5 py-1 bg-rose-600 text-white font-bold rounded text-[10px]">Reject</button>
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