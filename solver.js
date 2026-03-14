/**
 * solver.js — Boolean Algebra Parser, Simplifier, Truth Table & SVG Circuit Generator
 */

/* ──────────────────────────────────────────
   TOKENIZER
   ────────────────────────────────────────── */
function tokenize(expr) {
    const tokens = [];
    let i = 0;
    const s = expr.replace(/\s+/g, '');
    while (i < s.length) {
        const c = s[i];
        if (/[A-Za-z0-9]/.test(c)) {
            let name = '';
            while (i < s.length && /[A-Za-z0-9]/.test(s[i])) name += s[i++];
            tokens.push({ type: 'VAR', name: name.toUpperCase() });
            if (i < s.length && s[i] === "'") { i++; tokens.push({ type: 'POSTNOT' }); }
        } else if (c === '!' || c === '~') { tokens.push({ type: 'NOT' }); i++; }
        else if (c === '+') { tokens.push({ type: 'OR' }); i++; }
        else if (c === '.' || c === '&') { tokens.push({ type: 'AND' }); i++; }
        else if (c === '(') { tokens.push({ type: 'LPAREN' }); i++; }
        else if (c === ')') { tokens.push({ type: 'RPAREN' }); i++; }
        else if (c === "'") { tokens.push({ type: 'POSTNOT' }); i++; }
        else { i++; }
    }
    return tokens;
}

/* ──────────────────────────────────────────
   PARSER
   ────────────────────────────────────────── */
function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    function parseExpr() {
        let left = parseTerm();
        while (peek() && peek().type === 'OR') {
            consume();
            left = { type: 'OR', left, right: parseTerm() };
        }
        return left;
    }

    function parseTerm() {
        let left = parseFactor();
        while (peek()) {
            const t = peek();
            if (!t || t.type === 'OR' || t.type === 'RPAREN') break;
            if (t.type === 'AND') consume();
            else if (t.type !== 'VAR' && t.type !== 'NOT' && t.type !== 'LPAREN') break;
            left = { type: 'AND', left, right: parseFactor() };
        }
        return left;
    }

    function parseFactor() {
        if (peek() && peek().type === 'NOT') {
            consume();
            return { type: 'NOT', child: parseFactor() };
        }
        return parsePrimary();
    }

    function parsePrimary() {
        if (!peek()) throw new Error('Unexpected end');
        if (peek().type === 'LPAREN') {
            consume();
            const node = parseExpr();
            if (peek() && peek().type === 'RPAREN') consume();
            let result = node;
            while (peek() && peek().type === 'POSTNOT') { consume(); result = { type: 'NOT', child: result }; }
            return result;
        }
        if (peek().type === 'VAR') {
            const v = consume().name;
            let node = { type: 'VAR', name: v };
            while (peek() && peek().type === 'POSTNOT') { consume(); node = { type: 'NOT', child: node }; }
            return node;
        }
        throw new Error('Unexpected token: ' + JSON.stringify(peek()));
    }

    return parseExpr();
}

/* ──────────────────────────────────────────
   AST UTILITIES
   ────────────────────────────────────────── */
function collectVars(node, vars = new Set()) {
    if (!node) return vars;
    if (node.type === 'VAR') { vars.add(node.name); return vars; }
    if (node.type === 'NOT') return collectVars(node.child, vars);
    collectVars(node.left, vars);
    collectVars(node.right, vars);
    return vars;
}

function evalNode(node, assignment) {
    if (node.type === 'VAR') return assignment[node.name] ? 1 : 0;
    if (node.type === 'NOT') return evalNode(node.child, assignment) ? 0 : 1;
    if (node.type === 'AND') return evalNode(node.left, assignment) & evalNode(node.right, assignment);
    if (node.type === 'OR') return evalNode(node.left, assignment) | evalNode(node.right, assignment);
    return 0;
}

function nodeToString(node) {
    if (!node) return '';
    if (node.type === 'VAR') return node.name;
    if (node.type === 'NOT') {
        const inner = nodeToString(node.child);
        if (node.child.type === 'VAR') return inner + "'";
        return "(" + inner + ")'";
    }
    if (node.type === 'AND') {
        const l = node.left.type === 'OR' ? '(' + nodeToString(node.left) + ')' : nodeToString(node.left);
        const r = node.right.type === 'OR' ? '(' + nodeToString(node.right) + ')' : nodeToString(node.right);
        return l + r;
    }
    if (node.type === 'OR') return nodeToString(node.left) + '+' + nodeToString(node.right);
    return '';
}

/* ──────────────────────────────────────────
   TRUTH TABLE
   ────────────────────────────────────────── */
function generateTruthTable(node, vars) {
    const n = vars.length;
    const rows = [];
    for (let i = 0; i < (1 << n); i++) {
        const assignment = {};
        vars.forEach((v, idx) => { assignment[v] = (i >> (n - 1 - idx)) & 1; });
        rows.push({ assignment, result: evalNode(node, assignment) });
    }
    return rows;
}

/* ──────────────────────────────────────────
   QUINE-McCLUSKEY SIMPLIFIER
   ────────────────────────────────────────── */
function simplify(exprStr) {
    let node;
    try { node = parse(tokenize(exprStr)); }
    catch (e) { return { error: 'Invalid expression: ' + e.message }; }

    const vars = Array.from(collectVars(node)).sort();
    const n = vars.length;
    const steps = [];
    const originalStr = nodeToString(node);
    steps.push({ law: 'Original Expression', expr: originalStr });

    const ttRows = generateTruthTable(node, vars);
    const minterms = [];
    ttRows.forEach((r, idx) => { if (r.result === 1) minterms.push(idx); });

    const simplified = quineMcCluskey(minterms, n, vars);

    const laws = detectLaws(originalStr, simplified, minterms, vars);
    steps.push(...laws);
    steps.push({ law: 'Simplified Result', expr: simplified });

    return { simplified, steps, truthTable: ttRows, vars, node };
}

function detectLaws(original, simplified, minterms, vars) {
    const n = vars.length;
    const steps = [];
    if (minterms.length === 0) { steps.push({ law: 'Null Law: A·0 = 0', expr: '0' }); return steps; }
    if (minterms.length === (1 << n)) { steps.push({ law: 'Complement Law: A+A\'=1 / Null Law: A+1=1', expr: '1' }); return steps; }
    steps.push({ law: 'Expand to Sum of Minterms (SOM)', expr: mintermsToSOM(minterms, vars) });
    if (mintermsToSOM(minterms, vars) !== simplified) {
        steps.push({ law: 'Apply Absorption & Idempotent Laws', expr: '(grouping minterms using QMC)' });
        steps.push({ law: 'Apply Boolean Complementation & Distribution', expr: simplified });
    }
    return steps;
}

function mintermsToSOM(minterms, vars) {
    if (!minterms.length) return '0';
    const n = vars.length;
    return minterms.map(m => {
        let term = '';
        for (let i = 0; i < n; i++) term += ((m >> (n - 1 - i)) & 1) ? vars[i] : vars[i] + "'";
        return term;
    }).join('+');
}

function quineMcCluskey(minterms, n, vars) {
    if (!minterms.length) return '0';
    if (minterms.length === (1 << n)) return '1';
    let implicants = minterms.map(m => ({ bits: m, mask: 0, minterms: [m] }));
    let combined = true;
    while (combined) {
        combined = false;
        const next = [];
        const used = new Set();
        for (let i = 0; i < implicants.length; i++) {
            for (let j = i + 1; j < implicants.length; j++) {
                const a = implicants[i], b = implicants[j];
                if (a.mask !== b.mask) continue;
                const diff = a.bits ^ b.bits;
                if (diff !== 0 && (diff & (diff - 1)) === 0) {
                    used.add(i); used.add(j);
                    const ni = { bits: a.bits & b.bits, mask: a.mask | diff, minterms: [...new Set([...a.minterms, ...b.minterms])] };
                    if (!next.some(x => x.bits === ni.bits && x.mask === ni.mask)) next.push(ni);
                    combined = true;
                }
            }
        }
        implicants.forEach((imp, i) => { if (!used.has(i) && !next.some(x => x.bits === imp.bits && x.mask === imp.mask)) next.push(imp); });
        if (combined) implicants = next;
    }
    const unique = [];
    const seen = new Set();
    for (const imp of implicants) {
        const key = imp.bits + '_' + imp.mask;
        if (!seen.has(key)) { seen.add(key); unique.push(imp); }
    }
    const covered = new Set();
    const chosen = [];
    unique.sort((a, b) => b.minterms.length - a.minterms.length);
    for (const imp of unique) {
        if (imp.minterms.some(m => !covered.has(m))) {
            chosen.push(imp);
            imp.minterms.forEach(m => covered.add(m));
        }
    }
    return chosen.map(imp => implicantToString(imp, n, vars)).join('+') || '0';
}

function implicantToString(imp, n, vars) {
    let term = '';
    for (let i = 0; i < n; i++) {
        const bp = n - 1 - i;
        if (!((imp.mask >> bp) & 1)) term += ((imp.bits >> bp) & 1) ? vars[i] : vars[i] + "'";
    }
    return term || '1';
}

/* ──────────────────────────────────────────
   RANDOM EXPRESSIONS
   ────────────────────────────────────────── */
const RANDOM_EXPRS = [
    "AB+AC(A+B)", "A'B+AB'", "!(A+B)", "A+A'B", "(A+B)(A+C)",
    "A'BC+AB'C+ABC'", "AB+A'C+BC", "!(AB)+!(A+B)", "A(B+C)+AB'", "(A'+B)(A+B')",
];
function getRandomExpression() { return RANDOM_EXPRS[Math.floor(Math.random() * RANDOM_EXPRS.length)]; }

/* ──────────────────────────────────────────
   SVG GATE DIAGRAM GENERATOR
   ────────────────────────────────────────── */

/* -- Gate SVG path shapes (IEEE standard-like) -- */
const GATE_PATHS = {
    AND: (x, y, w, h) => `M${x},${y} L${x + w * 0.5},${y} Q${x + w},${y} ${x + w},${y + h / 2} Q${x + w},${y + h} ${x + w * 0.5},${y + h} L${x},${y + h} Z`,
    OR: (x, y, w, h) => `M${x},${y} Q${x + w * 0.35},${y} ${x + w},${y + h / 2} Q${x + w * 0.35},${y + h} ${x},${y + h} Q${x + w * 0.25},${y + h / 2} ${x},${y} Z`,
    NOT: (x, y, w, h) => `M${x},${y} L${x + w * 0.8},${y + h / 2} L${x},${y + h} Z`,
    NAND: (x, y, w, h) => `M${x},${y} L${x + w * 0.45},${y} Q${x + w * 0.85},${y} ${x + w * 0.85},${y + h / 2} Q${x + w * 0.85},${y + h} ${x + w * 0.45},${y + h} L${x},${y + h} Z`,
    NOR: (x, y, w, h) => `M${x},${y} Q${x + w * 0.3},${y} ${x + w * 0.85},${y + h / 2} Q${x + w * 0.3},${y + h} ${x},${y + h} Q${x + w * 0.2},${y + h / 2} ${x},${y} Z`,
    XOR: (x, y, w, h) => `M${x + w * 0.1},${y} Q${x + w * 0.45},${y} ${x + w},${y + h / 2} Q${x + w * 0.45},${y + h} ${x + w * 0.1},${y + h} Q${x + w * 0.35},${y + h / 2} ${x + w * 0.1},${y} Z`,
    XNOR: (x, y, w, h) => `M${x + w * 0.1},${y} Q${x + w * 0.45},${y} ${x + w * 0.85},${y + h / 2} Q${x + w * 0.45},${y + h} ${x + w * 0.1},${y + h} Q${x + w * 0.35},${y + h / 2} ${x + w * 0.1},${y} Z`,
};
const GATE_COLORS_SVG = {
    AND: '#4f8ef7', OR: '#a78bfa', NOT: '#34d399', NAND: '#f472b6', NOR: '#fb923c', XOR: '#fbbf24', XNOR: '#38bdf8'
};
const BUBBLE_GATES = new Set(['NOT', 'NAND', 'NOR', 'XNOR']); // output bubble

/* ── Gate conversion for NAND-only / NOR-only ── */
// NAND-only equivalents (using De Morgan's):
// AND(a,b)  = NAND(NAND(a,b), NAND(a,b))
// OR(a,b)   = NAND(NAND(a,a), NAND(b,b))
// NOT(a)    = NAND(a,a)
// NOR-only equivalents:
// OR(a,b)   = NOR(NOR(a,b), NOR(a,b))
// AND(a,b)  = NOR(NOR(a,a), NOR(b,b))
// NOT(a)    = NOR(a,a)

function convertAST(node, mode) {
    if (mode === 'all') return node;
    if (node.type === 'VAR') return node;
    if (node.type === 'NOT') {
        const child = convertAST(node.child, mode);
        if (mode === 'nand') return { type: 'NAND', left: child, right: child };
        if (mode === 'nor') return { type: 'NOR', left: child, right: child };
    }
    if (node.type === 'AND') {
        const l = convertAST(node.left, mode);
        const r = convertAST(node.right, mode);
        if (mode === 'nand') {
            // AND = NAND(NAND(l,r), NAND(l,r))
            const inner = { type: 'NAND', left: l, right: r };
            return { type: 'NAND', left: inner, right: inner };
        }
        if (mode === 'nor') {
            // AND = NOR(NOR(l,l), NOR(r,r))
            const nl = { type: 'NOR', left: l, right: l };
            const nr = { type: 'NOR', left: r, right: r };
            return { type: 'NOR', left: nl, right: nr };
        }
    }
    if (node.type === 'OR') {
        const l = convertAST(node.left, mode);
        const r = convertAST(node.right, mode);
        if (mode === 'nand') {
            // OR = NAND(NAND(l,l), NAND(r,r))
            const nl = { type: 'NAND', left: l, right: l };
            const nr = { type: 'NAND', left: r, right: r };
            return { type: 'NAND', left: nl, right: nr };
        }
        if (mode === 'nor') {
            // OR = NOR(NOR(l,r), NOR(l,r))
            const inner = { type: 'NOR', left: l, right: r };
            return { type: 'NOR', left: inner, right: inner };
        }
    }
    // NAND/NOR/XOR etc — just recurse children
    const n = { ...node };
    if (n.left) n.left = convertAST(n.left, mode);
    if (n.right) n.right = convertAST(n.right, mode);
    if (n.child) n.child = convertAST(n.child, mode);
    return n;
}

/* ── Layout engine ── */
const GW = 72, GH = 48, HGAP = 110, VGAP = 16;

// Shared input variable positions (populated before each render)
let _varPos = {};   // { varName: { x, y, drawn } }

/* Collect all unique variable names from the AST */
function gatherAllVars(node, out = new Set()) {
    if (!node) return out;
    if (node.type === 'VAR') { out.add(node.name); return out; }
    if (node.type === 'NOT') return gatherAllVars(node.child, out);
    gatherAllVars(node.left, out);
    gatherAllVars(node.right, out);
    return out;
}

function layoutAST(node) {
    if (node.type === 'VAR') {
        // VAR takes no width — its position comes from _varPos
        node._w = 0; node._h = GH;
        return;
    }
    if (node.type === 'NOT') {
        layoutAST(node.child);
        node._w = node.child._w + GW + HGAP;
        node._h = Math.max(GH, node.child._h);
    } else {
        layoutAST(node.left);
        layoutAST(node.right);
        node.left._offsetY = 0;
        node.right._offsetY = node.left._h + VGAP;
        node._h = node.left._h + VGAP + node.right._h;
        node._w = Math.max(node.left._w, node.right._w) + GW + HGAP;
    }
}

let svgElements = [];

function renderNode(node, x, y) {
    if (node.type === 'VAR') {
        const pos = _varPos[node.name];
        if (!pos) return;  // safety

        if (!pos.drawn) {
            // Draw the label text exactly once
            svgElements.push(
                `<text x="${pos.x - 10}" y="${pos.y}"
          text-anchor="end" dominant-baseline="middle"
          font-family="JetBrains Mono,monospace" font-size="14"
          font-weight="bold" fill="#94a3b8">${node.name}</text>`
            );
            // Draw a small horizontal stub to the right of the label
            svgElements.push(
                `<line x1="${pos.x - 8}" y1="${pos.y}" x2="${pos.x}" y2="${pos.y}"
          stroke="rgba(148,163,184,0.4)" stroke-width="1.5"/>`
            );
            pos.drawn = true;
        } else {
            // Second+ use: draw a small junction dot at the shared wire point
            svgElements.push(
                `<circle cx="${pos.x}" cy="${pos.y}" r="3"
          fill="#94a3b8" opacity="0.7"/>`
            );
        }

        node._outX = pos.x;
        node._outY = pos.y;
        return;
    }

    if (node.type === 'NOT') {
        const childX = x;
        const childY = y + (node._h - node.child._h) / 2;
        renderNode(node.child, childX, childY);

        const gx = x + node.child._w + HGAP;
        const gy = y + (node._h - GH) / 2;
        drawGateSVG('NOT', gx, gy, GW, GH);
        drawWireSVG(node.child._outX, node.child._outY, gx, gy + GH / 2);

        node._outX = gx + GW + 8;
        node._outY = gy + GH / 2;
        return;
    }

    // Binary gate
    const lx = x, ly = y + node.left._offsetY;
    renderNode(node.left, lx, ly);
    const rx = x, ry = y + node.right._offsetY;
    renderNode(node.right, rx, ry);

    const mainX = x + Math.max(node.left._w, node.right._w) + HGAP;
    const mainY = y + (node._h - GH) / 2;
    drawGateSVG(node.type, mainX, mainY, GW, GH);

    drawWireSVG(node.left._outX, node.left._outY, mainX, mainY + GH * 0.3);
    drawWireSVG(node.right._outX, node.right._outY, mainX, mainY + GH * 0.7);

    const hasBubble = BUBBLE_GATES.has(node.type);
    node._outX = mainX + GW + (hasBubble ? 10 : 2);
    node._outY = mainY + GH / 2;
}

function drawGateSVG(type, x, y, w, h) {
    const color = GATE_COLORS_SVG[type] || '#4f8ef7';
    const pathFn = GATE_PATHS[type] || GATE_PATHS['AND'];
    const hasBubble = BUBBLE_GATES.has(type);
    svgElements.push(`
    <path d="${pathFn(x, y, w, h)}" fill="${color}22" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    <text x="${x + w * (hasBubble ? 0.38 : 0.5)}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle"
      font-family="JetBrains Mono,monospace" font-size="10" font-weight="bold" fill="${color}">${escHtml(type)}</text>
  `);
    if (hasBubble) {
        svgElements.push(`<circle cx="${x + w + 5}" cy="${y + h / 2}" r="5" fill="none" stroke="${color}" stroke-width="2"/>`);
    }
}

function drawWireSVG(x1, y1, x2, y2) {
    const mx = x1 + (x2 - x1) * 0.55;
    svgElements.push(
        `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"
      fill="none" stroke="rgba(148,163,184,0.5)" stroke-width="1.5"/>`
    );
}

function generateCircuitSVG(node, mode) {
    svgElements = [];
    _varPos = {};

    const converted = convertAST(JSON.parse(JSON.stringify(node)), mode);

    // Gather all unique variable names (sorted)
    const allVars = Array.from(gatherAllVars(converted)).sort();

    // Layout to get total height
    layoutAST(converted);

    const PAD = 48;
    const INPUT_X = PAD + 60;          // x where variable label stubs end
    const VAR_SPACING = Math.max(GH + 12, 52);
    const inputPanelH = allVars.length * VAR_SPACING;
    const circuitH = converted._h;
    const totalH = Math.max(inputPanelH, circuitH) + PAD * 2;

    // Centre variables vertically relative to the circuit
    const varStartY = PAD + (totalH - PAD * 2 - inputPanelH) / 2 + VAR_SPACING / 2;

    // Assign fixed positions to each unique variable
    allVars.forEach((v, i) => {
        _varPos[v] = { x: INPUT_X, y: varStartY + i * VAR_SPACING, drawn: false };
    });

    // Shift circuit to start after the input column
    const circuitStartX = INPUT_X + 20;
    const circuitStartY = PAD + (totalH - PAD * 2 - circuitH) / 2;

    renderNode(converted, circuitStartX, circuitStartY);

    // Output marker
    const outX = converted._outX, outY = converted._outY;
    svgElements.push(`
    <line x1="${outX}" y1="${outY}" x2="${outX + 28}" y2="${outY}" stroke="rgba(148,163,184,0.6)" stroke-width="2"/>
    <circle cx="${outX + 28}" cy="${outY}" r="6" fill="#34d399" stroke="#34d399" opacity="0.85"/>
    <text x="${outX + 40}" y="${outY}" dominant-baseline="middle" font-size="12" fill="#34d399" font-weight="bold">OUT</text>
  `);

    const totalW = outX + 80;
    return `<svg xmlns="http://www.w3.org/2000/svg"
    width="${Math.max(totalW, 360)}" height="${Math.max(totalH, 120)}"
    viewBox="0 0 ${Math.max(totalW, 360)} ${Math.max(totalH, 120)}">
    ${svgElements.join('\n')}
  </svg>`;
}


/* ──────────────────────────────────────────
   UI — SOLVER
   ────────────────────────────────────────── */
let _lastSolveNode = null;
let _circuitMode = 'all';

function initSolver() {
    const input = document.getElementById('solverInput');
    const solveBtn = document.getElementById('solveBtn');
    const randomBtn = document.getElementById('randomBtn');
    const clearBtn = document.getElementById('clearSolverBtn');

    function run() {
        const expr = input.value.trim();
        if (!expr) return;
        const res = simplify(expr);
        if (res.error) {
            document.getElementById('simplifiedExpr').textContent = res.error;
            document.getElementById('simplifiedExpr').style.color = '#f87171';
            document.getElementById('solverResult').style.display = 'block';
            document.getElementById('truthTableCard').style.display = 'none';
            document.getElementById('circuitCard').style.display = 'none';
            document.getElementById('stepsList').innerHTML = '';
            return;
        }
        document.getElementById('simplifiedExpr').style.color = '';
        document.getElementById('simplifiedExpr').textContent = res.simplified;
        document.getElementById('solverResult').style.display = 'block';

        document.getElementById('stepsList').innerHTML = res.steps.map((s, i) => `
      <div class="step-item">
        <div class="step-num">${i + 1}</div>
        <div class="step-body">
          <div class="step-law">${escHtml(s.law)}</div>
          <div class="step-expr">${escHtml(s.expr)}</div>
        </div>
      </div>`).join('');

        if (res.truthTable && res.vars.length <= 4) {
            document.getElementById('truthTableCard').style.display = 'block';
            document.getElementById('truthTableWrap').innerHTML = buildTruthTableHTML(res.truthTable, res.vars);
        } else {
            document.getElementById('truthTableCard').style.display = 'none';
        }

        // Circuit
        _lastSolveNode = res.node;
        document.getElementById('circuitCard').style.display = 'block';
        renderCircuit(_circuitMode);
    }

    solveBtn.addEventListener('click', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    randomBtn.addEventListener('click', () => { input.value = getRandomExpression(); run(); });
    clearBtn.addEventListener('click', () => {
        input.value = '';
        document.getElementById('solverResult').style.display = 'none';
        document.getElementById('truthTableCard').style.display = 'none';
        document.getElementById('circuitCard').style.display = 'none';
        _lastSolveNode = null;
    });

    // Circuit mode buttons
    document.querySelectorAll('.circuit-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.circuit-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _circuitMode = btn.dataset.mode;
            if (_lastSolveNode) renderCircuit(_circuitMode);
        });
    });
}

function renderCircuit(mode) {
    if (!_lastSolveNode) return;
    const wrap = document.getElementById('circuitSvgWrap');
    const note = document.getElementById('circuitExprNote');
    try {
        const svg = generateCircuitSVG(_lastSolveNode, mode);
        wrap.innerHTML = svg;
        const modeLabel = { all: 'All Gates (AND/OR/NOT)', nand: 'NAND-Only (universal)', nor: 'NOR-Only (universal)' };
        note.textContent = `Circuit type: ${modeLabel[mode]}`;
    } catch (e) {
        wrap.innerHTML = `<div style="color:var(--danger);padding:16px;">${escHtml(e.message)}</div>`;
    }
}

function buildTruthTableHTML(rows, vars) {
    const headerCells = [...vars, 'Output'].map(v => `<th>${escHtml(v)}</th>`).join('');
    const bodyRows = rows.map(r => {
        const cells = vars.map(v => `<td class="${r.assignment[v] ? 'val-one' : 'val-zero'}">${r.assignment[v]}</td>`).join('');
        const out = `<td class="${r.result ? 'val-one' : 'val-zero'}">${r.result}</td>`;
        return `<tr>${cells}${out}</tr>`;
    }).join('');
    return `<table class="truth-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
