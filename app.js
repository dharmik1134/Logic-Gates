/**
 * app.js — Tab routing, initialization, global coordination
 */

let switchTab;

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
        // ── TAB ROUTING ──
        const tabs = document.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.tab-panel');

        switchTab = function(tabId) {
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
            panels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
            // Re-draw simulator and sync dimensions when its tab is shown
            if (tabId === 'simulator') {
                setTimeout(() => {
                    const cvs = document.getElementById('simCanvas');
                    if (cvs && cvs.parentElement) {
                        const rect = cvs.parentElement.getBoundingClientRect ? cvs.parentElement.getBoundingClientRect() : { width: 700, height: 500 };
                        cvs.width = rect.width || 700;
                        cvs.height = 500;
                        if (typeof drawAll === 'function') drawAll();
                    }
                }, 50);
            }
        };

        tabs.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // ── INIT ALL MODULES ──
        if (typeof initSolver === 'function') initSolver();
        if (typeof initKmap === 'function') initKmap();
        if (typeof initSimulator === 'function') initSimulator();
        if (typeof initLearn === 'function') initLearn();

        // ── KEYBOARD SHORTCUT: Ctrl+Enter (or Cmd+Enter) to solve ──
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
                if (activeTab === 'solver') {
                    const solveBtn = document.getElementById('solveBtn');
                    if (solveBtn) solveBtn.click();
                }
            }
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        get switchTab() { return switchTab; }
    };
}

