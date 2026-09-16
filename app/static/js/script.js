const API_BASE = window.location.origin;
let isLoggedIn = false;
let currentRole = 'CHAPTER_PIC';
let currentChapter = 'JCI Jakarta';
let currentCategoryFilter = 'ALL';
let currentUserFullName = '';
let currentUserEmail = '';
let standardsData = [];
let chapterSubmissions = {};
let loadedChaptersList = [];
let radarChartInstance = null;
let calCurrentDate = new Date(2026, 8, 1);

function checkAuthSession() {
    loadChapters();

    const savedChapter = localStorage.getItem('jci_chapter');
    const savedRole = localStorage.getItem('jci_role');
    const savedEmail = localStorage.getItem('jci_email');
    const savedName = localStorage.getItem('jci_name');

    if (savedEmail && savedRole) {
        isLoggedIn = true;
        currentRole = savedRole;
        
        if (savedChapter && (savedRole === 'CHAPTER_PIC' || savedRole === 'UserRole.CHAPTER_PIC')) {
            currentChapter = savedChapter;
        }
        
        currentUserEmail = savedEmail;
        currentUserFullName = savedName || savedEmail;

        document.getElementById('landingLoginScreen').classList.add('hidden');
        document.getElementById('headerUserLabel').textContent = 
            (currentRole === 'ADMIN' || currentRole === 'UserRole.ADMIN') 
                ? `${currentUserFullName} (Admin)` 
                : `${currentUserFullName} (${currentChapter})`;

        applyRolePermissions();
        loadData();
    } else {
        isLoggedIn = false;
        document.getElementById('landingLoginScreen').classList.remove('hidden');
    }
}

function applyRolePermissions() {
    const headerSelectWrapper = document.getElementById('headerChapterSelectWrapper');
    const tabEvaluatorBtn = document.getElementById('tabBtn-evaluator');
    const adminPendingCard = document.getElementById('adminPendingUsersCard');

    const isAdmin = (currentRole === 'ADMIN' || currentRole === 'UserRole.ADMIN');

    if (isAdmin) {
        if (headerSelectWrapper) headerSelectWrapper.classList.remove('hidden');
        if (tabEvaluatorBtn) tabEvaluatorBtn.classList.remove('hidden');
        if (adminPendingCard) {
            adminPendingCard.classList.remove('hidden');
            loadPendingUsers();
        }

        document.getElementById('roleAlertBanner').className = "mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between shadow-sm";
        document.getElementById('roleBannerTitle').textContent = "Active Mode: National Admin / Evaluator Desk";
        document.getElementById('roleBannerDesc').innerHTML = `You have full verification privileges. Audit chapter submissions, edit standards, and manage national chapter roster.`;
        document.getElementById('roleTag').textContent = "Admin Mode";
    } else {
        if (headerSelectWrapper) headerSelectWrapper.classList.add('hidden');
        if (tabEvaluatorBtn) tabEvaluatorBtn.classList.add('hidden');
        if (adminPendingCard) adminPendingCard.classList.add('hidden');

        document.getElementById('roleAlertBanner').className = "mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start justify-between shadow-sm";
        document.getElementById('roleBannerTitle').textContent = `Active Mode: Chapter PIC (${currentChapter})`;
        document.getElementById('roleBannerDesc').innerHTML = `You are managing standard entries for <strong>${currentChapter}</strong>. Submit standard evidence files and track progress.`;
        document.getElementById('roleTag').textContent = "PIC Mode";

        const activeTab = document.querySelector('.tab-content:not(.hidden)');
        if (activeTab && activeTab.id === 'tab-evaluator') {
            switchTab('dashboard');
        }
    }
}

function switchLandingForm(view) {
    document.getElementById('loginAlert').classList.add('hidden');
    document.getElementById('landingLoginForm').classList.add('hidden');
    document.getElementById('landingRegisterForm').classList.add('hidden');
    document.getElementById('landingForgotForm').classList.add('hidden');
    document.getElementById('landingResetForm').classList.add('hidden');

    if (view === 'login') document.getElementById('landingLoginForm').classList.remove('hidden');
    if (view === 'register') {
        loadChapters();
        document.getElementById('landingRegisterForm').classList.remove('hidden');
    }
    if (view === 'forgot') document.getElementById('landingForgotForm').classList.remove('hidden');
    if (view === 'reset') document.getElementById('landingResetForm').classList.remove('hidden');
}

function showLoginAlert(message, type = 'error') {
    const alertBox = document.getElementById('loginAlert');
    const alertText = document.getElementById('loginAlertText');
    const alertIcon = document.getElementById('loginAlertIcon');

    alertBox.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'border', 'border-rose-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200');

    if (type === 'error') {
        alertBox.classList.add('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200');
        alertIcon.className = "fa-solid fa-circle-exclamation text-rose-500 text-sm";
    } else {
        alertBox.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
        alertIcon.className = "fa-solid fa-circle-check text-emerald-500 text-sm";
    }

    if (typeof message === 'object') {
        alertText.textContent = message.detail || JSON.stringify(message);
    } else {
        alertText.textContent = message;
    }
}

async function handleAuthLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btnLoginSubmit');
    const alertBox = document.getElementById('loginAlert');
    alertBox.classList.add('hidden');

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin"></i> <span>Verifying...</span>`;

    const email = document.getElementById('lEmail').value.trim();
    const password = document.getElementById('lPassword').value;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }) 
        });
        
        let result = await res.json();
        if (!res.ok) throw result;

        showLoginAlert("Login Berhasil! Mengarahkan...", "success");

        isLoggedIn = true;
        currentRole = result.role;
        currentUserEmail = result.email || email;
        currentUserFullName = result.full_name || currentUserEmail;

        if (result.chapter_name && (result.role === 'CHAPTER_PIC' || result.role === 'UserRole.CHAPTER_PIC')) {
            currentChapter = result.chapter_name;
        }

        localStorage.setItem('jci_email', currentUserEmail);
        localStorage.setItem('jci_name', currentUserFullName);
        localStorage.setItem('jci_role', currentRole);
        localStorage.setItem('jci_chapter', currentChapter);

        setTimeout(() => {
            document.getElementById('landingLoginScreen').classList.add('hidden');
            document.getElementById('headerUserLabel').textContent = 
                (currentRole === 'ADMIN' || currentRole === 'UserRole.ADMIN') 
                    ? `${currentUserFullName} (Admin)` 
                    : `${currentUserFullName} (${currentChapter})`;

            applyRolePermissions();
            loadData();
        }, 500);

    } catch (err) {
        let errorMsg = "Email atau password salah";
        if (typeof err === 'string') errorMsg = err;
        else if (err && typeof err.detail === 'string') errorMsg = err.detail;

        showLoginAlert(errorMsg, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Sign In to Portal</span>`;
    }
}

async function handleAuthRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('lRegFullName').value.trim();
    const email = document.getElementById('lRegEmail').value.trim();
    const password = document.getElementById('lRegPassword').value;
    const chapter = document.getElementById('lRegChapterSelect').value;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName, email, password, chapter_name: chapter }) 
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Registrasi Gagal");

        showLoginAlert(result.message, "success");
        switchLandingForm('login');
    } catch (err) {
        showLoginAlert(err.message, "error");
    }
}

async function handleAuthForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('lForgotEmail').value.trim();

    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal mengirim OTP");

        showLoginAlert(result.message, "success");
        document.getElementById('lResetEmail').value = email;
        switchLandingForm('reset');
    } catch (err) {
        showLoginAlert(err.message, "error");
    }
}

async function handleAuthResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('lResetEmail').value.trim();
    const code = document.getElementById('lResetCode').value.trim();
    const new_password = document.getElementById('lResetNewPassword').value;

    try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, new_password })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal memperbarui password");

        showLoginAlert(result.message, "success");
        switchLandingForm('login');
    } catch (err) {
        showLoginAlert(err.message, "error");
    }
}

function handleLogout() {
    localStorage.clear();
    isLoggedIn = false;
    location.reload();
}

async function loadChapters() {
    try {
        const res = await fetch(`${API_BASE}/chapters`);
        loadedChaptersList = await res.json();
        
        const selectTop = document.getElementById('chapterSelect');
        const selectEval = document.getElementById('evalChapterSelect');
        const selectReg = document.getElementById('lRegChapterSelect');
        const evalChapterBadgeList = document.getElementById('evaluatorChapterList');

        const optionsHtml = loadedChaptersList.map(c => `
            <option value="${c.name}" class="text-slate-900" ${c.name === currentChapter ? 'selected' : ''}>
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

async function handleAddChapter() {
    const input = document.getElementById('newChapterNameInput');
    const name = input.value.trim();
    if (!name) return alert("Silakan masukkan nama Chapter baru!");

    try {
        const res = await fetch(`${API_BASE}/chapters`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
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

async function handleDeleteChapter(chapName) {
    if (!confirm(`Apakah Anda yakin ingin menghapus chapter "${chapName}"?`)) return;

    try {
        const res = await fetch(`${API_BASE}/chapters/${encodeURIComponent(chapName)}`, { method: 'DELETE' });
        const result = await res.json();
        alert(result.message || "Chapter berhasil dihapus!");
        loadChapters();
    } catch (err) {
        alert("Gagal menghapus chapter: " + err.message);
    }
}

function openStandardModalForAdd() {
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

function openStandardModalForEdit(stdId) {
    const std = standardsData.find(s => s.id === stdId);
    if (!std) return;

    document.getElementById('sFormMode').value = 'edit';
    document.getElementById('stdModalTitle').textContent = `Edit Standard: ${std.id}`;
    document.getElementById('sId').value = std.id;
    document.getElementById('sId').disabled = true;
    document.getElementById('sName').value = std.name || '';
    document.getElementById('sStar').value = (std.star || 'EFFICIENCY').toUpperCase();
    document.getElementById('sPurpose').value = std.purpose || '';
    document.getElementById('sScore').value = std.max_score || 10;
    document.getElementById('sDeadline').value = std.deadline ? std.deadline.substring(0,10) : '2026-12-31';
    
    document.getElementById('standardModal').classList.remove('hidden');
}

function closeStandardModal() {
    document.getElementById('standardModal').classList.add('hidden');
}

async function handleStandardFormSubmit(e) {
    e.preventDefault();
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
        let url = `${API_BASE}/standards`;
        let method = 'POST';

        if (mode === 'edit') {
            url = `${API_BASE}/standards/${payload.id}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menyimpan standar");
        
        alert(result.message || "Standard berhasil disimpan!");
        closeStandardModal();
        loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

async function handleDeleteStandard(stdId) {
    if (!confirm(`HAPUS STANDAR?\nApakah Anda yakin ingin menghapus standar [${stdId}]?`)) return;

    try {
        const res = await fetch(`${API_BASE}/standards/${encodeURIComponent(stdId)}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal menghapus standar");
        
        alert(result.message || "Standard berhasil dihapus!");
        loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

function openAuditModal(subId) {
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

function closeAuditModal() {
    document.getElementById('auditModal').classList.add('hidden');
}

function handleAuditStatusChange(status) {
    const scoreGroup = document.getElementById('auditScoreGroup');
    if (status === 'Approved') {
        scoreGroup.classList.remove('hidden');
    } else {
        scoreGroup.classList.add('hidden');
    }
}

async function handleAuditFormSubmit(e) {
    e.preventDefault();
    const subId = document.getElementById('auditSubId').value;
    const status = document.getElementById('auditStatus').value;
    const score = status === 'Approved' ? parseInt(document.getElementById('auditScore').value || 0) : 0;
    const notes = document.getElementById('auditNotes').value.trim();

    try {
        const res = await fetch(`${API_BASE}/admin/verify/${subId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status, score_earned: score, evaluator_notes: notes })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal mengaudit submission");

        alert(result.message || "Audit berhasil disimpan!");
        closeAuditModal();
        loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

function changeChapter(chap) {
    currentChapter = chap;
    document.getElementById('dashChapterTitle').textContent = chap;
    const subTitle = document.getElementById('evalAuditSubtitle');
    if (subTitle) subTitle.textContent = `Showing submissions for ${chap}`;
    loadData();
}

function switchTab(tabId) {
    if (tabId === 'evaluator' && currentRole !== 'ADMIN' && currentRole !== 'UserRole.ADMIN') {
        alert("Evaluator Portal hanya dapat diakses oleh National Admin.");
        return;
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('border-jci-blue', 'text-jci-blue', 'font-semibold');
        btn.classList.add('border-transparent', 'text-slate-500', 'font-medium');
    });
    const active = document.getElementById(`tabBtn-${tabId}`);
    if (active) {
        active.classList.remove('border-transparent', 'text-slate-500', 'font-medium');
        active.classList.add('border-jci-blue', 'text-jci-blue', 'font-semibold');
    }
}

async function loadData() {
    try {
        await loadChapters();
        const [stdRes, subRes, leadRes] = await Promise.all([
            fetch(`${API_BASE}/standards`),
            fetch(`${API_BASE}/submissions/${encodeURIComponent(currentChapter)}`),
            fetch(`${API_BASE}/leaderboard`)
        ]);

        standardsData = await stdRes.json();
        const subRaw = await subRes.json();
        
        chapterSubmissions = {};
        if (Array.isArray(subRaw)) {
            subRaw.forEach(s => { chapterSubmissions[s.standard_id] = s; });
        } else if (typeof subRaw === 'object' && subRaw !== null) {
            chapterSubmissions = subRaw;
        }

        const leaderboardData = await leadRes.json();

        let currentLeaderboard = leaderboardData.find(l => l.chapter_name === currentChapter) || {
            efficiency_band: "Under Minimum Standard (<90 pts)",
            total_score: 0,
            qualified_stars: 0,
            breakdown: { Efficiency: 0, Network: 0, Experience: 0, Outreach: 0, Impact: 0 }
        };

        renderCategoryPills();
        renderDashboard(currentLeaderboard, leaderboardData);
        renderDeadlineCalendarWidget();
        renderUpcomingDeadlines();
        renderStandardsList();
        renderEvaluatorPortal();
        renderAdminStandardsList();
        renderLeaderboard(leaderboardData);
        loadAnnualArchives();
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

function renderCategoryPills() {
    const container = document.getElementById('categoryPillsContainer');
    if (!container) return;

    const counts = { ALL: standardsData.length };
    const categories = ['ALL', 'EFFICIENCY', 'NETWORK', 'EXPERIENCE', 'OUTREACH', 'IMPACT'];
    
    categories.slice(1).forEach(cat => {
        counts[cat] = standardsData.filter(s => s.star && s.star.toUpperCase() === cat).length;
    });
    
    container.innerHTML = categories.map(cat => {
        const countText = counts[cat] !== undefined ? ` (${counts[cat]})` : '';
        return `
            <button onclick="filterCategory('${cat}')" class="px-3.5 py-2 rounded-xl font-bold text-xs transition ${currentCategoryFilter === cat ? 'bg-jci-navy text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                ${cat}${countText}
            </button>
        `;
    }).join('');
}

function filterCategory(cat) {
    currentCategoryFilter = cat;
    renderCategoryPills();
    renderStandardsList();
}

function changeCalMonth(offset) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + offset);
    renderDeadlineCalendarWidget();
}

function renderDeadlineCalendarWidget() {
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
        
        const sub = chapterSubmissions[std.id];
        const isApproved = sub && (sub.status === 'Approved' || sub.status === 'APPROVED');

        deadlineMap[dStr].push({
            id: std.id,
            name: std.name,
            star: std.star,
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

function getDaysLeftText(deadlineStr) {
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

function renderDashboard(data, allLeaderboardData = []) {
    const isAdmin = (currentRole === 'ADMIN' || currentRole === 'UserRole.ADMIN');
    const adminOverview = document.getElementById('adminNationalOverview');
    
    if (isAdmin) {
        if (adminOverview) adminOverview.classList.remove('hidden');
        if (allLeaderboardData.length > 0) {
            document.getElementById('statTotalChapters').textContent = allLeaderboardData.length;
            const totalScoreAll = allLeaderboardData.reduce((acc, curr) => acc + curr.total_score, 0);
            document.getElementById('statAvgScore').textContent = `${Math.round(totalScoreAll / allLeaderboardData.length)} pts`;

            const topChapter = allLeaderboardData[0];
            document.getElementById('statTopChapter').textContent = topChapter ? topChapter.chapter_name : '-';
            document.getElementById('statTopScore').textContent = topChapter ? `${topChapter.total_score} pts` : '0 pts';
            document.getElementById('statTotalSubmissions').textContent = Object.keys(chapterSubmissions).length || '0';
        }
    } else {
        if (adminOverview) adminOverview.classList.add('hidden');
    }

    document.getElementById('dashChapterTitle').textContent = currentChapter;
    document.getElementById('dashOverallBand').textContent = data.efficiency_band;

    const totals = data.breakdown || { Efficiency: 0, Network: 0, Experience: 0, Outreach: 0, Impact: 0 };
    document.getElementById('score-eff').textContent = `${totals.Efficiency || 0} pts`;
    document.getElementById('score-net').textContent = `${totals.Network || 0} pts`;
    document.getElementById('score-exp').textContent = `${totals.Experience || 0} pts`;
    document.getElementById('score-out').textContent = `${totals.Outreach || 0} pts`;
    document.getElementById('score-imp').textContent = `${totals.Impact || 0} pts`;

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
        if (starsStatus[key]) {
            icon.className = "fa-solid fa-star text-jci-gold text-base mb-1 filter drop-shadow-[0_0_8px_rgba(255,184,0,0.8)] animate-pulse";
            scoreText.className = "text-xs font-bold text-amber-300";
            parentBox.className = "flex flex-col items-center justify-center p-2 rounded-lg bg-amber-500/20 border border-jci-gold/60 min-w-[65px]";
        } else {
            icon.className = "fa-solid fa-star text-slate-500/70 text-base mb-1";
            scoreText.className = "text-xs font-semibold text-slate-300";
            parentBox.className = "flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/50 border border-white/10 min-w-[65px]";
        }
    });

    renderRadarChart(totals);
    renderStarCardsList(totals);
}

function renderRadarChart(totals) {
    const ctx = document.getElementById('starRadarChart');
    if (!ctx) return;
    if (radarChartInstance) radarChartInstance.destroy();

    // 1. Tentukan target maksimal poin untuk masing-masing kategori sesuai database/aturan program
    const categories = ['Efficiency', 'Network', 'Experience', 'Outreach', 'Impact'];
    const maxTargets = {
        Efficiency: 140, 
        Network: 250,
        Experience: 250,
        Outreach: 250,
        Impact: 250
    };

    // 2. Ambil nilai asli dari database (melalui objek totals)
    const rawScores = categories.map(cat => totals[cat] || 0);

    // 3. Hitung persentase pencapaian (0 - 100%) secara otomatis per kategori
    const percentages = categories.map((cat, index) => {
        const score = rawScores[index];
        const max = maxTargets[cat];
        return Math.min(100, Math.round((score / max) * 100));
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
                    max: 100, // Skala seragam 0% sampai 100% untuk semua sudut
                    beginAtZero: true,
                    angleLines: { color: '#e2e8f0' },
                    grid: { color: '#f1f5f9' },
                    pointLabels: { font: { size: 10, weight: 'bold' }, color: '#475569' },
                    ticks: { 
                        display:false,
                    }
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Menampilkan info skor asli dari database vs target maksimal saat kursor diarahkan
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

function renderStarCardsList(totals) {
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

function renderUpcomingDeadlines() {
    const container = document.getElementById('upcomingDeadlinesList');
    const urgentCount = document.getElementById('urgentCount');
    if (!container) return;

    const pendingStds = standardsData.filter(std => {
        const sub = chapterSubmissions[std.id];
        return !sub || (sub.status !== 'Approved' && sub.status !== 'APPROVED');
    });

    if (urgentCount) urgentCount.textContent = `${pendingStds.length} Pending`;

    container.innerHTML = pendingStds.slice(0, 5).map(std => `
        <div class="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between">
            <div>
                <span class="font-bold text-slate-800">${std.id}. ${std.name}</span>
                <p class="text-[10px] text-slate-400">Target: ${getDaysLeftText(std.deadline || '2026-12-31')}</p>
            </div>
            <span class="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded">Action Needed</span>
        </div>
    `).join('');
}

function renderStandardsList() {
    const container = document.getElementById('standardsSectionsContainer');
    const searchInput = document.getElementById('searchInput');
    if (!container) return;

    const query = searchInput ? searchInput.value.toLowerCase() : '';

    const filtered = standardsData.filter(std => {
        const matchesCat = (currentCategoryFilter === 'ALL') || 
            (std.star && std.star.toUpperCase() === currentCategoryFilter);
        const matchesSearch = std.name.toLowerCase().includes(query) || 
            std.id.toLowerCase().includes(query);
        return matchesCat && matchesSearch;
    });

    const grouped = {};
    filtered.forEach(std => {
        const cat = std.star ? std.star.toUpperCase() : 'OTHER';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(std);
    });

    container.innerHTML = Object.keys(grouped).map(cat => `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
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
                            const sub = chapterSubmissions[std.id] || { status: 'Not Submitted', score_earned: 0 };
                            const isApproved = sub.status === 'Approved' || sub.status === 'APPROVED';

                            let statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Pending</span>`;
                            if (isApproved) {
                                statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Approved</span>`;
                            } else if (sub.status === 'Revision Requested') {
                                statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Revision Req.</span>`;
                            } else if (sub.status === 'Rejected') {
                                statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Rejected</span>`;
                            }

                            const earnedPts = sub.score_earned !== undefined ? sub.score_earned : 0;

                            return `
                                <tr class="hover:bg-slate-50 transition">
                                    <td class="py-3 px-3">
                                        <div class="font-bold text-slate-900">${std.id}. ${std.name}</div>
                                        <div class="text-[11px] text-slate-500 mt-0.5">${std.purpose || ''}</div>
                                        ${sub.evaluator_notes ? `<div class="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1 border border-amber-200"><strong>Note:</strong> ${sub.evaluator_notes}</div>` : ''}
                                    </td>
                                    <td class="py-3 px-3">
                                        <span class="text-[10px] font-extrabold text-jci-blue uppercase bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">${std.star}</span>
                                    </td>
                                    <td class="py-3 px-3 text-[11px] font-medium text-slate-600">${std.deadline || '2026-12-31'}</td>
                                    <td class="py-3 px-3 font-bold text-slate-700">${std.max_score} pts</td>
                                    <td class="py-3 px-3 font-extrabold ${isApproved ? 'text-emerald-600' : 'text-slate-400'}">${earnedPts} pts</td>
                                    <td class="py-3 px-3">${statusBadge}</td>
                                    <td class="py-3 px-3 text-center">
                                        <button onclick="openSubmissionModal('${std.id}', '${std.name}', '${std.deadline || ''}')" class="px-3.5 py-1.5 bg-jci-blue hover:bg-jci-navy text-white font-bold rounded-xl shadow-xs text-xs transition">
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

function toggleKpiSection(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
}

async function handleKPISubmit(e) {
    e.preventDefault();
    alert("Form KPI Self-Assessment berhasil disubmit!");
}

function updateFileLabel(input) {
    const label = document.getElementById('fileSelectText');
    if (input.files && input.files[0]) {
        label.innerHTML = `<i class="fa-solid fa-file-pdf text-rose-500 mr-1"></i> ${input.files[0].name}`;
    } else {
        label.textContent = "Click or drag & drop file to upload";
    }
}

function openSubmissionModal(stdId, stdName, defaultDeadline) {
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

function closeSubmissionModal() {
    document.getElementById('submissionModal').classList.add('hidden');
}

async function handleModalSubmit(e) {
    e.preventDefault();
    const stdId = document.getElementById('modalStdId').value;
    const title = document.getElementById('modalSubTitle').value;
    const desc = document.getElementById('modalSubDesc').value;
    const url = document.getElementById('modalSubUrl').value;
    const fileInput = document.getElementById('modalSubFile');

    const formData = new FormData();
    formData.append('standard_id', stdId);
    formData.append('chapter_name', currentChapter);
    formData.append('title', title);
    formData.append('description', desc);
    if (url) formData.append('evidence_url', url);
    if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch(`${API_BASE}/submissions`, { method: 'POST', body: formData });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Gagal mengirim bukti");

        alert(result.message || "Bukti berhasil dikirim!");
        closeSubmissionModal();
        loadData();
    } catch (err) {
        alert("Gagal kirim bukti: " + err.message);
    }
}

function renderEvaluatorPortal() {
    const container = document.getElementById('evaluatorSubmissionsList');
    if (!container) return;

    const entries = Object.values(chapterSubmissions);
    if (entries.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border">Belum ada submission dari ${currentChapter}.</div>`;
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

function renderAdminStandardsList() {
    const container = document.getElementById('evaluatorStandardsList');
    if (!container) return;

    if (standardsData.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">Belum ada standar yang terdaftar.</p>';
        return;
    }

    container.innerHTML = standardsData.map(std => `
        <div class="flex items-center justify-between bg-slate-50 p-2.5 border border-slate-200 rounded-xl hover:bg-white transition">
            <div>
                <span class="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">${std.id}</span>
                <span class="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1">${std.star}</span>
                <h5 class="text-xs font-bold text-slate-800 mt-1">${std.name} (${std.max_score} pts)</h5>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="openStandardModalForEdit('${std.id}')" class="text-jci-blue hover:text-jci-navy bg-blue-50 px-2.5 py-1.5 rounded-lg font-bold text-xs transition" title="Edit Standard">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button onclick="handleDeleteStandard('${std.id}')" class="text-rose-500 hover:text-rose-700 bg-rose-50 p-1.5 rounded-lg transition" title="Delete Standard">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function loadPendingUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/pending-users`);
        const pending = await res.json();
        const container = document.getElementById('pendingUsersList');
        if (!container) return;

        if (pending.length === 0) {
            container.innerHTML = `<p class="text-slate-400 italic">Tidak ada pendaftaran PIC yang tertunda.</p>`;
            return;
        }

        container.innerHTML = pending.map(u => `
            <div class="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between">
                <div>
                    <span class="font-bold text-slate-800">${u.full_name} (${u.email})</span>
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

async function approveUserAction(userId, action) {
    try {
        const res = await fetch(`${API_BASE}/admin/approve-user/${userId}?action=${action}`, { method: 'PUT' });
        const result = await res.json();
        alert(result.message);
        loadPendingUsers();
    } catch (err) {
        alert("Gagal memproses user: " + err.message);
    }
}

function renderLeaderboard(data) {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;
    
    tbody.innerHTML = data.map((item) => {
        const b = item.breakdown || { Efficiency: 0, Network: 0, Experience: 0, Outreach: 0, Impact: 0 };
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
                    <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">E:${b.Efficiency || 0}</span>
                    <span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-bold">N:${b.Network || 0}</span>
                    <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">Ex:${b.Experience || 0}</span>
                    <span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">O:${b.Outreach || 0}</span>
                    <span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">I:${b.Impact || 0}</span>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadAnnualArchives() {
    const container = document.getElementById('archiveListContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/archives/${encodeURIComponent(currentChapter)}`);
        const archives = await res.json();

        if (archives.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border">Belum ada arsip tahunan untuk ${currentChapter}.</div>`;
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
        console.error("Gagal load archives:", err);
    }
}

window.onload = checkAuthSession;