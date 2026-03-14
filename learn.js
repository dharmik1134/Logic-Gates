/**
 * learn.js — Learning Resources: Boolean Laws, Gate Reference, K-Map Guide
 */

const BOOLEAN_LAWS = [
    { name: 'Identity Law', exprs: ['A + 0 = A', 'A · 1 = A'] },
    { name: 'Null Law', exprs: ['A + 1 = 1', 'A · 0 = 0'] },
    { name: 'Idempotent Law', exprs: ['A + A = A', 'A · A = A'] },
    { name: 'Complement Law', exprs: ["A + A' = 1", "A · A' = 0"] },
    { name: 'Double Negation', exprs: ["(A')' = A"] },
    { name: 'Commutative Law', exprs: ['A + B = B + A', 'A · B = B · A'] },
    { name: 'Associative Law', exprs: ['(A+B)+C = A+(B+C)', '(A·B)·C = A·(B·C)'] },
    { name: 'Distributive Law', exprs: ['A·(B+C) = AB+AC', 'A+(B·C) = (A+B)(A+C)'] },
    { name: "De Morgan's Theorem", exprs: ["(A+B)' = A'·B'", "(A·B)' = A'+B'"] },
    { name: 'Absorption Law', exprs: ['A + AB = A', 'A · (A+B) = A'] },
    { name: 'Consensus Theorem', exprs: ["AB + A'C + BC = AB + A'C", "A'B' + A·C is minimizable"] },
    { name: 'Involution Law', exprs: ["(A')' = A"] },
];

const GATE_DEFS = [
    {
        name: 'AND',
        desc: 'Output is 1 only if ALL inputs are 1.',
        symbol: 'A · B',
        color: '#4f8ef7',
        truth: [['A', 'B', 'Out'], [0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
    },
    {
        name: 'OR',
        desc: 'Output is 1 if ANY input is 1.',
        symbol: 'A + B',
        color: '#a78bfa',
        truth: [['A', 'B', 'Out'], [0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]],
    },
    {
        name: 'NOT',
        desc: 'Output is the inverse of the input.',
        symbol: "A'",
        color: '#34d399',
        truth: [['A', 'Out'], [0, 1], [1, 0]],
    },
    {
        name: 'NAND',
        desc: 'NOT AND — inverse of AND gate.',
        symbol: "(A · B)'",
        color: '#f472b6',
        truth: [['A', 'B', 'Out'], [0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
    },
    {
        name: 'NOR',
        desc: 'NOT OR — inverse of OR gate.',
        symbol: "(A + B)'",
        color: '#fb923c',
        truth: [['A', 'B', 'Out'], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 0]],
    },
    {
        name: 'XOR',
        desc: 'Output is 1 if inputs are DIFFERENT.',
        symbol: 'A ⊕ B',
        color: '#fbbf24',
        truth: [['A', 'B', 'Out'], [0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
    },
    {
        name: 'XNOR',
        desc: 'Output is 1 if inputs are the SAME.',
        symbol: "(A ⊕ B)'",
        color: '#38bdf8',
        truth: [['A', 'B', 'Out'], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
    },
];

const KMAP_GUIDE_HTML = `
  <div class="guide-section">
    <h3>What is a Karnaugh Map?</h3>
    <p>A Karnaugh Map (K-Map) is a visual tool for simplifying Boolean expressions. It minimizes the number of gates needed in a logic circuit by grouping adjacent minterms.</p>
  </div>
  <div class="guide-section">
    <h3>Gray Code Ordering</h3>
    <p>K-Map axes use <strong>Gray code</strong> ordering (00, 01, 11, 10) so that adjacent cells differ by exactly one variable — making grouping valid.</p>
    <ul>
      <li>2-variable map: 2×2 grid (4 cells)</li>
      <li>3-variable map: 2×4 grid (8 cells)</li>
      <li>4-variable map: 4×4 grid (16 cells)</li>
    </ul>
  </div>
  <div class="guide-section">
    <h3>Grouping Rules</h3>
    <ol>
      <li>Groups must be powers of 2: <code>1, 2, 4, 8, 16</code></li>
      <li>Larger groups → simpler expression</li>
      <li>Groups can wrap around edges (the map is toroidal)</li>
      <li><strong>Don't Cares (X)</strong> can be included in groups when it helps minimize</li>
      <li>Every <code>1</code> must be covered by at least one group</li>
    </ol>
  </div>
  <div class="guide-section">
    <h3>Reading the Result</h3>
    <p>For each group, identify which variables stay <strong>constant</strong> — those form the product term:</p>
    <ul>
      <li>If the variable is always 1 in the group → use it directly (<code>A</code>)</li>
      <li>If the variable is always 0 in the group → use its complement (<code>A'</code>)</li>
      <li>If the variable changes → eliminate it from the term</li>
    </ul>
    <p>The final SOP expression is the OR of all group terms.</p>
  </div>
  <div class="guide-section">
    <h3>Example</h3>
    <p>For a 3-variable map with minterms {1, 3, 5, 7}:</p>
    <ul>
      <li>All minterms have <code>C=1</code></li>
      <li>Result: <code>C</code></li>
    </ul>
  </div>
`;

function renderLaws() {
    const grid = document.getElementById('lawsGrid');
    grid.innerHTML = BOOLEAN_LAWS.map(law => `
    <div class="law-card">
      <div class="law-name">${law.name}</div>
      <div class="law-exprs">
        ${law.exprs.map(e => `<div class="law-expr">${escHtml2(e)}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderGates() {
    const grid = document.getElementById('gatesGrid');
    grid.innerHTML = GATE_DEFS.map(gate => {
        const headers = gate.truth[0];
        const rows = gate.truth.slice(1);
        const tableHTML = `
      <table class="truth-table gate-truth-mini">
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
        <div class="gate-card-name" style="color:${gate.color}">${gate.name}</div>
        <div class="gate-card-desc">${gate.desc}</div>
        <div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--text-code);margin-bottom:14px;background:rgba(255,255,255,0.04);padding:6px 10px;border-radius:6px;">${escHtml2(gate.symbol)}</div>
        ${tableHTML}
      </div>
    `;
    }).join('');
}

function renderKmapGuide() {
    document.getElementById('kmapGuide').innerHTML = KMAP_GUIDE_HTML;
}

function initLearn() {
    renderLaws();
    renderGates();
    renderKmapGuide();

    document.querySelectorAll('.sub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const sub = btn.dataset.sub;
            document.getElementById('sub-' + sub).classList.add('active');
        });
    });
}

function escHtml2(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
