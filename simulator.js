/**
 * simulator.js — Canvas-based Logic Gate Simulator
 */

const SIM = {
    canvas: null,
    ctx: null,
    gates: [],
    wires: [],
    dragging: null,
    connecting: null,
    offsetX: 0,
    offsetY: 0,
    hoverGate: null,
    hoverPort: null,
};

const GATE_W = 90;
const GATE_H = 60;
const PORT_R = 7;

const GATE_COLORS = {
    AND: '#38bdf8',
    OR: '#38bdf8',
    NOT: '#38bdf8',
    NAND: '#38bdf8',
    NOR: '#38bdf8',
    XOR: '#38bdf8',
    XNOR: '#38bdf8',
    INPUT: '#22c55e',
    OUTPUT: '#38bdf8',
};


function gateInputCount(type) {
    if (type === 'NOT') return 1;
    if (type === 'INPUT') return 0;
    if (type === 'OUTPUT') return 1;
    return 2;
}

function evalGate(type, inputs) {
    const a = inputs[0] ?? 0;
    const b = inputs[1] ?? 0;
    switch (type) {
        case 'AND': return a & b;
        case 'OR': return a | b;
        case 'NOT': return a ? 0 : 1;
        case 'NAND': return (a & b) ? 0 : 1;
        case 'NOR': return (a | b) ? 0 : 1;
        case 'XOR': return a ^ b;
        case 'XNOR': return (a ^ b) ? 0 : 1;
        case 'INPUT': return a;
        case 'OUTPUT': return a;
        default: return 0;
    }
}

function getPortPositions(gate) {
    const { x, y, type } = gate;
    const inCount = gateInputCount(type);
    const ports = { inputs: [], output: null };
    if (inCount === 1) {
        ports.inputs = [{ x: x, y: y + GATE_H / 2 }];
    } else if (inCount === 2) {
        ports.inputs = [
            { x: x, y: y + GATE_H * 0.3 },
            { x: x, y: y + GATE_H * 0.7 },
        ];
    }
    ports.output = { x: x + GATE_W, y: y + GATE_H / 2 };
    return ports;
}

function drawGate(ctx, gate) {
    const { x, y, type, value } = gate;
    const ports = getPortPositions(gate);
    const isHovered = gate === SIM.hoverGate;
    const isDragging = gate === SIM.dragging;

    ctx.save();

    // 1. Gate chassis background & border
    ctx.fillStyle = '#141824'; // --surface-card
    roundRect(ctx, x, y, GATE_W, GATE_H, 8);
    ctx.fill();

    ctx.strokeStyle = isDragging ? '#38bdf8' : (isHovered ? 'rgba(56, 189, 248, 0.6)' : 'rgba(226, 232, 240, 0.16)');
    ctx.lineWidth = (isDragging || isHovered) ? 1.5 : 1;
    roundRect(ctx, x, y, GATE_W, GATE_H, 8);
    ctx.stroke();

    // 2. Type label at top
    ctx.fillStyle = isHovered ? '#38bdf8' : '#94a3b8';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(type, x + 8, y + 6);

    // 3. Logic state indicator LED (top right)
    const ledX = x + GATE_W - 10;
    const ledY = y + 10;
    ctx.beginPath();
    ctx.arc(ledX, ledY, 3.5, 0, Math.PI * 2);
    if (value) {
        ctx.fillStyle = '#22c55e'; // Precision LED green
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.fill();
    } else {
        ctx.fillStyle = '#64748b'; // Muted slate
        ctx.shadowBlur = 0;
        ctx.fill();
    }
    ctx.restore();

    // 4. Draw IEEE Symbol in center
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.6;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.05)';

    const cx = x + GATE_W / 2;
    const cy = y + GATE_H / 2 + 3;
    const gw = 32;
    const gh = 26;
    const gx = cx - gw / 2;
    const gy = cy - gh / 2;

    switch (type) {
        case 'AND': {
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + gw * 0.5, gy);
            ctx.quadraticCurveTo(gx + gw, gy, gx + gw, cy);
            ctx.quadraticCurveTo(gx + gw, gy + gh, gx + gw * 0.5, gy + gh);
            ctx.lineTo(gx, gy + gh);
            ctx.closePath();
            ctx.stroke();
            break;
        }
        case 'OR': {
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.quadraticCurveTo(gx + gw * 0.35, gy, gx + gw, cy);
            ctx.quadraticCurveTo(gx + gw * 0.35, gy + gh, gx, gy + gh);
            ctx.quadraticCurveTo(gx + gw * 0.25, cy, gx, gy);
            ctx.stroke();
            break;
        }
        case 'NOT': {
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + gw * 0.75, cy);
            ctx.lineTo(gx, gy + gh);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(gx + gw * 0.75 + 3, cy, 3, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        case 'NAND': {
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + gw * 0.45, gy);
            ctx.quadraticCurveTo(gx + gw * 0.8, gy, gx + gw * 0.8, cy);
            ctx.quadraticCurveTo(gx + gw * 0.8, gy + gh, gx + gw * 0.45, gy + gh);
            ctx.lineTo(gx, gy + gh);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(gx + gw * 0.8 + 3, cy, 3, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        case 'NOR': {
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.quadraticCurveTo(gx + gw * 0.3, gy, gx + gw * 0.8, cy);
            ctx.quadraticCurveTo(gx + gw * 0.3, gy + gh, gx, gy + gh);
            ctx.quadraticCurveTo(gx + gw * 0.2, cy, gx, gy);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(gx + gw * 0.8 + 3, cy, 3, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        case 'XOR': {
            ctx.beginPath();
            ctx.moveTo(gx - 4, gy);
            ctx.quadraticCurveTo(gx + gw * 0.25 - 4, cy, gx - 4, gy + gh);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(gx + 2, gy);
            ctx.quadraticCurveTo(gx + gw * 0.4 + 2, gy, gx + gw, cy);
            ctx.quadraticCurveTo(gx + gw * 0.4 + 2, gy + gh, gx + 2, gy + gh);
            ctx.quadraticCurveTo(gx + gw * 0.25 + 2, cy, gx + 2, gy);
            ctx.stroke();
            break;
        }
        case 'XNOR': {
            ctx.beginPath();
            ctx.moveTo(gx - 4, gy);
            ctx.quadraticCurveTo(gx + gw * 0.25 - 4, cy, gx - 4, gy + gh);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(gx + 2, gy);
            ctx.quadraticCurveTo(gx + gw * 0.35 + 2, gy, gx + gw * 0.8, cy);
            ctx.quadraticCurveTo(gx + gw * 0.35 + 2, gy + gh, gx + 2, gy + gh);
            ctx.quadraticCurveTo(gx + gw * 0.25 + 2, cy, gx + 2, gy);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(gx + gw * 0.8 + 3, cy, 3, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        case 'INPUT': {
            ctx.fillStyle = '#090b10';
            roundRect(ctx, cx - 18, cy - 10, 36, 20, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.2)';
            roundRect(ctx, cx - 18, cy - 10, 36, 20, 10);
            ctx.stroke();

            const knobX = value ? cx + 8 : cx - 8;
            ctx.beginPath();
            ctx.arc(knobX, cy, 7, 0, Math.PI * 2);
            ctx.fillStyle = value ? '#22c55e' : '#64748b';
            ctx.fill();

            ctx.fillStyle = '#f1f5f9';
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(value ? '1' : '0', value ? cx - 7 : cx + 7, cy);
            break;
        }
        case 'OUTPUT': {
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#090b10';
            ctx.fill();
            ctx.strokeStyle = value ? '#22c55e' : 'rgba(226, 232, 240, 0.2)';
            ctx.stroke();

            ctx.fillStyle = value ? '#22c55e' : '#64748b';
            ctx.font = 'bold 12px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(value ? '1' : '0', cx, cy);
            break;
        }
    }
    ctx.restore();

    // 5. Input Ports
    ports.inputs.forEach((p, i) => {
        const inWire = SIM.wires.find(w => w.toGate === gate.id && w.toPort === i);
        const hasSignal = inWire ? Boolean(SIM.gates.find(g => g.id === inWire.fromGate)?.value) : false;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, PORT_R, 0, Math.PI * 2);
        if (inWire) {
            ctx.fillStyle = hasSignal ? '#22c55e' : '#1c2232';
            ctx.fill();
            ctx.strokeStyle = hasSignal ? '#22c55e' : '#64748b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(226, 232, 240, 0.06)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.24)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    });

    // 6. Output Port (if not OUTPUT component)
    if (type !== 'OUTPUT' && ports.output) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ports.output.x, ports.output.y, PORT_R, 0, Math.PI * 2);
        ctx.fillStyle = value ? '#22c55e' : '#1c2232';
        ctx.fill();
        ctx.strokeStyle = value ? '#22c55e' : 'rgba(226, 232, 240, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
}

function drawWire(ctx, wire) {
    const fromGate = SIM.gates.find(g => g.id === wire.fromGate);
    const toGate = SIM.gates.find(g => g.id === wire.toGate);
    if (!fromGate || !toGate) return;
    const from = getPortPositions(fromGate).output;
    const to = getPortPositions(toGate).inputs[wire.toPort];
    if (!from || !to) return;
    const value = fromGate.value;

    ctx.save();
    ctx.strokeStyle = value ? '#34d399' : '#475569';
    ctx.lineWidth = value ? 3 : 2;
    ctx.shadowColor = value ? '#34d399' : 'transparent';
    ctx.shadowBlur = value ? 8 : 0;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const cx = (from.x + to.x) / 2;
    ctx.bezierCurveTo(cx, from.y, cx, to.y, to.x, to.y);
    ctx.stroke();
    ctx.restore();
}

function drawAll() {
    const cvs = SIM.canvas;
    if (!cvs) return;
    const ctx = SIM.ctx || (cvs.getContext ? cvs.getContext('2d') : null);
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // 1. Technical background
    ctx.fillStyle = '#0e121a';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // 2. Technical coordinate grid lines (30px intervals for F41.4 & F41.5)
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < cvs.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cvs.height);
        ctx.stroke();
    }
    for (let y = 0; y < cvs.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cvs.width, y);
        ctx.stroke();
    }

    // 3. Crisp technical coordinate dot-grid (20px intervals rgba(226, 232, 240, 0.08))
    ctx.fillStyle = 'rgba(226, 232, 240, 0.08)';
    for (let dx = 20; dx < cvs.width; dx += 20) {
        for (let dy = 20; dy < cvs.height; dy += 20) {
            ctx.beginPath();
            ctx.arc(dx, dy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // 4. Render wires
    SIM.wires.forEach(w => drawWire(ctx, w));

    // 5. Render gates
    SIM.gates.forEach(g => drawGate(ctx, g));

    // 6. Live connection guideline
    if (SIM.connecting) {
        const fromGate = SIM.gates.find(g => g.id === SIM.connecting.gateId);
        if (fromGate) {
            const from = getPortPositions(fromGate).output;
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(SIM.connecting.mouseX, SIM.connecting.mouseY);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 7. Empty-state guidance hint overlay
    const hint = typeof document !== 'undefined' ? document.querySelector('.sim-hint') : null;
    if (hint) {
        if (SIM.gates.length === 0) {
            hint.classList.remove('hidden');
        } else {
            hint.classList.add('hidden');
        }
    }
}

function evaluate() {
    // Topological sort and evaluate via Kahn's algorithm
    const inDegree = {};
    const adj = {};
    SIM.gates.forEach(g => {
        inDegree[g.id] = 0;
        adj[g.id] = [];
    });
    SIM.wires.forEach(w => {
        if (inDegree[w.toGate] !== undefined) inDegree[w.toGate]++;
        if (adj[w.fromGate]) adj[w.fromGate].push(w.toGate);
    });

    const queue = SIM.gates.filter(g => (inDegree[g.id] || 0) === 0).map(g => g.id);
    const order = [];
    const tempIn = { ...inDegree };
    while (queue.length) {
        const id = queue.shift();
        order.push(id);
        (adj[id] || []).forEach(next => {
            tempIn[next]--;
            if (tempIn[next] === 0) queue.push(next);
        });
    }

    // Cycle safety: append any unvisited gates
    const visitedSet = new Set(order);
    SIM.gates.forEach(g => {
        if (!visitedSet.has(g.id)) order.push(g.id);
    });

    order.forEach(id => {
        const gate = SIM.gates.find(g => g.id === id);
        if (!gate) return;
        if (gate.type === 'INPUT') return; // User-controlled value

        const inWires = SIM.wires.filter(w => w.toGate === id);
        const inCount = gateInputCount(gate.type);
        const inputs = [];
        for (let i = 0; i < inCount; i++) {
            inputs[i] = 0; // Default unconnected inputs to 0
        }
        inWires.forEach(w => {
            const src = SIM.gates.find(g => g.id === w.fromGate);
            if (src) inputs[w.toPort] = src.value ?? 0;
        });
        gate.value = evalGate(gate.type, inputs);
    });

    drawAll();
}

function hitTest(x, y) {
    for (let i = SIM.gates.length - 1; i >= 0; i--) {
        const g = SIM.gates[i];
        if (x >= g.x && x <= g.x + GATE_W && y >= g.y && y <= g.y + GATE_H) return g;
    }
    return null;
}

function hitPort(x, y) {
    for (const g of SIM.gates) {
        const ports = getPortPositions(g);
        // Output
        const op = ports.output;
        if (Math.hypot(x - op.x, y - op.y) <= PORT_R + 4) return { gate: g, port: 'output', pos: op };
        // Inputs
        ports.inputs.forEach((p, i) => {
            if (Math.hypot(x - p.x, y - p.y) <= PORT_R + 4) return { gate: g, port: i, pos: p };
        });
    }
    return null;
}

function hitInputPort(x, y) {
    for (const g of SIM.gates) {
        const ports = getPortPositions(g);
        for (let i = 0; i < ports.inputs.length; i++) {
            const p = ports.inputs[i];
            if (Math.hypot(x - p.x, y - p.y) <= PORT_R + 6) return { gate: g, portIdx: i };
        }
    }
    return null;
}

function hitOutputPort(x, y) {
    for (const g of SIM.gates) {
        if (g.type === 'OUTPUT') continue; // OUTPUT component has no output port
        const ports = getPortPositions(g);
        const op = ports.output;
        if (op && Math.hypot(x - op.x, y - op.y) <= PORT_R + 6) return g;
    }
    return null;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

let gateIdCounter = 1;
let wireIdCounter = 1;

function initSimulator() {
    const canvas = document.getElementById('simCanvas');
    if (!canvas) return;
    SIM.canvas = canvas;
    SIM.ctx = canvas.getContext ? canvas.getContext('2d') : null;

    // Resize canvas to container
    function resize() {
        if (!canvas.parentElement) return;
        const rect = canvas.parentElement.getBoundingClientRect ? canvas.parentElement.getBoundingClientRect() : { width: 700, height: 500 };
        canvas.width = rect.width || 700;
        canvas.height = 500;
        drawAll();
    }
    resize();
    if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('resize', resize);
    }

    // Drag from toolbar
    const chips = document.querySelectorAll ? document.querySelectorAll('.gate-chip[draggable]') : [];
    chips.forEach(chip => {
        chip.addEventListener('dragstart', e => {
            if (e.dataTransfer && e.dataTransfer.setData) {
                e.dataTransfer.setData('gate-type', chip.dataset.gate);
            }
        });
    });

    canvas.addEventListener('dragover', e => {
        if (e.preventDefault) e.preventDefault();
    });

    canvas.addEventListener('drop', e => {
        if (e.preventDefault) e.preventDefault();
        const type = e.dataTransfer ? e.dataTransfer.getData('gate-type') : null;
        if (!type) return;
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const x = (e.clientX ?? 0) - (rect.left ?? 0) - GATE_W / 2;
        const y = (e.clientY ?? 0) - (rect.top ?? 0) - GATE_H / 2;
        SIM.gates.push({ id: gateIdCounter++, type, x, y, value: 0 });
        evaluate();
    });

    // Mouse events
    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const mx = (e.clientX ?? 0) - (rect.left ?? 0);
        const my = (e.clientY ?? 0) - (rect.top ?? 0);

        // Check output port for wire drawing
        const outGate = hitOutputPort(mx, my);
        if (outGate && outGate.type !== 'OUTPUT') {
            SIM.connecting = { gateId: outGate.id, mouseX: mx, mouseY: my };
            return;
        }

        const hit = hitTest(mx, my);
        if (hit) {
            if (hit.type === 'INPUT') {
                // Toggle value on click and re-evaluate
                hit.value = hit.value ? 0 : 1;
                evaluate();
                return;
            }
            SIM.dragging = hit;
            SIM.offsetX = mx - hit.x;
            SIM.offsetY = my - hit.y;
        }
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const mx = (e.clientX ?? 0) - (rect.left ?? 0);
        const my = (e.clientY ?? 0) - (rect.top ?? 0);

        if (SIM.connecting) {
            SIM.connecting.mouseX = mx;
            SIM.connecting.mouseY = my;
            drawAll();
            return;
        }

        if (SIM.dragging) {
            SIM.dragging.x = mx - SIM.offsetX;
            SIM.dragging.y = my - SIM.offsetY;
            drawAll();
            return;
        }

        SIM.hoverGate = hitTest(mx, my);
        drawAll();
    });

    canvas.addEventListener('mouseup', e => {
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const mx = (e.clientX ?? 0) - (rect.left ?? 0);
        const my = (e.clientY ?? 0) - (rect.top ?? 0);

        if (SIM.connecting) {
            // Check if dropped on an input port
            const inp = hitInputPort(mx, my);
            if (inp && inp.gate.id !== SIM.connecting.gateId) {
                // Auto-replace: Enforce single driver per input port
                SIM.wires = SIM.wires.filter(w => !(w.toGate === inp.gate.id && w.toPort === inp.portIdx));
                SIM.wires.push({
                    id: wireIdCounter++,
                    fromGate: SIM.connecting.gateId,
                    fromPort: 0,
                    toGate: inp.gate.id,
                    toPort: inp.portIdx,
                    value: 0
                });
                evaluate();
            }
            SIM.connecting = null;
            drawAll();
            return;
        }

        SIM.dragging = null;
    });

    canvas.addEventListener('dblclick', e => {
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const mx = (e.clientX ?? 0) - (rect.left ?? 0);
        const my = (e.clientY ?? 0) - (rect.top ?? 0);
        const hit = hitTest(mx, my);
        if (hit) {
            // Remove gate and all connected wires
            SIM.gates = SIM.gates.filter(g => g.id !== hit.id);
            SIM.wires = SIM.wires.filter(w => w.fromGate !== hit.id && w.toGate !== hit.id);
            evaluate();
        }
    });

    const clearBtn = document.getElementById('clearSimBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            SIM.gates = [];
            SIM.wires = [];
            SIM.connecting = null;
            SIM.dragging = null;
            drawAll();
        });
    }

    const evalBtn = document.getElementById('evalSimBtn');
    if (evalBtn) {
        evalBtn.addEventListener('click', evaluate);
    }

    drawAll();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SIM,
        GATE_W,
        GATE_H,
        PORT_R,
        GATE_COLORS,
        gateInputCount,
        evalGate,
        getPortPositions,
        drawGate,
        drawWire,
        drawAll,
        evaluate,
        hitTest,
        hitPort,
        hitInputPort,
        hitOutputPort,
        initSimulator,
    };
}
