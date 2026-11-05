/**
 * learn.js — Learning Resources: Boolean Laws, Gate Reference, K-Map Guide
 */

const BOOLEAN_LAWS = [
    { name: 'Identity Law', exprs: ['A + 0 = A', 'A · 1 = A'] },
    { name: 'Null Law', exprs: ['A + 1 = 1', 'A · 0 = 0'] },
    { name: 'Idempotent Law', exprs: ['A + A = A', 'A · A = A'] },
    { name: 'Complement Law', exprs: ["A + A' = 1", "A · A' = 0"] },
    { name: 'Commutative Law', exprs: ['A + B = B + A', 'A · B = B · A'] },
    { name: 'Associative Law', exprs: ['(A + B) + C = A + (B + C)', '(A · B) · C = A · (B · C)'] },
    { name: 'Distributive Law', exprs: ['A · (B + C) = AB + AC', 'A + (B · C) = (A + B)(A + C)'] },
    { name: "De Morgan's Theorem", exprs: ["(A + B)' = A' · B'", "(A · B)' = A' + B'"] },
    { name: 'Absorption Law', exprs: ['A + AB = A', 'A · (A + B) = A'] },
    { name: 'Consensus Theorem', exprs: ["AB + A'C + BC = AB + A'C", "(A + B)(A' + C)(B + C) = (A + B)(A' + C)"] },
    { name: 'Involution Law', exprs: ["(A')' = A"] },
    { name: 'Exportation Law', exprs: ["(A · B)' + C = A' + B' + C", "A(B → C) ≡ AB → C"] },
];

const GATE_DEFS = [
    {
        name: 'AND',
        desc: 'Logical conjunction: Output is 1 only when ALL inputs are 1.',
        symbol: 'A · B',
        color: '#38bdf8',
        truth: [['A', 'B', 'Out'], [0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
    },
    {
        name: 'OR',
        desc: 'Logical disjunction: Output is 1 when AT LEAST ONE input is 1.',
        symbol: 'A + B',
        color: '#38bdf8',
        truth: [['A', 'B', 'Out'], [0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]],
    },
    {
        name: 'NOT',
        desc: 'Logical negation / inverter: Output is the complement of the input.',
        symbol: "A'",
        color: '#38bdf8',
        truth: [['A', 'Out'], [0, 1], [1, 0]],
    },
    {
        name: 'NAND',
        desc: 'Universal gate: Negated AND. Output is 0 only when all inputs are 1.',
        symbol: "(A · B)'",
        color: '#38bdf8',
        truth: [['A', 'B', 'Out'], [0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
    },
    {
        name: 'NOR',
        desc: 'Universal gate: Negated OR. Output is 1 only when all inputs are 0.',
        symbol: "(A + B)'",
        color: '#38bdf8',
        truth: [['A', 'B', 'Out'], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 0]],
    },
    {
        name: 'XOR',
        desc: 'Exclusive OR: Output is 1 when inputs have ODD parity (differ).',
        symbol: 'A ⊕ B',
        color: '#38bdf8',
        truth: [['A', 'B', 'Out'], [0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
    },
    {
        name: 'XNOR',
        desc: 'Equivalence / Coincidence: Output is 1 when inputs are IDENTICAL.',
        symbol: "(A ⊕ B)'",
        color: '#38bdf8',
        truth: [['A', 'B', 'Out'], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
    },
];

function generateGatePreviewSVG(type) {
    let path = '';
    let bubble = '';
    let extra = '';
    const stroke = '#38bdf8';
    const fill = '#141824';

    if (type === 'AND') {
        path = '<path d="M22,6 L38,6 Q54,6 54,20 Q54,34 38,34 L22,34 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        extra = '<line x1="2" y1="12" x2="22" y2="12" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="28" x2="22" y2="28" stroke="' + stroke + '" stroke-width="1.6"/><line x1="54" y1="20" x2="74" y2="20" stroke="' + stroke + '" stroke-width="1.6"/>';
    } else if (type === 'OR') {
        path = '<path d="M22,6 Q36,6 54,20 Q36,34 22,34 Q29,20 22,6 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        extra = '<line x1="2" y1="12" x2="25" y2="12" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="28" x2="25" y2="28" stroke="' + stroke + '" stroke-width="1.6"/><line x1="54" y1="20" x2="74" y2="20" stroke="' + stroke + '" stroke-width="1.6"/>';
    } else if (type === 'NOT') {
        path = '<path d="M22,6 L48,20 L22,34 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        bubble = '<circle cx="52" cy="20" r="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        extra = '<line x1="2" y1="20" x2="22" y2="20" stroke="' + stroke + '" stroke-width="1.6"/><line x1="55" y1="20" x2="74" y2="20" stroke="' + stroke + '" stroke-width="1.6"/>';
    } else if (type === 'NAND') {
        path = '<path d="M20,6 L36,6 Q48,6 48,20 Q48,34 36,34 L20,34 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        bubble = '<circle cx="52" cy="20" r="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        extra = '<line x1="2" y1="12" x2="20" y2="12" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="28" x2="20" y2="28" stroke="' + stroke + '" stroke-width="1.6"/><line x1="55" y1="20" x2="74" y2="20" stroke="' + stroke + '" stroke-width="1.6"/>';
    } else if (type === 'NOR') {
        path = '<path d="M20,6 Q34,6 48,20 Q34,34 20,34 Q27,20 20,6 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        bubble = '<circle cx="52" cy="20" r="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        extra = '<line x1="2" y1="12" x2="23" y2="12" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="28" x2="23" y2="28" stroke="' + stroke + '" stroke-width="1.6"/><line x1="55" y1="20" x2="74" y2="20" stroke="' + stroke + '" stroke-width="1.6"/>';
    } else if (type === 'XOR') {
        extra = '<path d="M16,6 Q23,20 16,34" fill="none" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="12" x2="24" y2="12" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="28" x2="24" y2="28" stroke="' + stroke + '" stroke-width="1.6"/><line x1="54" y1="20" x2="74" y2="20" stroke="' + stroke + '" stroke-width="1.6"/>';
        path = '<path d="M22,6 Q36,6 54,20 Q36,34 22,34 Q29,20 22,6 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
    } else if (type === 'XNOR') {
        extra = '<path d="M14,6 Q21,20 14,34" fill="none" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="12" x2="22" y2="12" stroke="' + stroke + '" stroke-width="1.6"/><line x1="2" y1="28" x2="22" y2="28" stroke="' + stroke + '" stroke-width="1.6"/><line x1="55" y1="20" x2="74" y2="20" stroke="' + stroke + '" stroke-width="1.6"/>';
        path = '<path d="M20,6 Q34,6 48,20 Q34,34 20,34 Q27,20 20,6 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
        bubble = '<circle cx="52" cy="20" r="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/>';
    }

    return '<svg width="76" height="40" viewBox="0 0 76 40" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">' + extra + path + bubble + '</svg>';
}

const KMAP_GUIDE_HTML = `
  <div class="guide-section">
    <h3>What is a Karnaugh Map?</h3>
    <p>A Karnaugh Map (K-Map) is a visual, coordinate-based representation of a Boolean truth table that arranges minterms into a geometric grid. By organizing cells so that geometrically adjacent cells differ by only a single literal, digital designers can visually identify common sub-terms and systematically reduce expressions to their minimal Sum-of-Products (SOP) or Product-of-Sums (POS) form with minimum gate count.</p>
  </div>
  <div class="guide-section">
    <h3>Gray Code Ordering</h3>
    <p>The axes of a Karnaugh Map use <strong>Gray code</strong> sequencing (<code>00, 01, 11, 10</code>) rather than standard binary order (<code>00, 01, 10, 11</code>). The key invariant of Gray code is that each adjacent coordinate pair has a Hamming distance of exactly 1 bit. This guarantees that physical grid adjacency maps directly to logical adjacency, enabling visual variable elimination via the complementary law $X + X' = 1$.</p>
    <ul>
      <li>2-variable map: 2×2 grid (4 minterm cells: $m_0 \dots m_3$)</li>
      <li>3-variable map: 2×4 grid (8 minterm cells: $m_0 \dots m_7$)</li>
      <li>4-variable map: 4×4 grid (16 minterm cells: $m_0 \dots m_{15}$)</li>
    </ul>
  </div>
  <div class="guide-section">
    <h3>Grouping Rules</h3>
    <ol>
      <li><strong>Grouping Rules:</strong> Groups must be powers of 2: <code>1, 2, 4, 8, 16</code>. Triangular, diagonal, or L-shaped groups are strictly invalid.</li>
      <li><strong>Maximal Expansion:</strong> Larger groups eliminate more literals. A group of 2 eliminates 1 variable; a group of 4 eliminates 2 variables; a group of 8 eliminates 3 variables. Always expand groups to their maximum possible power-of-2 dimensions.</li>
      <li><strong>Toroidal Wrap-Around:</strong> The K-Map grid wraps around horizontally and vertically like a torus. Cells in the first column are adjacent to cells in the last column; cells in the top row are adjacent to cells in the bottom row. Four corners forms a valid 4-cell group.</li>
      <li><strong>Don't Cares (X):</strong> <strong>Don't Cares (X)</strong> represent undefined or impossible input states. Treat them as wildcards: include an $X$ in a group only if doing so allows a larger power-of-2 group that eliminates additional variables. Unused $X$ cells do not need to be covered.</li>
      <li><strong>Complete Coverage:</strong> Every cell containing <code>1</code> (for SOP) or <code>0</code> (for POS) must be included in at least one prime implicant group. Redundant groups (where every cell is already covered by other chosen groups) must be pruned.</li>
    </ol>
  </div>
  <div class="guide-section">
    <h3>Reading the Resulting Equations</h3>
    <p>To extract the algebraic product term for each rectangular group:</p>
    <ul>
      <li>Examine each variable spanning the group's rows and columns.</li>
      <li>If a variable remains <strong>1</strong> across every cell in the group → retain the literal directly (e.g. <code>A</code>).</li>
      <li>If a variable remains <strong>0</strong> across every cell in the group → retain its complement (e.g. <code>A'</code>).</li>
      <li>If a variable alternates between 0 and 1 within the group → eliminate the variable entirely.</li>
    </ul>
    <p>The final minimized SOP equation is the logical OR (sum) of all essential prime implicants.</p>
  </div>
  <div class="guide-section">
    <h3>Synthesis Example</h3>
    <p>Consider a 3-variable system $F(A, B, C)$ with minterm set $\Sigma m(1, 3, 5, 7)$:</p>
    <ul>
      <li>Coordinates: $(A=0, BC=01)$, $(A=0, BC=11)$, $(A=1, BC=01)$, $(A=1, BC=11)$.</li>
      <li>These 4 minterms form a contiguous $2 \times 2$ block of four cells spanning both rows ($A$ alternates $0 \leftrightarrow 1$) and two columns ($B$ alternates $0 \leftrightarrow 1$, while $C$ is strictly $1$).</li>
      <li>Variables $A$ and $B$ change state across the group and are eliminated. Variable $C$ remains constant at 1.</li>
      <li>Minimized output: <code>C</code> (requiring 0 gates instead of 4 minterm AND gates).</li>
    </ul>
  </div>
`;

function renderLaws() {
    const grid = document.getElementById('lawsGrid');
    if (!grid) return;
    grid.innerHTML = BOOLEAN_LAWS.map(law => `
    <div class="law-card">
      <div class="law-name">${escHtml2(law.name)}</div>
      <div class="law-exprs">
        ${law.exprs.map(e => `<div class="law-expr">${escHtml2(e)}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderGates() {
    const grid = document.getElementById('gatesGrid');
    if (!grid) return;
    grid.innerHTML = GATE_DEFS.map(gate => {
        const headers = gate.truth[0];
        const rows = gate.truth.slice(1);
        const tableHTML = `
      <table class="truth-table gate-truth-mini" style="font-variant-numeric:tabular-nums;">
        <thead><tr>${headers.map(h => `<th>${escHtml2(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map((v, i) => {
            const isOut = i === row.length - 1;
            const cls = isOut ? (v ? 'val-one' : 'val-zero') : '';
            return `<td class="${cls}">${v}</td>`;
        }).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `;
        return `
      <div class="gate-card">
        <div class="gate-card-name">${escHtml2(gate.name)}</div>
        <div class="gate-card-desc">${escHtml2(gate.desc)}</div>
        <div class="gate-svg-wrap">
          ${generateGatePreviewSVG(gate.name)}
        </div>
        <div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--accent);margin-bottom:12px;background:var(--surface-deep);border:1px solid var(--hairline);padding:6px 10px;border-radius:var(--radius-badge);text-align:center;">${escHtml2(gate.symbol)}</div>
        ${tableHTML}
      </div>
    `;
    }).join('');
}

function renderKmapGuide() {
    const guideEl = document.getElementById('kmapGuide');
    if (guideEl) {
        guideEl.innerHTML = KMAP_GUIDE_HTML;
    }
}

function initLearn() {
    renderLaws();
    renderGates();
    renderKmapGuide();

    const subBtns = document.querySelectorAll ? document.querySelectorAll('.sub-btn') : [];
    subBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const sub = btn.dataset.sub;
            const panel = document.getElementById('sub-' + sub);
            if (panel) panel.classList.add('active');
        });
    });
}

function escHtml2(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BOOLEAN_LAWS,
        GATE_DEFS,
        KMAP_GUIDE_HTML,
        renderLaws,
        renderGates,
        renderGateCards: renderGates,
        renderKmapGuide,
        initLearn,
        escHtml2,
        generateGatePreviewSVG,
    };
}
