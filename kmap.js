/**
 * kmap.js — Karnaugh Map: SOP + POS with sub-tab circuits
 * Maxterms = 0-cells only (X don't cares handled separately)
 */

const GRAY2 = [0, 1];
const GRAY4 = [0, 1, 3, 2];

const KMAP_CONFIGS = {
    2: { rows: 2, cols: 2, rowVars: ['A'], colVars: ['B'], rowGray: GRAY2, colGray: GRAY2 },
    3: { rows: 2, cols: 4, rowVars: ['A'], colVars: ['B', 'C'], rowGray: GRAY2, colGray: GRAY4 },
    4: { rows: 4, cols: 4, rowVars: ['A', 'B'], colVars: ['C', 'D'], rowGray: GRAY4, colGray: GRAY4 },
};

let kmapState = { n: 3, cells: {} };
// Gate mode per form
let _kmapGateMode = { sop: 'all', pos: 'all' };
// AST cache
let _sopAST = null, _posAST = null;

/* ━━━━━━━━━ TABLE BUILD ━━━━━━━━━ */
function kmapCellIndex(n, ri, ci) {
    const cfg = KMAP_CONFIGS[n];
    return ((cfg.rowGray[ri] ?? 0) << cfg.colVars.length) | (cfg.colGray[ci] ?? 0);
}

function buildKmapTable(n) {
    const cfg = KMAP_CONFIGS[n];
    const container = document.getElementById('kmapContainer');
    let html = `<table class="kmap-table"><thead><tr>
    <th class="kmap-header" style="color:var(--accent-2)">${ke(cfg.rowVars.join(''))} \\ ${ke(cfg.colVars.join(''))}</th>`;
    cfg.colGray.slice(0, cfg.cols).forEach(g =>
        html += `<th class="kmap-header">${g.toString(2).padStart(cfg.colVars.length, '0')}</th>`
    );
    html += '</tr></thead><tbody>';
    cfg.rowGray.slice(0, cfg.rows).forEach((rg, ri) => {
        html += `<tr><td class="kmap-header">${rg.toString(2).padStart(cfg.rowVars.length, '0') || '—'}</td>`;
        cfg.colGray.slice(0, cfg.cols).forEach((cg, ci) => {
            const idx = kmapCellIndex(n, ri, ci);
            const val = kmapState.cells[idx] ?? 0;
            html += `<td class="kmap-cell" data-idx="${idx}" data-val="${val}">${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    container.querySelectorAll('.kmap-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const idx = parseInt(cell.dataset.idx);
            const cur = kmapState.cells[idx] ?? 0;
            const next = cur === 0 ? 1 : cur === 1 ? 'X' : 0;
            kmapState.cells[idx] = next;
            cell.dataset.val = next;
            cell.textContent = next;
            solveKmap();
        });
    });
    solveKmap();
}

/* ━━━━━━━━━ QMC ━━━━━━━━━ */
function qmcCore(terms, dontcares) {
    const all = [...terms, ...dontcares];
    if (!all.length) return [];
    let imps = all.map(m => ({ bits: m, mask: 0, minterms: [m] }));
    let combined = true;
    while (combined) {
        combined = false;
        const next = [], used = new Set();
        for (let i = 0; i < imps.length; i++) for (let j = i + 1; j < imps.length; j++) {
            const a = imps[i], b = imps[j];
            if (a.mask !== b.mask) continue;
            const diff = a.bits ^ b.bits;
            if (diff && !(diff & (diff - 1))) {
                used.add(i); used.add(j);
                const ni = { bits: a.bits & b.bits, mask: a.mask | diff, minterms: [...new Set([...a.minterms, ...b.minterms])] };
                if (!next.some(x => x.bits === ni.bits && x.mask === ni.mask)) next.push(ni);
                combined = true;
            }
        }
        imps.forEach((imp, i) => { if (!used.has(i) && !next.some(x => x.bits === imp.bits && x.mask === imp.mask)) next.push(imp); });
        if (combined) imps = next;
    }
    return imps;
}

function qmcCover(imps, must) {
    const primes = imps.filter(imp => imp.minterms.some(m => must.includes(m)));
    const covered = new Set(), chosen = [];

    // Step 1: Essential Prime Implicants (EPIs)
    for (const m of must) {
        const covering = primes.filter(imp => imp.minterms.includes(m));
        if (covering.length === 1) {
            const epi = covering[0];
            if (!chosen.includes(epi)) {
                chosen.push(epi);
                epi.minterms.forEach(tm => {
                    if (must.includes(tm)) covered.add(tm);
                });
            }
        }
    }

    // Step 2: Greedy cover for remaining uncovered terms
    const remaining = primes.filter(imp => !chosen.includes(imp));
    while (covered.size < must.length) {
        remaining.sort((a, b) => {
            const countA = a.minterms.filter(m => must.includes(m) && !covered.has(m)).length;
            const countB = b.minterms.filter(m => must.includes(m) && !covered.has(m)).length;
            return countB - countA;
        });
        const best = remaining[0];
        if (!best) break;
        if (best.minterms.filter(m => must.includes(m) && !covered.has(m)).length === 0) break;
        chosen.push(best);
        best.minterms.forEach(tm => {
            if (must.includes(tm)) covered.add(tm);
        });
        remaining.shift();
    }
    return chosen;
}

/* ━━━━━━━━━ TERM → STRING ━━━━━━━━━ */
// SOP: bit=1→A, bit=0→A'
function sopTermStr(imp, n, vars) {
    let t = '';
    for (let i = 0; i < n; i++) {
        const bp = n - 1 - i;
        if (!((imp.mask >> bp) & 1)) t += ((imp.bits >> bp) & 1) ? vars[i] : vars[i] + "'";
    }
    return t || '1';
}

// POS maxterm: bit=0→A, bit=1→A'  (complement of SOP rule)
function posTermStr(imp, n, vars) {
    const lits = [];
    for (let i = 0; i < n; i++) {
        const bp = n - 1 - i;
        if (!((imp.mask >> bp) & 1)) lits.push(((imp.bits >> bp) & 1) ? vars[i] + "'" : vars[i]);
    }
    return lits.join('+') || '0';
}

/* ━━━━━━━━━ AST BUILDERS ━━━━━━━━━ */
function buildSopAST(chosen, n, vars) {
    const terms = chosen.map(imp => {
        const lits = [];
        for (let i = 0; i < n; i++) {
            const bp = n - 1 - i;
            if (!((imp.mask >> bp) & 1)) {
                lits.push(((imp.bits >> bp) & 1)
                    ? { type: 'VAR', name: vars[i] }
                    : { type: 'NOT', child: { type: 'VAR', name: vars[i] } });
            }
        }
        return lits.reduce((a, b) => a ? { type: 'AND', left: a, right: b } : b, null);
    }).filter(Boolean);
    return terms.reduce((a, b) => a ? { type: 'OR', left: a, right: b } : b, null);
}

function buildPosAST(chosen, n, vars) {
    const terms = chosen.map(imp => {
        const lits = [];
        for (let i = 0; i < n; i++) {
            const bp = n - 1 - i;
            if (!((imp.mask >> bp) & 1)) {
                lits.push(((imp.bits >> bp) & 1)
                    ? { type: 'NOT', child: { type: 'VAR', name: vars[i] } }
                    : { type: 'VAR', name: vars[i] });
            }
        }
        return lits.reduce((a, b) => a ? { type: 'OR', left: a, right: b } : b, null);
    }).filter(Boolean);
    return terms.reduce((a, b) => a ? { type: 'AND', left: a, right: b } : b, null);
}

/* ━━━━━━━━━ MAIN SOLVE ━━━━━━━━━ */
function solveKmap(cellsOverride, nOverride) {
    if (cellsOverride !== undefined) kmapState.cells = cellsOverride;
    if (nOverride !== undefined) kmapState.n = nOverride;
    const n = kmapState.n, allCount = 1 << n;
    const minterms = [], maxterms = [], dontcares = [];
    for (let i = 0; i < allCount; i++) {
        const v = kmapState.cells[i] ?? 0;
        if (v === 1) minterms.push(i);
        else if (v === 'X') dontcares.push(i);
        else maxterms.push(i);   // 0-cells = maxterms
    }
    const vars = ['A', 'B', 'C', 'D'].slice(0, n);

    /* SOP */
    let sopStr = (minterms.length === 0) ? '0' : (minterms.length === allCount) ? '1' : null;
    let sopChosen = [];
    if (sopStr === null) {
        sopChosen = qmcCover(qmcCore(minterms, dontcares), minterms);
        sopChosen.sort((a, b) => sopTermStr(a, n, vars).localeCompare(sopTermStr(b, n, vars)));
        sopStr = sopChosen.map(imp => sopTermStr(imp, n, vars)).join('+') || '0';
    }
    _sopAST = (sopStr === '0' || sopStr === '1') ? null : buildSopAST(sopChosen, n, vars);

    /* POS — only 0-cells are maxterms */
    let posStr = (maxterms.length === 0) ? '1' : (maxterms.length === allCount) ? '0' : null;
    let posChosen = [];
    if (posStr === null) {
        posChosen = qmcCover(qmcCore(maxterms, dontcares), maxterms);
        posChosen.sort((a, b) => posTermStr(a, n, vars).localeCompare(posTermStr(b, n, vars)));
        posStr = posChosen.map(imp => '(' + posTermStr(imp, n, vars) + ')').join('·') || '1';
    }
    _posAST = (posStr === '0' || posStr === '1') ? null : buildPosAST(posChosen, n, vars);

    /* Notation */
    const mintermNote = minterms.length > 0 && minterms.length < allCount
        ? `Σm(${[...minterms].sort((a, b) => a - b).join(', ')})` : '';
    const maxtermNote = maxterms.length > 0 && maxterms.length < allCount
        ? `ΠM(${[...maxterms].sort((a, b) => a - b).join(', ')})` : '';

    /* DOM update */
    if (typeof document !== 'undefined') {
        const sopEl = document.getElementById('kmapSopExpr');
        if (sopEl) sopEl.innerHTML = `<span style="color:var(--accent)">${ke(sopStr)}</span>`;
        const posEl = document.getElementById('kmapPosExpr');
        if (posEl) posEl.innerHTML = `<span style="color:var(--accent-2)">${ke(posStr)}</span>`;

        const sopNote = document.getElementById('kmapSopNotation');
        if (sopNote) {
            sopNote.innerHTML = mintermNote
                ? `<span class="kmap-notation"><i class="fa-solid fa-sigma" style="font-size:0.7rem;margin-right:4px"></i>${ke(mintermNote)}</span>` : '';
        }

        const posNote = document.getElementById('kmapPosNotation');
        if (posNote) {
            posNote.innerHTML = maxtermNote
                ? `<span class="kmap-notation" style="color:var(--accent-2)"><i class="fa-solid fa-pi" style="font-size:0.7rem;margin-right:4px"></i>${ke(maxtermNote)}</span>` : '';
        }

        /* Render circuits */
        renderKmapFormCircuit('sop');
        renderKmapFormCircuit('pos');
    }

    return { sop: sopStr, pos: posStr, sopAST: _sopAST, posAST: _posAST, minterms, maxterms, dontcares };
}

function renderKmapFormCircuit(form) {
    if (typeof document === 'undefined') return;
    const ast = form === 'sop' ? _sopAST : _posAST;
    const wrap = document.getElementById(form === 'sop' ? 'kmapSopCircuit' : 'kmapPosCircuit');
    if (!wrap) return;
    if (!ast) {
        wrap.innerHTML = `<span class="muted" style="padding:14px;display:block;font-size:.85rem">No circuit — expression is trivial (0 or 1)</span>`;
        return;
    }
    try {
        const svgGen = typeof generateCircuitSVG === 'function' ? generateCircuitSVG : (typeof require !== 'undefined' ? require('./solver.js').generateCircuitSVG : null);
        if (svgGen) {
            wrap.innerHTML = svgGen(ast, _kmapGateMode[form]);
        }
    } catch (e) {
        wrap.innerHTML = `<div style="color:var(--danger);padding:12px">${ke(e.message)}</div>`;
    }
}

function ke(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* ━━━━━━━━━ INIT ━━━━━━━━━ */
function initKmap() {
    buildKmapTable(kmapState.n);

    // Variable count buttons
    document.querySelectorAll('.var-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.var-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            kmapState.n = parseInt(btn.dataset.n);
            kmapState.cells = {};
            buildKmapTable(kmapState.n);
        });
    });

    document.getElementById('clearKmapBtn').addEventListener('click', () => {
        kmapState.cells = {};
        buildKmapTable(kmapState.n);
    });

    // SOP/POS sub-tabs
    document.querySelectorAll('.kmap-subtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.kmap-subtab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.kmap-form-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('kmap-panel-' + btn.dataset.form).classList.add('active');
        });
    });

    // Gate mode buttons per form
    document.querySelectorAll('.kmap-gate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const form = btn.dataset.form;
            document.querySelectorAll(`.kmap-gate-btn[data-form="${form}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _kmapGateMode[form] = btn.dataset.mode;
            renderKmapFormCircuit(form);
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GRAY2,
        GRAY4,
        KMAP_CONFIGS,
        kmapState,
        _kmapGateMode,
        kmapCellIndex,
        buildKmapTable,
        qmcCore,
        qmcCover,
        sopTermStr,
        posTermStr,
        buildSopAST,
        buildPosAST,
        solveKmap,
        renderKmapFormCircuit,
    };
}
