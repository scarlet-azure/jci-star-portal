import { fetchAPI } from './api.js';

let activeKpiTemplateSchema = [];

export async function renderDynamicKpiForm() {
    const navContainer = document.getElementById('dynamicKpiTabNav');
    const formContainer = document.getElementById('dynamicKpiTabContainer');

    if (!navContainer || !formContainer) return;

    try {
        let res = await fetchAPI('/kpi/schema');
        if (!res || !res.ok) res = await fetchAPI('/kpi/template');

        if (!res || !res.ok) {
            formContainer.innerHTML = `<div class="p-6 text-center text-xs text-rose-500 bg-rose-50 rounded-xl border border-rose-200">Gagal memuat template KPI.</div>`;
            return;
        }

        activeKpiTemplateSchema = await res.json();

        if (!Array.isArray(activeKpiTemplateSchema) || activeKpiTemplateSchema.length === 0) {
            navContainer.innerHTML = '';
            formContainer.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">Belum ada struktur form KPI template.</div>`;
            return;
        }

        let tabs = activeKpiTemplateSchema;

        // 1. Render Navigation Tabs
        navContainer.innerHTML = tabs.map((tab, idx) => `
            <button type="button" 
                    onclick="switchDynamicKpiTab(${idx})" 
                    id="kpi-dyn-btn-${idx}" 
                    class="dynamic-kpi-tab-btn px-3.5 py-2 font-bold text-xs rounded-lg transition whitespace-nowrap ${idx === 0 ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}">
                ${tab.title || tab.id}
            </button>
        `).join('');

        // 2. Render Form Content
        formContainer.innerHTML = tabs.map((tab, idx) => {
            const fieldsHtml = (tab.fields || []).map(field => renderSingleKpiField(field)).join('');

            return `
                <div id="kpi-dyn-content-${idx}" class="dynamic-kpi-tab-content space-y-4 ${idx === 0 ? '' : 'hidden'}">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 class="font-extrabold text-sm text-slate-800">${tab.title || tab.id}</h3>
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Aspect #${idx + 1}</span>
                    </div>
                    <div class="grid grid-cols-1 gap-4">
                        ${fieldsHtml || '<p class="text-xs text-slate-400 italic">Belum ada field kriteria pada tab ini.</p>'}
                    </div>
                </div>
            `;
        }).join('');

        attachDynamicKpiCalculations();
        await loadExistingKpiSubmission();

    } catch (err) {
        console.error("Gagal memuat dynamic KPI form:", err);
    }
}

function renderSingleKpiField(field) {
    const key = field.key || field.id;
    const label = field.label || field.title || key;
    const maxPts = field.max_score || field.max_points || field.weight || 0;
    const desc = field.description ? `<p class="text-[11px] text-slate-500 mb-1.5">${field.description}</p>` : '';
    const fieldType = field.type || field.input_type || (field.options ? 'select' : 'text');

    let inputHtml = '';

    if (fieldType === 'select' && Array.isArray(field.options)) {
        const optionsHtml = field.options.map(opt => {
            const optVal = opt.label || opt.value || opt;
            const optScore = opt.score ?? opt.points ?? 0;
            return `<option value="${optVal}">${optVal} (${optScore} pts)</option>`;
        }).join('');

        inputHtml = `
            <select id="kpi_${key}" name="${key}" data-key="${key}" class="kpi-dynamic-input w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">-- Pilih Opsi --</option>
                ${optionsHtml}
            </select>
        `;
    } else if (fieldType === 'number') {
        inputHtml = `
            <input type="number" id="kpi_${key}" name="${key}" data-key="${key}" data-max-points="${maxPts}" placeholder="0" min="0" class="kpi-dynamic-input w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
        `;
    } else if (fieldType === 'textarea') {
        inputHtml = `
            <textarea id="kpi_${key}" name="${key}" data-key="${key}" rows="3" placeholder="Jelaskan secara rinci..." class="kpi-dynamic-input w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"></textarea>
        `;
    } else {
        inputHtml = `
            <input type="${fieldType === 'url' ? 'url' : 'text'}" id="kpi_${key}" name="${key}" data-key="${key}" placeholder="${fieldType === 'url' ? 'https://...' : ''}" class="kpi-dynamic-input w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
        `;
    }

    return `
        <div class="space-y-1 bg-white p-4 border border-slate-200 rounded-xl">
            <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-xs text-slate-800">${label}</label>
                ${maxPts > 0 ? `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">Max: ${maxPts} pts</span>` : ''}
            </div>
            ${desc}
            ${inputHtml}
        </div>
    `;
}
  
export function switchDynamicKpiTab(targetIdx) {
    document.querySelectorAll('.dynamic-kpi-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.dynamic-kpi-tab-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-600', 'text-white');
        btn.classList.add('text-slate-600');
    });

    const targetContent = document.getElementById(`kpi-dyn-content-${targetIdx}`);
    const targetBtn = document.getElementById(`kpi-dyn-btn-${targetIdx}`);

    if (targetContent) targetContent.classList.remove('hidden');
    if (targetBtn) {
        targetBtn.classList.add('bg-emerald-600', 'text-white');
        targetBtn.classList.remove('text-slate-600');
    }
}
window.switchDynamicKpiTab = switchDynamicKpiTab;

function attachDynamicKpiCalculations() {
    document.querySelectorAll('.kpi-dynamic-input').forEach(input => {
        input.addEventListener('change', calculateEstimatedKpiScore);
        input.addEventListener('keyup', calculateEstimatedKpiScore);
    });
}

// Koleksi data dari SEMUA input form
export function collectKpiFormData() {
    const formData = {};
    document.querySelectorAll('.kpi-dynamic-input').forEach(input => {
        const key = input.getAttribute('data-key') || input.name || input.id.replace('kpi_', '');
        if (key) {
            formData[key] = input.value || '';
        }
    });
    return formData;
}

export function calculateKpiScoresBreakdown() {
    let totalScore = 0;
    const sectionScores = {};
    const schemaToUse = activeKpiTemplateSchema || [];

    schemaToUse.forEach((tab, idx) => {
        let tabScore = 0;
        const secKey = `s${idx + 1}`;
        const customId = tab.id || secKey;

        (tab.fields || []).forEach(field => {
            const key = field.key || field.id;
            const input = document.getElementById(`kpi_${key}`);
            if (!input || input.value === undefined || input.value === '') return;

            const val = input.value;
            const fieldType = field.type || field.input_type || (field.options ? 'select' : 'text');

            if (fieldType === 'select' && Array.isArray(field.options)) {
                const opt = field.options.find(o => String(o.label || o.value || o) === String(val));
                if (opt) tabScore += parseInt(opt.score ?? opt.points ?? 0, 10);
            } else if (fieldType === 'number') {
                const num = parseInt(val || 0, 10);
                const maxPts = field.max_score || field.max_points || field.weight || 25;
                if (!isNaN(num)) tabScore += Math.min(Math.max(0, num), maxPts);
            }
        });

        sectionScores[secKey] = tabScore;
        sectionScores[customId] = tabScore;
        totalScore += tabScore;
    });

    return { totalScore, sectionScores };
}

export function calculateEstimatedKpiScore() {
    const { totalScore } = calculateKpiScoresBreakdown();
    const totalEl = document.getElementById('kpiScoreTotal');
    if (totalEl) totalEl.textContent = `${totalScore} pts`;
    return totalScore;
}

async function submitKpiPayload(statusStr) {
    const chapterName = window.state?.currentChapter || localStorage.getItem('currentChapter') || 'Jakarta';
    const formData = collectKpiFormData();
    const { totalScore, sectionScores } = calculateKpiScoresBreakdown();

    // Simpan rincian skor per tab/section secara dinamis di dalam form_data
    formData._section_scores = sectionScores;

    const payload = {
        chapter_name: chapterName,
        year: 2026,
        status: statusStr,
        self_score: totalScore,
        evaluator_score: totalScore,
        form_data: formData,
        membership_data: formData
    };

    try {
        const res = await fetchAPI('/kpi/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res && res.ok) {
            alert(statusStr === 'Draft' ? "Draft KPI berhasil disimpan!" : "Formulir KPI Self-Assessment berhasil dikirim!");
            await loadExistingKpiSubmission();
        } else {
            const err = await res.json();
            alert("Gagal menyimpan KPI: " + (err.detail || err.message || "Unknown error"));
        }
    } catch (err) {
        alert("Error menyimpan KPI: " + err.message);
    }
}

export async function handleSaveDraftKpi(e) {
    if (e) e.preventDefault();
    await submitKpiPayload('Draft');
}

export async function handleSubmitKpiForm(e) {
    if (e) e.preventDefault();
    await submitKpiPayload('Submitted');
}

// Memuat dan mengisi ulang nilai ke elemen form saat halaman dibuka/direload
export async function loadExistingKpiSubmission() {
    try {
        const chapterName = window.state?.currentChapter || localStorage.getItem('currentChapter') || 'Jakarta';
        const res = await fetchAPI(`/kpi/my-submission?chapter_name=${encodeURIComponent(chapterName)}`);
        if (!res || !res.ok) return;

        const sub = await res.json();
        if (!sub) return;

        let formData = sub.form_data || sub.membership_data || {};
        if (typeof formData === 'string') {
            try { formData = JSON.parse(formData); } catch(e) { formData = {}; }
        }

        // Mapping ke input ID dengan fallback nama key
        Object.keys(formData).forEach(key => {
            const val = formData[key];
            const input = document.getElementById(`kpi_${key}`) || document.querySelector(`[name="${key}"]`);
            if (input && val !== undefined && val !== null) {
                input.value = val;
            }
        });

        const totalEl = document.getElementById('kpiScoreTotal');
        const badgeEl = document.getElementById('kpiStatusBadge');

        if (totalEl) totalEl.textContent = `${sub.evaluator_score || sub.self_score || 0} pts`;
        if (badgeEl) badgeEl.textContent = `Status: ${sub.status || 'Draft'}`;

        if (typeof calculateEstimatedKpiScore === 'function') {
            calculateEstimatedKpiScore();
        }
    } catch (err) {
        console.warn("Belum ada data submission tersimpan:", err);
    }
}

window.renderDynamicKpiForm = renderDynamicKpiForm;
window.handleSaveDraftKpi = handleSaveDraftKpi;
window.handleSubmitKpiForm = handleSubmitKpiForm;