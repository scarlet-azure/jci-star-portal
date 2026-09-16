// app/static/js/data.js (atau dashboard.js)
import { fetchAPI } from './api.js';
import { state } from './auth.js';
import { renderDashboard } from './dashboard.js';
import { renderLeaderboard, loadAnnualArchives } from './leaderboard.js';

export async function loadData() {
    try {
        const [stdRes, subRes, leadRes] = await Promise.all([
            fetchAPI('/standards'),
            fetchAPI(`/submissions/${encodeURIComponent(state.currentChapter)}`),
            fetchAPI('/leaderboard')
        ]);

        const standardsData = await stdRes.json();
        const subRaw = await subRes.json();
        const leaderboardData = await leadRes.json();

        // Ambil data leaderboard chapter yang sedang aktif
        let currentLeaderboard = leaderboardData.find(l => l.chapter_name === state.currentChapter) || {
            efficiency_band: "Under Minimum Standard (<90 pts)",
            total_score: 0,
            qualified_stars: 0,
            breakdown: { Efficiency: 0, Network: 0, Experience: 0, Outreach: 0, Impact: 0 }
        };

        // Render komponen UI & rekap admin
        renderDashboard(currentLeaderboard, leaderboardData);
        renderLeaderboard(leaderboardData);
        loadAnnualArchives(state.currentChapter);

    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// Bind ke global window
window.loadData = loadData;