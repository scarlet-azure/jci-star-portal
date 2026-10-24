import { fetchAPI } from './api.js';

let starLeaderboardCache = [];
let kpiLeaderboardCache = [];

// ==========================================
// 1. MAIN FETCH & RENDER LEADERBOARD
// ==========================================
export async function loadLeaderboard() {
    try {
        const resStar = await fetchAPI('/leaderboard');
        if (resStar && resStar.ok) {
            starLeaderboardCache = await resStar.json();
            renderLeaderboard(starLeaderboardCache);
        }

        await loadKpiLeaderboard();
    } catch (err) {
        console.error("Gagal memuat data Leaderboard:", err);
    }
}

// ==========================================
// 2. RENDER STAR PROGRAM LEADERBOARD
// ==========================================
export function renderLeaderboard(data = []) {
    const tbody = document.getElementById('leaderboardBody') || document.getElementById('starLeaderboardTable');
    if (!tbody) return;
    
    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Belum ada data Star Program Leaderboard.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map((item) => {
        const b = item.breakdown || item.scores || {};
        const eff = b.Efficiency ?? b.efficiency ?? b.E ?? 0;
        const net = b.Network ?? b.network ?? b.N ?? 0;
        const exp = b.Experience ?? b.experience ?? b.Ex ?? 0;
        const out = b.Outreach ?? b.outreach ?? b.O ?? 0;
        const imp = b.Impact ?? b.impact ?? b.I ?? 0;

        let rankBadge = `<span class="font-bold text-slate-500">#${item.rank || '-'}</span>`;
        if (item.rank === 1) rankBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-black text-xs">🥇 #1</span>`;
        else if (item.rank === 2) rankBadge = `<span class="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-black text-xs">🥈 #2</span>`;
        else if (item.rank === 3) rankBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-700/10 text-amber-900 font-black text-xs">🥉 #3</span>`;

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <!-- 1. Rank -->
                <td class="py-4 px-4 text-center font-extrabold whitespace-nowrap">${rankBadge}</td>
                
                <!-- 2. Local Organization -->
                <td class="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">${item.chapter_name || 'Unknown'}</td>
                
                <!-- 3. Qualified Stars -->
                <td class="py-4 px-4 text-center whitespace-nowrap">
                    <span class="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-bold text-amber-600 inline-flex items-center gap-1">
                        <i class="fa-solid fa-star text-amber-400"></i> ${item.qualified_stars ?? 0} / 5
                    </span>
                </td>
                
                <!-- 4. Efficiency Band -->
                <td class="py-4 px-4 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">${item.efficiency_band || '-'}</td>
                
                <!-- 5. Total Points -->
                <td class="py-4 px-4 text-right font-black text-slate-900 text-sm whitespace-nowrap">${item.total_score ?? 0} pts</td>
                
                <!-- 6. Stars Breakdown -->
                <td class="py-4 px-4 text-center text-[11px] font-semibold space-x-1.5 whitespace-nowrap">
                    <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">E:${eff}</span>
                    <span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-bold border border-cyan-100">N:${net}</span>
                    <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">Ex:${exp}</span>
                    <span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-100">O:${out}</span>
                    <span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-100">I:${imp}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// Alias agar kompatibel jika dipanggil loadStarLeaderboard
export const loadStarLeaderboard = renderLeaderboard;

// ==========================================
// 3. FETCH & RENDER KPI LEADERBOARD (DYNAMIC TABS)
// ==========================================
export async function loadKpiLeaderboard() {
    try {
        const res = await fetchAPI('/leaderboard/kpi');
        if (!res || !res.ok) return;

        kpiLeaderboardCache = await res.json();
        const theadRow = document.getElementById('kpiLeaderboardHead');
        const tbody = document.getElementById('kpiLeaderboardTable');
        if (!tbody) return;

        // Ambil metadata daftar section dinamis dari item pertama (atau fallback fetch /kpi/schema)
        let sectionMeta = (kpiLeaderboardCache.length > 0 && Array.isArray(kpiLeaderboardCache[0].section_meta))
            ? kpiLeaderboardCache[0].section_meta
            : [];

        if (sectionMeta.length === 0) {
            const schemaRes = await fetchAPI('/kpi/schema');
            if (schemaRes && schemaRes.ok) {
                const schemaData = await schemaRes.json();
                if (Array.isArray(schemaData)) {
                    sectionMeta = schemaData.map((tab, idx) => ({
                        key: `s${idx + 1}`,
                        short_label: `S${idx + 1}`,
                        title: tab.title || tab.id || `Section ${idx + 1}`
                    }));
                }
            }
        }

        // 1. Render Header Kolom (<thead>) secara dinamis mengikuti jumlah tab KPI
        if (theadRow) {
            const dynamicHeadersHtml = sectionMeta.map(meta => `
                <th class="py-3.5 px-3 text-center whitespace-nowrap cursor-help" title="${meta.title}">
                    ${meta.short_label}
                </th>
            `).join('');

            theadRow.innerHTML = `
                <th class="py-3.5 px-4 text-center w-16">Rank</th>
                <th class="py-3.5 px-4">Local Organization</th>
                <th class="py-3.5 px-4 text-center">Status</th>
                ${dynamicHeadersHtml}
                <th class="py-3.5 px-4 text-right whitespace-nowrap">Total KPI Score</th>
            `;
        }

        const totalCols = 4 + sectionMeta.length;

        if (!Array.isArray(kpiLeaderboardCache) || kpiLeaderboardCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${totalCols}" class="p-4 text-center text-slate-400">Belum ada data KPI Self-Assessment.</td></tr>`;
            return;
        }

        // 2. Render Baris Chapter (<tbody>) beserta kolom-kolom skor per section-nya
        tbody.innerHTML = kpiLeaderboardCache.map((item, idx) => {
            let rankBadge = `<span class="font-bold text-slate-500">#${idx + 1}</span>`;
            if (idx === 0) rankBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-black text-xs">🥇 #1</span>`;
            else if (idx === 1) rankBadge = `<span class="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-black text-xs">🥈 #2</span>`;
            else if (idx === 2) rankBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-700/10 text-amber-900 font-black text-xs">🥉 #3</span>`;

            let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">${item.status || 'Draft'}</span>`;
            if (item.status === 'OK / Approved') {
                statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">🟢 Approved</span>`;
            } else if (item.status === 'Needs Clarification') {
                statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">🟡 Clarification</span>`;
            } else if (item.status === 'Rejected') {
                statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">🔴 Rejected</span>`;
            } else if (item.status === 'Submitted') {
                statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">🔵 Submitted</span>`;
            }

            const sec = item.sections || {};
            const dynamicCellsHtml = sectionMeta.map(meta => `
                <td class="py-4 px-3 text-center font-semibold text-slate-600 whitespace-nowrap" title="${meta.title}: ${sec[meta.key] ?? 0} pts">
                    ${sec[meta.key] ?? 0}
                </td>
            `).join('');

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-4 px-4 text-center whitespace-nowrap">${rankBadge}</td>
                    <td class="py-4 px-4 font-extrabold text-slate-800 whitespace-nowrap">${item.chapter_name}</td>
                    <td class="py-4 px-4 text-center whitespace-nowrap">${statusBadge}</td>
                    ${dynamicCellsHtml}
                    <td class="py-4 px-4 text-right font-black text-emerald-700 text-sm whitespace-nowrap">${item.evaluator_score || 0} pts</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error("Gagal memuat KPI Leaderboard:", err);
    }
}

// ==========================================
// 4. SWITCH LEADERBOARD SUB-TABS
// ==========================================
export function switchLeaderboardSubTab(subTab) {
    document.querySelectorAll('.lb-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.lb-subtab-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-jci-blue', 'shadow-xs');
        btn.classList.add('text-slate-600');
    });

    const targetContent = document.getElementById(`lb-content-${subTab}`);
    const targetBtn = document.getElementById(`lb-subtab-${subTab}`);

    if (targetContent) targetContent.classList.remove('hidden');
    if (targetBtn) {
        targetBtn.classList.add('bg-white', 'text-jci-blue', 'shadow-xs');
        targetBtn.classList.remove('text-slate-600');
    }

    if (subTab === 'kpi') {
        loadKpiLeaderboard();
    }
}

// BIND HELPER GLOBAL
window.loadLeaderboard = loadLeaderboard;
window.renderLeaderboard = renderLeaderboard;
window.loadStarLeaderboard = renderLeaderboard;
window.loadKpiLeaderboard = loadKpiLeaderboard;
window.switchLeaderboardSubTab = switchLeaderboardSubTab;