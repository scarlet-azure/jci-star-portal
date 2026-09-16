import { state } from './auth.js';

let radarChartInstance = null;
let calCurrentDate = new Date(2026, 8, 1);

export function renderDashboard(data, allLeaderboardData = [], chapterSubmissions = {}) {
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

    const b = data.breakdown || data.scores || {};
    const totals = {
        Efficiency: b.Efficiency ?? b.efficiency ?? b.E ?? 0,
        Network: b.Network ?? b.network ?? b.N ?? 0,
        Experience: b.Experience ?? b.experience ?? b.Ex ?? 0,
        Outreach: b.Outreach ?? b.outreach ?? b.O ?? 0,
        Impact: b.Impact ?? b.impact ?? b.I ?? 0
    };
    
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

    renderRadarChart(totals);
    renderStarCardsList(totals);
}

export function renderRadarChart(totals) {
    const ctx = document.getElementById('starRadarChart');
    if (!ctx) return;
    if (radarChartInstance) radarChartInstance.destroy();

    const categories = ['Efficiency', 'Network', 'Experience', 'Outreach', 'Impact'];
    const maxTargets = { Efficiency: 140, Network: 250, Experience: 250, Outreach: 250, Impact: 250 };
    const rawScores = categories.map(cat => totals[cat] || 0);

    const percentages = categories.map((cat, index) => {
        return Math.min(100, Math.round((rawScores[index] / maxTargets[cat]) * 100));
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
                            const maxScore = maxTargets[cat];
                            return ` Score: ${currentScore} / ${maxScore} pts (${context.raw}%)`;
                        }
                    }
                }
            }
        }
    });
}

export function renderStarCardsList(totals) {
    const container = document.getElementById('starCardsList');
    if (!container) return;

    const starsConfig = [
        { star: 'Efficiency', reqText: 'Qualify: Score >= 100 pts', target: 100, score: totals.Efficiency || 0, desc: 'Healthy operational governance, financial discipline, & compliance.' },
        { star: 'Network', reqText: 'Qualify: Eff >= 90 & Net >= 250 pts', target: 250, score: totals.Network || 0, desc: 'Connecting members to regional, national, & international conventions.' },
        { star: 'Experience', reqText: 'Qualify: Eff >= 90 & Exp >= 250 pts', target: 250, score: totals.Experience || 0, desc: 'Structured member development, leadership roles, and competitions.' },
        { star: 'Outreach', reqText: 'Qualify: Eff >= 90 & Out >= 250 pts', target: 250, score: totals.Outreach || 0, desc: 'External visibility, media recognition, and strategic partnerships.' },
        { star: 'Impact', reqText: 'Qualify: Eff >= 90 & Imp >= 250 pts', target: 250, score: totals.Impact || 0, desc: 'Measurable outcomes, community projects, and movement contribution.' }
    ];

    container.innerHTML = starsConfig.map(sc => {
        const isQual = sc.score >= sc.target;
        const percent = Math.min(100, Math.round((sc.score / sc.target) * 100));

        return `
            <div class="bg-white rounded-2xl p-5 border ${isQual ? 'border-jci-gold shadow-md' : 'border-slate-200 shadow-sm'} flex items-center justify-between">
                <div class="space-y-1 flex-grow">
                    <div class="flex items-center space-x-2">
                        <span class="text-base font-extrabold text-slate-900">${sc.star} Star</span>
                        ${isQual ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"><i class="fa-solid fa-star text-jci-gold"></i> QUALIFIED</span>' : '<span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500">In Progress</span>'}
                    </div>
                    <p class="text-xs text-slate-500">${sc.desc}</p>
                    <div class="text-[11px] font-semibold text-slate-400">${sc.reqText}</div>
                    <div class="w-full bg-slate-100 rounded-full h-2 mt-2 max-w-md border border-slate-200">
                        <div class="${isQual ? 'bg-jci-gold' : 'bg-jci-blue'} h-2 rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="text-right min-w-[110px] pl-4 border-l border-slate-100">
                    <span class="text-2xl font-black text-slate-800">${sc.score}</span>
                    <span class="text-xs text-slate-400"> / ${sc.target} pts</span>
                    <button onclick="switchTab('standards'); filterCategory('${sc.star.toUpperCase()}');" class="mt-2 text-xs text-jci-blue font-semibold hover:underline block">Manage Standards &rarr;</button>
                </div>
            </div>
        `;
    }).join('');
}

export function changeCalMonth(offset) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + offset);
    if (window.renderDeadlineCalendarWidget) window.renderDeadlineCalendarWidget();
}

export function renderDeadlineCalendarWidget(standardsData = [], chapterSubmissions = {}) {
    const gridContainer = document.getElementById('calGridDays');
    const monthTitle = document.getElementById('calMonthYearTitle');
    if (!gridContainer || !monthTitle) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthTitle.textContent = `${monthNames[month]} ${year}`;

    const deadlineMap = {};
    standardsData.forEach(std => {
        const dStr = std.deadline || '2026-12-31';
        if (!deadlineMap[dStr]) deadlineMap[dStr] = [];
        
        const stdId = std.id || std.standard_id || std.code;
        const sub = chapterSubmissions[stdId];
        const isApproved = sub && (sub.status === 'Approved' || sub.status === 'APPROVED');

        deadlineMap[dStr].push({
            id: stdId,
            name: std.name || std.title,
            star: std.star || std.star_category,
            isApproved: isApproved
        });
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let gridHtml = '';
    for (let i = 0; i < firstDay; i++) {
        gridHtml += `<div class="p-1.5"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayFormatted = String(day).padStart(2, '0');
        const monthFormatted = String(month + 1).padStart(2, '0');
        const dateKey = `${year}-${monthFormatted}-${dayFormatted}`;

        const itemsOnDate = deadlineMap[dateKey] || [];
        let dayBg = "hover:bg-slate-200 text-slate-700 font-medium cursor-pointer";

        if (itemsOnDate.length > 0) {
            const hasPending = itemsOnDate.some(item => !item.isApproved);
            dayBg = hasPending 
                ? "bg-rose-500 text-white font-extrabold rounded-lg shadow-sm cursor-pointer hover:bg-rose-600" 
                : "bg-emerald-500 text-white font-extrabold rounded-lg shadow-sm cursor-pointer hover:bg-emerald-600";
        }

        let popupHtml = '';
        if (itemsOnDate.length > 0) {
            const listItems = itemsOnDate.map(i => `
                <div class="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-none">
                    <span class="font-semibold text-slate-700 leading-tight"><strong class="text-jci-blue">[${i.id}]</strong> ${i.name}</span>
                    <span class="shrink-0 text-[9px] px-2 py-0.5 rounded-md font-extrabold ${i.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${i.isApproved ? 'Approved' : 'Pending'}
                    </span>
                </div>
            `).join('');

            popupHtml = `
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xl text-left z-50 hidden group-hover:block pointer-events-none">
                    <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span><i class="fa-regular fa-calendar text-jci-blue mr-1"></i> ${day} ${monthNames[month]} ${year}</span>
                        <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${itemsOnDate.length} Deadline</span>
                    </div>
                    <div class="space-y-1 max-h-40 overflow-y-auto pr-1">${listItems}</div>
                </div>
            `;
        }

        gridHtml += `
            <div class="p-1.5 rounded-lg text-center ${dayBg} relative group transition">
                ${day}
                ${popupHtml}
            </div>
        `;
    }
    gridContainer.innerHTML = gridHtml;
}

export function getDaysLeftText(deadlineStr) {
    if (!deadlineStr) return 'No Deadline';
    const targetDate = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);

    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `<span class="text-rose-600 font-bold">${deadlineStr} (Expired)</span>`;
    if (diffDays === 0) return `<span class="text-amber-600 font-bold">${deadlineStr} (Today)</span>`;
    return `<span class="text-slate-600">${deadlineStr} <strong class="text-blue-600">(${diffDays}d left)</strong></span>`;
}

export function renderUpcomingDeadlines(standardsData = [], chapterSubmissions = {}) {
    const container = document.getElementById('upcomingDeadlinesList');
    const urgentCount = document.getElementById('urgentCount');
    if (!container) return;

    const pendingStds = standardsData.filter(std => {
        const stdId = std.id || std.standard_id || std.code;
        const sub = chapterSubmissions[stdId];
        return !sub || (sub.status !== 'Approved' && sub.status !== 'APPROVED');
    });

    if (urgentCount) urgentCount.textContent = `${pendingStds.length} Pending`;

    container.innerHTML = pendingStds.slice(0, 5).map(std => {
        const stdId = std.id || std.standard_id || std.code;
        const stdName = std.name || std.title;
        return `
            <div class="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between">
                <div>
                    <span class="font-bold text-slate-800">${stdId}. ${stdName}</span>
                    <p class="text-[10px] text-slate-400">Target: ${getDaysLeftText(std.deadline || '2026-12-31')}</p>
                </div>
                <span class="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded">Action Needed</span>
            </div>
        `;
    }).join('');
}