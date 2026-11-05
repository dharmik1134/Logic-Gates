/**
 * solver.js — Boolean Algebra Parser, Simplifier, Truth Table & SVG Circuit Generator
 */

/* ──────────────────────────────────────────
   TOKENIZER
   ────────────────────────────────────────── */
function tokenize(expr) {
    const tokens = [];
    const canEndFactor = t => t && (t.type === 'VAR' || t.type === 'CONST' || t.type === 'RPAREN' || t.type === 'POSTNOT');
    const canStartFactor = t => t && (t.type === 'VAR' || t.type === 'CONST' || t.type === 'LPAREN' || t.type === 'NOT');

    function pushToken(t) {
        if (canStartFactor(t) && canEndFactor(tokens[tokens.length - 1])) {
            tokens.push({ type: 'AND' });
        }
        tokens.push(t);
    }

    let i = 0;
    const s = expr;
    while (i < s.length) {
        const c = s[i];
        if (/\s/.test(c)) {
            i++;
        } else if (c === '0' || c === '1') {
            pushToken({ type: 'CONST', value: c === '1' ? 1 : 0 });
            i++;
        } else if (/[A-Za-z]/.test(c)) {
            pushToken({ type: 'VAR', name: c.toUpperCase() });
            i++;
        } else if (c === '!' || c === '~') {
            pushToken({ type: 'NOT' });
            i++;
        } else if (c === "'") {
            pushToken({ type: 'POSTNOT' });
            i++;
        } else if (c === '+') {
            pushToken({ type: 'OR' });
            i++;
        } else if (c === '^' || c === '⊕') {
            pushToken({ type: 'XOR' });
            i++;
        } else if (c === '.' || c === '*' || c === '&') {
            pushToken({ type: 'AND' });
            i++;
        } else if (c === '(') {
            pushToken({ type: 'LPAREN' });
            i++;
        } else if (c === ')') {
            pushToken({ type: 'RPAREN' });
            i++;
        } else {
            i++;
        }
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
        let left = parseXor();
        while (peek() && peek().type === 'OR') {
            consume();
            left = { type: 'OR', left, right: parseXor() };
        }
        return left;
    }

    function parseXor() {
        let left = parseTerm();
        while (peek() && peek().type === 'XOR') {
            consume();
            left = { type: 'XOR', left, right: parseTerm() };
        }
        return left;
    }

    function parseTerm() {
        let left = parseFactor();
        while (peek()) {
            const t = peek();
            if (!t || t.type === 'OR' || t.type === 'XOR' || t.type === 'RPAREN') break;
            if (t.type === 'AND') consume();
            else if (t.type !== 'VAR' && t.type !== 'CONST' && t.type !== 'NOT' && t.type !== 'LPAREN') break;
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
        if (peek().type === 'CONST') {
            const val = consume().value;
            let node = { type: 'CONST', value: val };
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
    if (node.type === 'CONST') return vars;
    if (node.type === 'NOT') return collectVars(node.child, vars);
    if (node.left) collectVars(node.left, vars);
    if (node.right) collectVars(node.right, vars);
    return vars;
}

function evalNode(node, assignment) {
    if (node.type === 'CONST') return node.value ? 1 : 0;
    if (node.type === 'VAR') return assignment[node.name] ? 1 : 0;
    if (node.type === 'NOT') return evalNode(node.child, assignment) ? 0 : 1;
    if (node.type === 'AND') return evalNode(node.left, assignment) & evalNode(node.right, assignment);
    if (node.type === 'OR') return evalNode(node.left, assignment) | evalNode(node.right, assignment);
    if (node.type === 'XOR') return evalNode(node.left, assignment) ^ evalNode(node.right, assignment);
    return 0;
}

function nodeToString(node) {
    if (!node) return '';
    if (node.type === 'CONST') return String(node.value);
    if (node.type === 'VAR') return node.name;
    if (node.type === 'NOT') {
        const inner = nodeToString(node.child);
        if (node.child.type === 'VAR' || node.child.type === 'CONST') return inner + "'";
        return "(" + inner + ")'";
    }
    if (node.type === 'AND') {
        const l = (node.left.type === 'OR' || node.left.type === 'XOR') ? '(' + nodeToString(node.left) + ')' : nodeToString(node.left);
        const r = (node.right.type === 'OR' || node.right.type === 'XOR') ? '(' + nodeToString(node.right) + ')' : nodeToString(node.right);
        return l + r;
    }
    if (node.type === 'XOR') {
        const l = node.left.type === 'OR' ? '(' + nodeToString(node.left) + ')' : nodeToString(node.left);
        const r = node.right.type === 'OR' ? '(' + nodeToString(node.right) + ')' : nodeToString(node.right);
        return l + '^' + r;
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
    if (n === 0) return '1';
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

    // Step 1: Essential Prime Implicants (EPIs)
    for (const m of minterms) {
        const covering = unique.filter(imp => imp.minterms.includes(m));
        if (covering.length === 1) {
            const epi = covering[0];
            if (!chosen.includes(epi)) {
                chosen.push(epi);
                epi.minterms.forEach(tm => covered.add(tm));
            }
        }
    }

    // Step 2: Cover remaining uncovered minterms
    const remaining = unique.filter(imp => !chosen.includes(imp));
    while (covered.size < minterms.length) {
        remaining.sort((a, b) => {
            const countA = a.minterms.filter(m => !covered.has(m)).length;
            const countB = b.minterms.filter(m => !covered.has(m)).length;
            return countB - countA;
        });
        const best = remaining[0];
        if (!best) break;
        if (best.minterms.filter(m => !covered.has(m)).length === 0) break;
        chosen.push(best);
        best.minterms.forEach(tm => covered.add(tm));
        remaining.shift();
    }

    chosen.sort((a, b) => implicantToString(a, n, vars).localeCompare(implicantToString(b, n, vars)));
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
    if (node.type === 'VAR' || node.type === 'CONST') return node;
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
    if (node.type === 'XOR') {
        const l = convertAST(node.left, mode);
        const r = convertAST(node.right, mode);
        if (mode === 'nand') {
            const nAB = { type: 'NAND', left: l, right: r };
            const nA = { type: 'NAND', left: l, right: nAB };
            const nB = { type: 'NAND', left: r, right: nAB };
            return { type: 'NAND', left: nA, right: nB };
        }
        if (mode === 'nor') {
            const norAB = { type: 'NOR', left: l, right: r };
            const norA = { type: 'NOR', left: l, right: l };
            const norB = { type: 'NOR', left: r, right: r };
            const norAnorB = { type: 'NOR', left: norA, right: norB };
            return { type: 'NOR', left: norAnorB, right: norAB };
        }
    }
    // NAND/NOR etc — just recurse children
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
    if (node.type === 'CONST') { out.add(String(node.value)); return out; }
    if (node.type === 'NOT') return gatherAllVars(node.child, out);
    if (node.left) gatherAllVars(node.left, out);
    if (node.right) gatherAllVars(node.right, out);
    return out;
}

function layoutAST(node) {
    if (node.type === 'VAR' || node.type === 'CONST') {
        // VAR / CONST takes no width — its position comes from _varPos
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
    if (node.type === 'VAR' || node.type === 'CONST') {
        const name = node.type === 'CONST' ? String(node.value) : node.name;
        const pos = _varPos[name];
        if (!pos) return;  // safety

        if (!pos.drawn) {
            // Draw the label text exactly once
            svgElements.push(
                `<text x="${pos.x - 10}" y="${pos.y}"
          text-anchor="end" dominant-baseline="middle"
          font-family="JetBrains Mono,monospace" font-size="14"
          font-weight="bold" fill="#94a3b8">${escHtml(name)}</text>`
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
        routeWire(node.child._outX, node.child._outY, gx, gy + GH / 2);

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

    routeWire(node.left._outX, node.left._outY, mainX, mainY + GH * 0.3);
    routeWire(node.right._outX, node.right._outY, mainX, mainY + GH * 0.7);

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

/* ── Segment store for crossing-detection ── */
let _segments = [];

/* Store one axis-aligned connection as up to 3 orthogonal segments (H→V→H) */
function routeWire(x1, y1, x2, y2) {
    // 50% horizontal distance elbow column, snapped to integer
    const elbowX = Math.round(x1 + (x2 - x1) * 0.5);
    if (x1 !== elbowX) _segments.push({ x1, y1, x2: elbowX, y2: y1 });
    if (y1 !== y2) _segments.push({ x1: elbowX, y1, x2: elbowX, y2 });
    if (elbowX !== x2) _segments.push({ x1: elbowX, y1: y2, x2, y2 });
}

/* Render all segments at once, adding bridge arcs at crossings */
function flushWires() {
    const EPS = 0.5, BR = 5;
    const stroke = `fill="none" stroke="rgba(148,163,184,0.55)" stroke-width="1.5"`;

    // Normalise segments so x1<=x2, y1<=y2
    const segs = _segments.map(s => ({
        x1: Math.min(s.x1, s.x2), y1: Math.min(s.y1, s.y2),
        x2: Math.max(s.x1, s.x2), y2: Math.max(s.y1, s.y2)
    }));

    const horiz = segs.filter(s => Math.abs(s.y2 - s.y1) < EPS);
    const vert = segs.filter(s => Math.abs(s.x2 - s.x1) < EPS);

    // For each horizontal seg, find x-coords where a vertical seg crosses it
    const bridgeMap = new Map();
    horiz.forEach((h, hi) => {
        const bxs = [];
        vert.forEach(v => {
            if (h.x1 + EPS < v.x1 && v.x1 < h.x2 - EPS &&
                v.y1 + EPS < h.y1 && h.y1 < v.y2 - EPS) {
                bxs.push(v.x1);
            }
        });
        bridgeMap.set(hi, [...new Set(bxs)].sort((a, b) => a - b));
    });

    // Draw vertical segments plain
    vert.forEach(v => {
        svgElements.push(`<line x1="${v.x1}" y1="${v.y1}" x2="${v.x2}" y2="${v.y2}" ${stroke}/>`);
    });

    // Draw horizontal segments with bridge arcs at crossings
    horiz.forEach((h, hi) => {
        const bxs = bridgeMap.get(hi);
        let d = `M${h.x1},${h.y1}`;
        bxs.forEach(bx => {
            d += ` H${bx - BR} A${BR},${BR} 0 0 1 ${bx + BR},${h.y1}`;
        });
        d += ` H${h.x2}`;
        svgElements.push(`<path d="${d}" ${stroke}/>`);
    });
}

function generateCircuitSVG(node, mode) {
    svgElements = [];
    _segments = [];
    _varPos = {};

    const converted = convertAST(JSON.parse(JSON.stringify(node)), mode);
    const allVars = Array.from(gatherAllVars(converted)).sort();
    layoutAST(converted);

    const PAD = 48;
    const INPUT_X = PAD + 64;
    const VAR_SP = Math.max(GH + 14, 54);
    const inputH = allVars.length * VAR_SP;
    const circuitH = converted._h;
    const totalH = Math.max(inputH, circuitH) + PAD * 2;

    const varStartY = PAD + (totalH - PAD * 2 - inputH) / 2 + VAR_SP / 2;
    allVars.forEach((v, i) => {
        _varPos[v] = { x: INPUT_X, y: varStartY + i * VAR_SP, drawn: false };
    });

    const circuitX = INPUT_X + 22;
    const circuitY = PAD + (totalH - PAD * 2 - circuitH) / 2;

    renderNode(converted, circuitX, circuitY);
    flushWires();   // draw all wires with bridge arcs in one pass

    // Output marker
    const outX = converted._outX, outY = converted._outY;
    svgElements.push(`
    <line x1="${outX}" y1="${outY}" x2="${outX + 28}" y2="${outY}" stroke="rgba(148,163,184,0.6)" stroke-width="1.5"/>
    <circle cx="${outX + 28}" cy="${outY}" r="6" fill="#34d399" opacity="0.9"/>
    <text x="${outX + 40}" y="${outY}" dominant-baseline="middle" font-size="12" fill="#34d399" font-weight="bold">OUT</text>
  `);

    const svgW = Math.max(outX + 80, 360);
    return `<svg xmlns="http://www.w3.org/2000/svg"
    width="${svgW}" height="${Math.max(totalH, 120)}"
    viewBox="0 0 ${svgW} ${Math.max(totalH, 120)}">
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        tokenize,
        parse,
        collectVars,
        evalNode,
        nodeToString,
        generateTruthTable,
        quineMcCluskey,
        detectLaws,
        mintermsToSOM,
        simplify,
        convertAST,
        layoutAST,
        renderNode,
        routeWire,
        flushWires,
        generateCircuitSVG,
        buildTruthTableHTML,
        getRandomExpression,
        RANDOM_EXPRS,
    };
}
