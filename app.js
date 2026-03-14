/**
 * app.js — Tab routing, initialization, global coordination
 */

document.addEventListener('DOMContentLoaded', () => {
    // ── TAB ROUTING ──
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    function switchTab(tabId) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        panels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
        // Re-draw simulator when its tab is shown
        if (tabId === 'simulator') {
            setTimeout(() => {
                const cvs = document.getElementById('simCanvas');
                const rect = cvs.parentElement.getBoundingClientRect();
                cvs.width = rect.width || 700;
                cvs.height = 500;
                drawAll();
            }, 50);
        }
    }

    tabs.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ── INIT ALL MODULES ──
    initSolver();
    initKmap();
    initSimulator();
    initLearn();

    // ── KEYBOARD SHORTCUT: Ctrl+Enter to solve ──
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'Enter') {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
            if (activeTab === 'solver') document.getElementById('solveBtn').click();
        }
    });
});
