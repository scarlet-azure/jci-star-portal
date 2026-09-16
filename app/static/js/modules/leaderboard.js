import { fetchAPI } from './api.js';
import { state } from './auth.js';

export function renderLeaderboard(data = []) {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;
    
    tbody.innerHTML = data.map((item) => {
        const b = item.breakdown || item.scores || {};
        const eff = b.Efficiency ?? b.efficiency ?? b.E ?? 0;
        const net = b.Network ?? b.network ?? b.N ?? 0;
        const exp = b.Experience ?? b.experience ?? b.Ex ?? 0;
        const out = b.Outreach ?? b.outreach ?? b.O ?? 0;
        const imp = b.Impact ?? b.impact ?? b.I ?? 0;

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-4 px-4 font-extrabold text-slate-700">#${item.rank}</td>
                <td class="py-4 px-4 font-bold text-slate-900">${item.chapter_name}</td>
                <td class="py-4 px-4 font-bold text-amber-600">
                    <span class="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                        <i class="fa-solid fa-star text-jci-gold"></i> ${item.qualified_stars} / 5
                    </span>
                </td>
                <td class="py-4 px-4 text-xs font-semibold text-slate-600">${item.efficiency_band}</td>
                <td class="py-4 px-4 font-black text-slate-900 text-sm">${item.total_score} pts</td>
                <td class="py-4 px-4 text-[11px] font-semibold space-x-1.5">
                    <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">E:${eff}</span>
                    <span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-bold">N:${net}</span>
                    <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">Ex:${exp}</span>
                    <span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">O:${out}</span>
                    <span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">I:${imp}</span>
                </td>
            </tr>
        `;
    }).join('');
}

export async function loadAnnualArchives() {
    const container = document.getElementById('archiveListContainer');
    if (!container) return;

    try {
        const res = await fetchAPI(`/archives/${encodeURIComponent(state.currentChapter)}`);
        if (!res.ok) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan untuk ${state.currentChapter}.</div>`;
            return;
        }

        const archives = await res.json();

        if (!Array.isArray(archives) || archives.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan untuk ${state.currentChapter}.</div>`;
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
        console.error("Gagal load archives (non-fatal):", err);
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan.</div>`;
    }
}