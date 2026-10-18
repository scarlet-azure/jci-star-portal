import { state } from './auth.js';
import { renderDeadlineCalendarWidget, renderUpcomingDeadlines } from './calendar.js';

let radarChartInstance = null;

export function renderDashboard(data, allLeaderboardData = [], chapterSubmissions = {}, standardsData = []) {
    const isAdmin = (state.currentRole === 'ADMIN' || state.currentRole === 'UserRole.ADMIN');
    const adminOverview = document.getElementById('adminNationalOverview');
    
    if (isAdmin) {
        if (adminOverview) adminOverview.classList.remove('hidden');
        if (Array.isArray(allLeaderboardData) && allLeaderboardData.length > 0) {
            const statTotal = document.getElementById('statTotalChapters');
            if (statTotal) statTotal.textContent = allLeaderboardData.length;

            const totalScoreAll = allLeaderboardData.reduce((acc, curr) => acc + (curr.total_score || 0), 0);
            const statAvg = document.getElementById('statAvgScore');
            if (statAvg) statAvg.textContent = `${Math.round(totalScoreAll / allLeaderboardData.length)} pts`;

            const topChapter = allLeaderboardData[0];
            const statTopChap = document.getElementById('statTopChapter');
            if (statTopChap) statTopChap.textContent = topChapter ? topChapter.chapter_name : '-';
            
            const statTopSc = document.getElementById('statTopScore');
            if (statTopSc) statTopSc.textContent = topChapter ? `${topChapter.total_score || 0} pts` : '0 pts';
            
            const statTotalSub = document.getElementById('statTotalSubmissions');
            if (statTotalSub) statTotalSub.textContent = Object.keys(chapterSubmissions).length || '0';
        }
    } else {
        if (adminOverview) adminOverview.classList.add('hidden');
    }

    const titleEl = document.getElementById('dashChapterTitle');
    if (titleEl) titleEl.textContent = state.currentChapter;

    const bandEl = document.getElementById('dashOverallBand');
    if (bandEl) bandEl.textContent = data.efficiency_band || "Under Minimum Standard (<90 pts)";

    // 1. HITUNG MAX SCORE DINAMIS PER KATEGORI DARI STANDARDS DATA
    const dynamicMaxScores = {
        Efficiency: 0,
        Network: 0,
        Experience: 0,
        Outreach: 0,
        Impact: 0
    };

    if (Array.isArray(standardsData) && standardsData.length > 0) {
        standardsData.forEach(std => {
            let cat = std.star || std.star_category || 'EFFICIENCY';
            if (typeof cat === 'object' && cat !== null) cat = cat.value || cat.name || 'EFFICIENCY';
            cat = String(cat).toUpperCase();

            const scoreVal = parseInt(std.max_score || std.weight || 10);

            if (cat.includes('EFF') || cat === 'EFFICIENCY') dynamicMaxScores.Efficiency += scoreVal;
            else if (cat.includes('NET') || cat === 'NETWORK') dynamicMaxScores.Network += scoreVal;
            else if (cat.includes('EXP') || cat === 'EXPERIENCE') dynamicMaxScores.Experience += scoreVal;
            else if (cat.includes('OUT') || cat === 'OUTREACH') dynamicMaxScores.Outreach += scoreVal;
            else if (cat.includes('IMP') || cat === 'IMPACT') dynamicMaxScores.Impact += scoreVal;
        });
    }

    // Fallback jika standardsData belum terload/kosong
    if (dynamicMaxScores.Efficiency === 0) dynamicMaxScores.Efficiency = 140;
    if (dynamicMaxScores.Network === 0) dynamicMaxScores.Network = 250;
    if (dynamicMaxScores.Experience === 0) dynamicMaxScores.Experience = 250;
    if (dynamicMaxScores.Outreach === 0) dynamicMaxScores.Outreach = 250;
    if (dynamicMaxScores.Impact === 0) dynamicMaxScores.Impact = 250;

    // 2. SKOR TERAKHIR CHAPTER
    // 2. SKOR TERAKHIR CHAPTER (dengan Fallback Multi-Structure)
    let b = data.breakdown || data.scores || data.scores_by_category || {};

    // Jika data berupa JSON String dari DB (misal kolom 'form_data' / 'scores')
    if (typeof b === 'string') {
        try { b = JSON.parse(b); } catch (e) { b = {}; }
    }

    // Ekstraksi nilai dengan fallback aman
    const totals = {
        Efficiency: b.Efficiency ?? b.efficiency ?? b.EFFICIENCY ?? b.E ?? 0,
        Network:    b.Network    ?? b.network    ?? b.NETWORK    ?? b.N ?? 0,
        Experience: b.Experience ?? b.experience ?? b.EXPERIENCE ?? b.Ex ?? 0,
        Outreach:   b.Outreach   ?? b.outreach   ?? b.OUTREACH   ?? b.O ?? 0,
        Impact:     b.Impact     ?? b.impact     ?? b.IMPACT     ?? b.I ?? 0
    };

    // FALLBACK TAMBAHAN: Jika total breakdown nol tapi ada evaluator_score / total_score utama
    const mainScore = data.total_score || data.evaluator_score || data.estimated_score || 0;
    const currentSum = Object.values(totals).reduce((acc, curr) => acc + curr, 0);

    // Jika total breakdown masih 0 tapi mainScore ada, distribusikan sementara ke Efficiency
    if (currentSum === 0 && mainScore > 0) {
        totals.Efficiency = mainScore;
    }
    
    if (document.getElementById('score-eff')) document.getElementById('score-eff').textContent = `${totals.Efficiency} pts`;
    if (document.getElementById('score-net')) document.getElementById('score-net').textContent = `${totals.Network} pts`;
    if (document.getElementById('score-exp')) document.getElementById('score-exp').textContent = `${totals.Experience} pts`;
    if (document.getElementById('score-out')) document.getElementById('score-out').textContent = `${totals.Outreach} pts`;
    if (document.getElementById('score-imp')) document.getElementById('score-imp').textContent = `${totals.Impact} pts`;

    const effQualified = (totals.Efficiency || 0) >= 100;
    const starsStatus = {
        eff: effQualified,
        net: effQualified && (totals.Network || 0) >= 250,
        exp: effQualified && (totals.Experience || 0) >= 250,
        out: effQualified && (totals.Outreach || 0) >= 250,
        imp: effQualified && (totals.Impact || 0) >= 250
    };

    ['eff', 'net', 'exp', 'out', 'imp'].forEach(key => {
        const icon = document.getElementById(`starIcon-${key}`);
        const scoreText = document.getElementById(`score-${key}`);
        const parentBox = document.getElementById(`starBox-${key}`);
        if (icon && scoreText && parentBox) {
            if (starsStatus[key]) {
                icon.className = "fa-solid fa-star text-jci-gold text-base mb-1 filter drop-shadow-[0_0_8px_rgba(255,184,0,0.8)] animate-pulse";
                scoreText.className = "text-xs font-bold text-amber-300";
                parentBox.className = "flex flex-col items-center justify-center p-2 rounded-lg bg-amber-500/20 border border-jci-gold/60 min-w-[65px]";
            } else {
                icon.className = "fa-solid fa-star text-slate-500/70 text-base mb-1";
                scoreText.className = "text-xs font-semibold text-slate-300";
                parentBox.className = "flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/50 border border-white/10 min-w-[65px]";
            }
        }
    });

    renderRadarChart(totals, dynamicMaxScores);
    renderStarCardsList(totals, dynamicMaxScores);
    
    renderDeadlineCalendarWidget(standardsData, chapterSubmissions);
    renderUpcomingDeadlines(standardsData, chapterSubmissions);
}

export function renderRadarChart(totals, maxTargets) {
    const ctx = document.getElementById('starRadarChart');
    if (!ctx) return;
    if (radarChartInstance) radarChartInstance.destroy();

    const categories = ['Efficiency', 'Network', 'Experience', 'Outreach', 'Impact'];
    const rawScores = categories.map(cat => totals[cat] || 0);

    const percentages = categories.map((cat, index) => {
        const target = maxTargets[cat] || 100;
        return Math.min(100, Math.round((rawScores[index] / target) * 100));
    });

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Achievement (%)',
                data: percentages,
                backgroundColor: 'rgba(0, 163, 224, 0.2)',
                borderColor: '#00A3E0',
                pointBackgroundColor: '#FFB800',
                pointBorderColor: '#fff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    beginAtZero: true,
                    angleLines: { color: '#e2e8f0' },
                    grid: { color: '#f1f5f9' },
                    pointLabels: { font: { size: 10, weight: 'bold' }, color: '#475569' },
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const cat = categories[context.dataIndex];
                            const currentScore = rawScores[context.dataIndex];
                            const maxScore = maxTargets[cat] || 100;
                            return ` Score: ${currentScore} / ${maxScore} pts (${context.raw}%)`;
                        }
                    }
                }
            }
        }
    });
}

export function renderStarCardsList(totals, maxTargets) {
    const container = document.getElementById('starCardsList');
    if (!container) return;

    const effScore = totals.Efficiency || 0;

    const starsConfig = [
        { 
            star: 'Efficiency', 
            catKey: 'EFFICIENCY', 
            reqText: 'Qualify: Score >= 100 pts', 
            target: maxTargets.Efficiency || 140, 
            score: effScore, 
            isQual: effScore >= 100,
            desc: 'Healthy operational governance, financial discipline, & compliance.' 
        },
        { 
            star: 'Network', 
            catKey: 'NETWORK', 
            reqText: 'Qualify: Eff >= 90 & Net >= 250 pts', 
            target: maxTargets.Network || 250, 
            score: totals.Network || 0, 
            isQual: effScore >= 90 && (totals.Network || 0) >= 250,
            desc: 'Connecting members to regional, national, & international conventions.' 
        },
        { 
            star: 'Experience', 
            catKey: 'EXPERIENCE', 
            reqText: 'Qualify: Eff >= 90 & Exp >= 250 pts', 
            target: maxTargets.Experience || 250, 
            score: totals.Experience || 0, 
            isQual: effScore >= 90 && (totals.Experience || 0) >= 250,
            desc: 'Structured member development, leadership roles, and competitions.' 
        },
        { 
            star: 'Outreach', 
            catKey: 'OUTREACH', 
            reqText: 'Qualify: Eff >= 90 & Out >= 250 pts', 
            target: maxTargets.Outreach || 250, 
            score: totals.Outreach || 0, 
            isQual: effScore >= 90 && (totals.Outreach || 0) >= 250,
            desc: 'External visibility, media recognition, and strategic partnerships.' 
        },
        { 
            star: 'Impact', 
            catKey: 'IMPACT', 
            reqText: 'Qualify: Eff >= 90 & Imp >= 250 pts', 
            target: maxTargets.Impact || 250, 
            score: totals.Impact || 0, 
            isQual: effScore >= 90 && (totals.Impact || 0) >= 250,
            desc: 'Measurable outcomes, community projects, and movement contribution.' 
        }
    ];

    container.innerHTML = starsConfig.map(sc => {
        const percent = Math.min(100, Math.round((sc.score / sc.target) * 100));

        return `
            <div class="bg-white rounded-2xl p-5 border ${sc.isQual ? 'border-jci-gold shadow-md' : 'border-slate-200 shadow-sm'} flex items-center justify-between">
                <div class="space-y-1 flex-grow">
                    <div class="flex items-center space-x-2">
                        <span class="text-base font-extrabold text-slate-900">${sc.star} Star</span>
                        ${sc.isQual 
                            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"><i class="fa-solid fa-star text-jci-gold"></i> QUALIFIED</span>' 
                            : '<span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500">In Progress</span>'
                        }
                    </div>
                    <p class="text-xs text-slate-500">${sc.desc}</p>
                    <div class="text-[11px] font-semibold text-slate-400">${sc.reqText}</div>
                    <div class="w-full bg-slate-100 rounded-full h-2 mt-2 max-w-md border border-slate-200">
                        <div class="${sc.isQual ? 'bg-jci-gold' : 'bg-jci-blue'} h-2 rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="text-right min-w-[110px] pl-4 border-l border-slate-100">
                    <span class="text-2xl font-black text-slate-800">${sc.score}</span>
                    <span class="text-xs text-slate-400"> / ${sc.target} pts</span>
                    <button onclick="if(window.switchTab) window.switchTab('standards'); setTimeout(() => { if(window.filterCategory) window.filterCategory('${sc.catKey}'); }, 50);" class="mt-2 text-xs text-jci-blue font-semibold hover:underline block cursor-pointer">Manage Standards &rarr;</button>
                </div>
            </div>
        `;
    }).join('');
}