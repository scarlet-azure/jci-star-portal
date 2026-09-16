import { fetchAPI } from './api.js';
import { state } from './auth.js';

let currentCategoryFilter = 'ALL';

export function renderCategoryPills(standardsData = []) {
    const container = document.getElementById('categoryPillsContainer');
    if (!container) return;

    const categories = ['ALL', 'EFFICIENCY', 'NETWORK', 'EXPERIENCE', 'OUTREACH', 'IMPACT'];
    const counts = { ALL: standardsData.length };
    
    categories.slice(1).forEach(cat => {
        counts[cat] = standardsData.filter(s => {
            const starVal = (s.star || s.star_category || s.category || '').toUpperCase();
            return starVal === cat;
        }).length;
    });
    
    container.innerHTML = categories.map(cat => {
        const countText = counts[cat] !== undefined ? ` (${counts[cat]})` : ' (0)';
        return `
            <button onclick="filterCategory('${cat}')" class="px-3.5 py-2 rounded-xl font-bold text-xs transition ${currentCategoryFilter === cat ? 'bg-jci-navy text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                ${cat}${countText}
            </button>
        `;
    }).join('');
}

export function filterCategory(cat) {
    currentCategoryFilter = cat;
    if (window.loadData) window.loadData();
}

export function renderStandardsList(standardsData = [], chapterSubmissions = {}) {
    const container = document.getElementById('standardsSectionsContainer');
    const searchInput = document.getElementById('searchInput');
    if (!container) return;

    if (!Array.isArray(standardsData) || standardsData.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">Belum ada data standar yang dimuat dari database.</div>`;
        return;
    }

    const query = searchInput ? searchInput.value.toLowerCase() : '';

    const filtered = standardsData.filter(std => {
        const stdId = String(std.id || std.standard_id || std.code || '');
        const stdName = std.name || std.title || '';
        const stdStar = (std.star || std.star_category || std.category || '').toUpperCase();

        const matchesCat = (currentCategoryFilter === 'ALL') || (stdStar === currentCategoryFilter);
        const matchesSearch = stdName.toLowerCase().includes(query) || stdId.toLowerCase().includes(query);
        return matchesCat && matchesSearch;
    });

    const grouped = {};
    filtered.forEach(std => {
        const cat = (std.star || std.star_category || std.category || 'OTHER').toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(std);
    });

    if (Object.keys(grouped).length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">Tidak ada standar yang cocok dengan filter "${currentCategoryFilter}".</div>`;
        return;
    }

    container.innerHTML = Object.keys(grouped).map(cat => `
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
                        ${grouped[cat].map(std => {
                            const stdId = std.id || std.standard_id || std.code;
                            const stdName = std.name || std.title || '';
                            const stdStar = std.star || std.star_category || std.category || cat;
                            const maxScore = std.max_score || std.weight || std.points || 10;
                            const stdPurpose = std.purpose || std.description || std.requirement || '';
                            const stdDeadline = std.deadline ? String(std.deadline).substring(0, 10) : '2026-12-31';

                            const sub = chapterSubmissions[stdId] || { status: 'Not Submitted', score_earned: 0 };
                            const isApproved = sub.status === 'Approved' || sub.status === 'APPROVED';

                            let statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Pending</span>`;
                            if (isApproved) {
                                statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Approved</span>`;
                            } else if (sub.status === 'Revision Requested') {
                                statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Revision Req.</span>`;
                            } else if (sub.status === 'Rejected') {
                                statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Rejected</span>`;
                            }

                            return `
                                <tr class="hover:bg-slate-50 transition">
                                    <td class="py-3 px-3">
                                        <div class="font-bold text-slate-900">${stdId}. ${stdName}</div>
                                        <div class="text-[11px] text-slate-500 mt-0.5">${stdPurpose}</div>
                                    </td>
                                    <td class="py-3 px-3">
                                        <span class="text-[10px] font-extrabold text-jci-blue uppercase bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">${stdStar}</span>
                                    </td>
                                    <td class="py-3 px-3 text-[11px] font-medium text-slate-600">${stdDeadline}</td>
                                    <td class="py-3 px-3 font-bold text-slate-700">${maxScore} pts</td>
                                    <td class="py-3 px-3 font-extrabold ${isApproved ? 'text-emerald-600' : 'text-slate-400'}">${sub.score_earned || 0} pts</td>
                                    <td class="py-3 px-3">${statusBadge}</td>
                                    <td class="py-3 px-3 text-center">
                                        <button onclick="openSubmissionModal('${stdId}', '${stdName.replace(/'/g, "\\'")}', '${stdDeadline}')" class="px-3.5 py-1.5 bg-jci-blue hover:bg-jci-navy text-white font-bold rounded-xl shadow-xs text-xs transition">
                                            <i class="fa-solid fa-pen-to-square mr-1"></i> Edit
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

export function openSubmissionModal(stdId, stdName, defaultDeadline, chapterSubmissions = {}) {
    document.getElementById('modalStdId').value = stdId;
    document.getElementById('modalStdTitle').textContent = `${stdId}. ${stdName}`;
    
    const existing = chapterSubmissions[stdId];
    let formattedDate = (existing && existing.deadline) ? existing.deadline.substring(0, 10) : (defaultDeadline || '2026-12-31');

    if (existing) {
        document.getElementById('modalSubTitle').value = existing.title || '';
        document.getElementById('modalSubDesc').value = existing.description || '';
        document.getElementById('modalSubUrl').value = existing.url || existing.evidence_url || '';
        document.getElementById('modalSubDeadline').value = formattedDate;
    } else {
        document.getElementById('modalSubTitle').value = '';
        document.getElementById('modalSubDesc').value = '';
        document.getElementById('modalSubUrl').value = '';
        document.getElementById('modalSubDeadline').value = formattedDate;
    }

    document.getElementById('fileSelectText').textContent = "Click or drag & drop file to upload";
    document.getElementById('submissionModal').classList.remove('hidden');
}

export function closeSubmissionModal() {
    document.getElementById('submissionModal').classList.add('hidden');
}

export async function handleModalSubmit(e) {
    if (e) e.preventDefault();
    const stdId = document.getElementById('modalStdId').value;
    const title = document.getElementById('modalSubTitle').value;
    const desc = document.getElementById('modalSubDesc').value;
    const url = document.getElementById('modalSubUrl').value;
    const fileInput = document.getElementById('modalSubFile');

    const formData = new FormData();
    formData.append('standard_id', stdId);
    formData.append('chapter_name', state.currentChapter);
    formData.append('title', title);
    formData.append('description', desc);
    if (url) formData.append('evidence_url', url);
    if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

    try {
        const res = await fetchAPI('/submissions', { method: 'POST', body: formData });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal mengirim bukti");

        alert(result.message || "Bukti berhasil dikirim!");
        closeSubmissionModal();
        if (window.loadData) window.loadData();
    } catch (err) {
        alert("Gagal kirim bukti: " + err.message);
    }
}

export function updateFileLabel(input) {
    const label = document.getElementById('fileSelectText');
    if (input.files && input.files[0]) {
        label.innerHTML = `<i class="fa-solid fa-file-pdf text-rose-500 mr-1"></i> ${input.files[0].name}`;
    } else {
        label.textContent = "Click or drag & drop file to upload";
    }
}