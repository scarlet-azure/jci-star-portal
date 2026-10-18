let calCurrentDate = new Date();
export let currentDeadlineFilter = null;

// Cache internal modul agar data tidak ter-reset saat navigasi bulan
let cachedStandardsData = [];
let cachedChapterSubmissions = {};

/**
 * Mengecek apakah tanggal deadline sudah terlewat (Expired)
 */
export function getDeadlineStatus(deadlineStr) {
    if (!deadlineStr) return { isExpired: false, diffDays: 999 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(deadlineStr);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    return {
        isExpired: diffDays < 0,
        diffDays: diffDays,
        formattedDate: String(deadlineStr).substring(0, 10)
    };
}

/**
 * Pindah bulan kalender (+1 atau -1)
 */
export function changeCalMonth(offset) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + offset);
    renderDeadlineCalendarWidget();
}

/**
 * Render Widget Kalender Deadline
 */
export function renderDeadlineCalendarWidget(standardsData = null, chapterSubmissions = null) {
    // Update cache jika data baru dikirim dari loadData()
    if (Array.isArray(standardsData) && standardsData.length > 0) {
        cachedStandardsData = standardsData;
    }
    if (chapterSubmissions && typeof chapterSubmissions === 'object' && Object.keys(chapterSubmissions).length > 0) {
        cachedChapterSubmissions = chapterSubmissions;
    }

    const gridContainer = document.getElementById('calGridDays');
    const monthTitle = document.getElementById('calMonthYearTitle');
    if (!gridContainer || !monthTitle) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    monthTitle.textContent = `${monthNames[month]} ${year}`;

    // Pemetaan Deadline menggunakan data dari cache
    const deadlineMap = {};
    cachedStandardsData.forEach(std => {
        const dStr = std.deadline ? String(std.deadline).substring(0, 10) : '';
        if (!dStr) return;

        if (!deadlineMap[dStr]) deadlineMap[dStr] = [];
        
        const stdId = std.id || std.standard_id || std.code;
        const sub = cachedChapterSubmissions[stdId];
        const isApproved = sub && (sub.status === 'Approved' || sub.status === 'APPROVED');
        const { isExpired } = getDeadlineStatus(std.deadline);

        deadlineMap[dStr].push({
            id: stdId,
            name: std.name || std.title,
            star: std.star || std.star_category,
            deadline: std.deadline,
            isApproved: isApproved,
            isExpired: isExpired
        });
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = new Date();

    let gridHtml = '';

    // Padding Hari Bulan Sebelumnya
    for (let i = firstDay; i > 0; i--) {
        const prevDay = prevMonthDays - i + 1;
        gridHtml += `<div class="py-1.5 text-slate-300 font-medium cursor-not-allowed text-center">${prevDay}</div>`;
    }

    // Hari Bulan Aktif
    for (let day = 1; day <= daysInMonth; day++) {
        const dayFormatted = String(day).padStart(2, '0');
        const monthFormatted = String(month + 1).padStart(2, '0');
        const dateKey = `${year}-${monthFormatted}-${dayFormatted}`;

        const itemsOnDate = deadlineMap[dateKey] || [];
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

        let dayBg = "hover:bg-slate-200 text-slate-700 font-medium cursor-pointer rounded-lg";

        if (itemsOnDate.length > 0) {
            const hasPendingActive = itemsOnDate.some(item => !item.isApproved && !item.isExpired);
            const hasPendingExpired = itemsOnDate.some(item => !item.isApproved && item.isExpired);

            if (hasPendingActive) {
                dayBg = "bg-rose-500 text-white font-extrabold rounded-lg shadow-xs cursor-pointer hover:bg-rose-600";
            } else if (hasPendingExpired) {
                dayBg = "bg-slate-400 text-white font-bold rounded-lg shadow-xs cursor-pointer hover:bg-slate-500";
            } else {
                dayBg = "bg-emerald-500 text-white font-extrabold rounded-lg shadow-xs cursor-pointer hover:bg-emerald-600";
            }
        } else if (isToday) {
            dayBg = "bg-jci-blue text-white font-black rounded-lg shadow-xs cursor-pointer hover:opacity-90";
        }

        let popupHtml = '';
        if (itemsOnDate.length > 0) {
            const listItems = itemsOnDate.map(i => {
                let badgeClass = 'bg-rose-100 text-rose-800';
                let statusText = 'Pending';

                if (i.isApproved) {
                    badgeClass = 'bg-emerald-100 text-emerald-800';
                    statusText = 'Approved';
                } else if (i.isExpired) {
                    badgeClass = 'bg-slate-200 text-slate-600';
                    statusText = 'Expired';
                }

                return `
                    <div class="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-none">
                        <span class="font-semibold text-slate-700 leading-tight"><strong class="text-jci-blue">[${i.id}]</strong> ${i.name}</span>
                        <span class="shrink-0 text-[9px] px-2 py-0.5 rounded-md font-extrabold ${badgeClass}">
                            ${statusText}
                        </span>
                    </div>
                `;
            }).join('');

            popupHtml = `
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-64 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xl text-left z-50 hidden group-hover:block pointer-events-auto before:content-[''] before:absolute before:top-full before:left-0 before:w-full before:h-3">
                    <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span><i class="fa-regular fa-calendar text-jci-blue mr-1"></i> ${day} ${monthNames[month]} ${year}</span>
                        <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${itemsOnDate.length} Deadline</span>
                    </div>
                    <div class="space-y-1 max-h-40 overflow-y-auto pr-1 text-slate-800 focus:outline-none">
                        ${listItems}
                    </div>
                </div>
            `;
        }

        gridHtml += `
            <div onclick="window.onCalendarDateClick ? window.onCalendarDateClick('${dateKey}') : null" class="py-1.5 rounded-lg text-center ${dayBg} relative group transition flex items-center justify-center">
                ${day}
                ${popupHtml}
            </div>
        `;
    }

    // Padding Hari Bulan Berikutnya
    const totalRendered = firstDay + daysInMonth;
    const nextDays = (42 - totalRendered) % 7;
    for (let j = 1; j <= nextDays; j++) {
        gridHtml += `<div class="py-1.5 text-slate-300 font-medium cursor-not-allowed text-center">${j}</div>`;
    }

    gridContainer.innerHTML = gridHtml;
}

/**
 * Handler saat tanggal kalender diklik
 */
export function onCalendarDateClick(dateStr) {
    currentDeadlineFilter = dateStr;

    // Filter data standar pada tanggal terkait
    const standardsOnDate = cachedStandardsData.filter(std => {
        return std.deadline && String(std.deadline).substring(0, 10) === dateStr;
    });

    // Jika ada standar dengan deadline pada tanggal tersebut, tampilkan Modal Rincian
    if (standardsOnDate.length > 0) {
        showDateDeadlineModal(dateStr, standardsOnDate);
    } else {
        // Jika tidak ada deadline khusus, langsung terapkan filter di halaman standards
        if (window.switchTab) window.switchTab('standards');
        if (window.renderCategoryPills) window.renderCategoryPills();
        if (window.renderStandardsList) window.renderStandardsList();
        showDeadlineFilterBadge(dateStr);
    }
}

/**
 * Menampilkan Modal Pop-up Rincian Deadline
 */
export function showDateDeadlineModal(dateStr, standardsList) {
    let modal = document.getElementById('dateDeadlineModal');

    // Jika modal belum ada di HTML DOM, buat secara dinamis
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dateDeadlineModal';
        modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden';
        document.body.appendChild(modal);
    }

    const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const userRole = localStorage.getItem('userRole') || window.state?.userRole || 'user';
    const isAdmin = userRole === 'admin' || userRole === 'EVALUATOR';

    const itemsHtml = standardsList.map(std => {
        const stdId = std.id || std.standard_id || std.code;
        const sub = cachedChapterSubmissions[stdId];
        const isApproved = sub && (sub.status === 'Approved' || sub.status === 'APPROVED');
        const { isExpired } = getDeadlineStatus(std.deadline || dateStr);

        let statusBadge = `<span class="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-rose-100 text-rose-800">Pending</span>`;
        if (isApproved) {
            statusBadge = `<span class="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-emerald-100 text-emerald-800">Approved</span>`;
        } else if (isExpired) {
            statusBadge = `<span class="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-slate-200 text-slate-600">Expired</span>`;
        }

        let actionBtnHtml = '';
        if (isApproved) {
            actionBtnHtml = `
                <span class="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <i class="fa-solid fa-circle-check"></i> Complete
                </span>
            `;
        } else if (isExpired && !isAdmin) {
            actionBtnHtml = `
                <button disabled class="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg font-bold text-xs cursor-not-allowed flex items-center gap-1 border border-slate-200">
                    <i class="fa-solid fa-lock text-[10px]"></i> Locked
                </button>
            `;
        } else {
            actionBtnHtml = `
                <button onclick="window.redirectToSubmissionModal('${stdId}', '${std.deadline || dateStr}')" class="px-3 py-1.5 bg-jci-blue hover:bg-jci-navy text-white rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer">
                    ${isExpired && isAdmin ? 'Admin Submit' : 'Submit'} <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
            `;
        }

        return `
            <div class="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase font-mono">${stdId}</span>
                        ${statusBadge}
                    </div>
                    <h5 class="text-xs font-bold text-slate-800 mt-1">${std.name || std.title}</h5>
                    <p class="text-[10px] text-slate-500">Max Score: ${std.max_score || 10} pts</p>
                </div>
                <div>
                    ${actionBtnHtml}
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-100">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <i class="fa-solid fa-calendar-day"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 text-sm">Deadline ${formattedDate}</h3>
                        <p class="text-[11px] text-slate-500">Daftar Standar 5-Star yang jatuh tempo hari ini</p>
                    </div>
                </div>
                <button onclick="window.closeDateDeadlineModal()" class="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                ${itemsHtml}
            </div>

            <div class="pt-2 text-right">
                <button onclick="window.closeDateDeadlineModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                    Tutup
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

export function closeDateDeadlineModal() {
    const modal = document.getElementById('dateDeadlineModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Redirect & Buka Modal Evidence Submission
 */
export function redirectToSubmissionModal(stdId, deadlineStr) {
    closeDateDeadlineModal();

    // 1. Pindah ke tab Standards jika sedang berada di tab lain
    if (window.switchTab) window.switchTab('standards');

    // 2. Cari data objek standar yang cocok dari cache internal
    const stdObj = cachedStandardsData.find(s => 
        String(s.id || s.standard_id || s.code) === String(stdId)
    );

    // Dapatkan judul standar dengan fallback aman agar tidak 'undefined'
    const stdTitle = stdObj 
        ? (stdObj.name || stdObj.title || stdId) 
        : stdId;

    // 3. Panggil openSubmissionModal dengan membawa ID atau Objek Standar
    if (typeof window.openSubmissionModal === 'function') {
        window.openSubmissionModal(stdId);
    }

    // 4. Update Judul Modal & Input Deadline secara Langsung
    setTimeout(() => {
        // Update Judul Header Modal
        const modalTitleEl = document.querySelector('#submissionModal h3') || 
                             document.querySelector('#submissionModal .modal-title') ||
                             document.getElementById('mSubTitleHeader');
        
        if (modalTitleEl) {
            modalTitleEl.textContent = `${stdId}. ${stdTitle}`;
        }

        // Set Input Deadline menjadi Read-Only
        const deadlineInput = document.getElementById('mSubDeadline') || 
                              document.getElementById('targetSubmissionDeadline');
        
        if (deadlineInput) {
            const finalDeadline = deadlineStr || (stdObj ? stdObj.deadline : '');
            deadlineInput.value = finalDeadline ? String(finalDeadline).substring(0, 10) : '31/12/2026';
            deadlineInput.setAttribute('readonly', 'true');
            deadlineInput.classList.add('bg-slate-100', 'cursor-not-allowed');
        }
    }, 50);
}

function showDeadlineFilterBadge(dateStr) {
    let container = document.getElementById('deadlineFilterBadgeContainer');
    const standardsHeader = document.getElementById('standardsSectionsContainer');

    if (!standardsHeader) return;

    if (!container) {
        container = document.createElement('div');
        container.id = 'deadlineFilterBadgeContainer';
        container.className = 'mb-4';
        standardsHeader.parentNode.insertBefore(container, standardsHeader);
    }

    container.innerHTML = `
        <div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
            <div class="flex items-center gap-2 font-bold">
                <i class="fa-solid fa-filter text-jci-blue"></i>
                <span>Filtering Standards for Deadline: <strong class="text-jci-blue">${dateStr}</strong></span>
            </div>
            <button onclick="window.clearDeadlineFilter()" class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer">
                <i class="fa-solid fa-xmark mr-1 text-rose-500"></i> Clear Date Filter
            </button>
        </div>
    `;
}

export function clearDeadlineFilter() {
    currentDeadlineFilter = null;
    const container = document.getElementById('deadlineFilterBadgeContainer');
    if (container) container.remove();
    if (window.renderStandardsList) window.renderStandardsList();
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userRole = localStorage.getItem('userRole') || window.state?.userRole || 'user';
    const isAdmin = userRole === 'admin' || userRole === 'EVALUATOR';

    // 1. Filter: Belum disubmit/approved DAN berada dalam jangkauan H-0 s.d H-30 hari
    const upcomingStds = standardsData.filter(std => {
        const stdId = std.id || std.standard_id || std.code;
        const sub = chapterSubmissions[stdId];

        // Cek apakah sudah disubmit / approved
        const isSubmittedOrApproved = sub && (
            sub.status === 'Approved' || 
            sub.status === 'APPROVED' || 
            sub.status === 'Submitted' || 
            sub.status === 'Pending'
        );
        if (isSubmittedOrApproved) return false;

        // Cek tanggal deadline
        if (!std.deadline) return false;
        const targetDate = new Date(std.deadline);
        targetDate.setHours(0, 0, 0, 0);

        // Hitung selisih hari dari hari ini
        const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

        // Hanya ambil yang belum expired (diffDays >= 0) DAN maksimal 30 hari ke depan (diffDays <= 30)
        return diffDays >= 0 && diffDays <= 30;
    }).map(std => {
        const targetDate = new Date(std.deadline);
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        return { ...std, diffDays };
    });

    // 2. Sort: Urutkan berdasarkan tanggal deadline terdekat (Ascending)
    upcomingStds.sort((a, b) => a.diffDays - b.diffDays);

    // Update jumlah penanda urgen
    if (urgentCount) {
        urgentCount.textContent = `${upcomingStds.length} Pending`;
    }

    if (upcomingStds.length === 0) {
        container.innerHTML = `
            <div class="p-4 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl italic">
                Tidak ada deadline standar dalam 30 hari ke depan.
            </div>
        `;
        return;
    }

    // 3. Render HTML dengan tombol bergaya sama persis seperti di Modal
    container.innerHTML = upcomingStds.map(std => {
        const stdId = std.id || std.standard_id || std.code;
        const stdName = std.name || std.title;
        const deadlineFormatted = String(std.deadline).substring(0, 10);
        const { isExpired } = getDeadlineStatus(std.deadline);

        let dayBadge = `<strong class="text-blue-600">(${std.diffDays}d left)</strong>`;
        if (std.diffDays === 0) {
            dayBadge = `<strong class="text-amber-600">(Today)</strong>`;
        }

        // Penentuan Tombol Aksi (Samakan persis dengan logika Modal)
        let actionBtnHtml = '';
        if (isExpired && !isAdmin) {
            actionBtnHtml = `
                <button disabled class="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg font-bold text-xs cursor-not-allowed flex items-center gap-1 border border-slate-200 shrink-0">
                    <i class="fa-solid fa-lock text-[10px]"></i> Locked
                </button>
            `;
        } else {
            actionBtnHtml = `
                <button onclick="window.redirectToSubmissionModal('${stdId}', '${std.deadline}')" class="px-3 py-1.5 bg-jci-blue hover:bg-jci-navy text-white rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer shrink-0">
                    ${isExpired && isAdmin ? 'Admin Submit' : 'Submit'} <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
            `;
        }

        return `
            <div class="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between transition gap-2">
                <div class="space-y-0.5">
                    <h5 class="font-bold text-xs text-slate-800 line-clamp-1">${stdId}. ${stdName}</h5>
                    <p class="text-[10px] text-slate-500">Target: ${deadlineFormatted} ${dayBadge}</p>
                </div>
                <div>
                    ${actionBtnHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Mengekspos fungsi ke objek window
if (typeof window !== 'undefined') {
    window.changeCalMonth = changeCalMonth;
    window.onCalendarDateClick = onCalendarDateClick;
    window.clearDeadlineFilter = clearDeadlineFilter;
    window.renderDeadlineCalendarWidget = renderDeadlineCalendarWidget;
    window.showDateDeadlineModal = showDateDeadlineModal;
    window.closeDateDeadlineModal = closeDateDeadlineModal;
    window.redirectToSubmissionModal = redirectToSubmissionModal;
    window.getDeadlineStatus = getDeadlineStatus;
}