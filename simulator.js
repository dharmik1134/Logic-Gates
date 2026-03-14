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
    AND: '#4f8ef7',
    OR: '#a78bfa',
    NOT: '#34d399',
    NAND: '#f472b6',
    NOR: '#fb923c',
    XOR: '#fbbf24',
    XNOR: '#38bdf8',
    INPUT: '#94a3b8',
    OUTPUT: '#f87171',
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
    const color = GATE_COLORS[type] || '#4f8ef7';
    const inCount = gateInputCount(type);
    const ports = getPortPositions(gate);

    // Shadow/glow
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = gate === SIM.hoverGate ? 18 : 8;

    // Body
    const grad = ctx.createLinearGradient(x, y, x + GATE_W, y + GATE_H);
    grad.addColorStop(0, hexAlpha(color, 0.25));
    grad.addColorStop(1, hexAlpha(color, 0.1));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, GATE_W, GATE_H, 12);
    ctx.fill();

    ctx.strokeStyle = hexAlpha(color, 0.7);
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, GATE_W, GATE_H, 12);
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type, x + GATE_W / 2, y + GATE_H / 2);

    // Value badge
    if (type !== 'INPUT') {
        ctx.fillStyle = value ? '#34d399' : '#475569';
        ctx.beginPath();
        ctx.arc(x + GATE_W - 10, y + 10, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Input ports
    ports.inputs.forEach((p, i) => {
        const connected = SIM.wires.some(w => w.toGate === gate.id && w.toPort === i);
        ctx.beginPath();
        ctx.arc(p.x, p.y, PORT_R, 0, Math.PI * 2);
        ctx.fillStyle = connected ? hexAlpha(color, 0.6) : 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = hexAlpha(color, 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Value dot for INPUT type
        if (type === 'INPUT' && i === 0) {
            ctx.fillStyle = gate.value ? '#34d399' : '#dc2626';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gate.value ? '1' : '0', x + GATE_W / 2, y + GATE_H / 2 + 14);
        }
    });

    // Output port
    if (type !== 'OUTPUT' || true) {
        ctx.beginPath();
        ctx.arc(ports.output.x, ports.output.y, PORT_R, 0, Math.PI * 2);
        ctx.fillStyle = gate.value ? hexAlpha('#34d399', 0.8) : 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = gate.value ? '#34d399' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

function drawWire(ctx, wire) {
    const fromGate = SIM.gates.find(g => g.id === wire.fromGate);
    const toGate = SIM.gates.find(g => g.id === wire.toGate);
    if (!fromGate || !toGate) return;
    const from = getPortPositions(fromGate).output;
    const to = getPortPositions(toGate).inputs[wire.toPort];
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
    const ctx = SIM.ctx;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < cvs.width; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); ctx.stroke(); }
    for (let y = 0; y < cvs.height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); ctx.stroke(); }

    SIM.wires.forEach(w => drawWire(ctx, w));
    SIM.gates.forEach(g => drawGate(ctx, g));

    // Drawing wire in progress
    if (SIM.connecting) {
        const fromGate = SIM.gates.find(g => g.id === SIM.connecting.gateId);
        if (fromGate) {
            const from = getPortPositions(fromGate).output;
            ctx.save();
            ctx.strokeStyle = 'rgba(79,142,247,0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(SIM.connecting.mouseX, SIM.connecting.mouseY);
            ctx.stroke();
            ctx.restore();
        }
    }

    if (SIM.gates.length === 0) {
        document.querySelector('.sim-hint').classList.remove('hidden');
    } else {
        document.querySelector('.sim-hint').classList.add('hidden');
    }
}

function evaluate() {
    // Topological sort and evaluate
    const inDegree = {};
    const adj = {};
    SIM.gates.forEach(g => { inDegree[g.id] = 0; adj[g.id] = []; });
    SIM.wires.forEach(w => { inDegree[w.toGate]++; adj[w.fromGate].push(w.toGate); });

    const queue = SIM.gates.filter(g => inDegree[g.id] === 0).map(g => g.id);
    const order = [];
    const tempIn = { ...inDegree };
    while (queue.length) {
        const id = queue.shift();
        order.push(id);
        (adj[id] || []).forEach(next => { if (--tempIn[next] === 0) queue.push(next); });
    }

    order.forEach(id => {
        const gate = SIM.gates.find(g => g.id === id);
        if (!gate) return;
        const inWires = SIM.wires.filter(w => w.toGate === id);
        const inputs = [];
        inWires.forEach(w => {
            const src = SIM.gates.find(g => g.id === w.fromGate);
            if (src) inputs[w.toPort] = src.value;
        });
        if (gate.type === 'INPUT') return; // value set by user
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
        const ports = getPortPositions(g);
        const op = ports.output;
        if (Math.hypot(x - op.x, y - op.y) <= PORT_R + 6) return g;
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

function initSimulator() {
    const canvas = document.getElementById('simCanvas');
    SIM.canvas = canvas;
    SIM.ctx = canvas.getContext('2d');

    // Resize canvas
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width || 700;
        canvas.height = 500;
        drawAll();
    }
    resize();
    window.addEventListener('resize', resize);

    // Drag from toolbar
    document.querySelectorAll('.gate-chip[draggable]').forEach(chip => {
        chip.addEventListener('dragstart', e => {
            e.dataTransfer.setData('gate-type', chip.dataset.gate);
        });
    });

    canvas.addEventListener('dragover', e => { e.preventDefault(); });
    canvas.addEventListener('drop', e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('gate-type');
        if (!type) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - GATE_W / 2;
        const y = e.clientY - rect.top - GATE_H / 2;
        SIM.gates.push({ id: gateIdCounter++, type, x, y, value: 0 });
        evaluate();
    });

    // Mouse events
    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Check output port for wire drawing
        const outGate = hitOutputPort(mx, my);
        if (outGate && outGate.type !== 'OUTPUT') {
            SIM.connecting = { gateId: outGate.id, mouseX: mx, mouseY: my };
            return;
        }

        // Check double click on INPUT to toggle
        const inPort = hitInputPort(mx, my);

        const hit = hitTest(mx, my);
        if (hit) {
            if (hit.type === 'INPUT') {
                // Toggle value on click
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
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (SIM.connecting) {
            SIM.connecting.mouseX = mx;
            SIM.connecting.mouseY = my;
            drawAll();
            return;
        }

        if (SIM.dragging) {
            SIM.dragging.x = mx - SIM.offsetX;
            SIM.dragging.y = my - SIM.offsetY;
            evaluate();
            return;
        }

        SIM.hoverGate = hitTest(mx, my);
        drawAll();
    });

    canvas.addEventListener('mouseup', e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (SIM.connecting) {
            // Check if dropped on an input port
            const inp = hitInputPort(mx, my);
            if (inp && inp.gate.id !== SIM.connecting.gateId) {
                // Remove existing wire to this port
                SIM.wires = SIM.wires.filter(w => !(w.toGate === inp.gate.id && w.toPort === inp.portIdx));
                SIM.wires.push({ fromGate: SIM.connecting.gateId, toGate: inp.gate.id, toPort: inp.portIdx });
                evaluate();
            }
            SIM.connecting = null;
            drawAll();
            return;
        }

        SIM.dragging = null;
    });

    canvas.addEventListener('dblclick', e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = hitTest(mx, my);
        if (hit) {
            // Remove gate and connected wires
            SIM.gates = SIM.gates.filter(g => g.id !== hit.id);
            SIM.wires = SIM.wires.filter(w => w.fromGate !== hit.id && w.toGate !== hit.id);
            evaluate();
        }
    });

    document.getElementById('clearSimBtn').addEventListener('click', () => {
        SIM.gates = [];
        SIM.wires = [];
        SIM.connecting = null;
        SIM.dragging = null;
        drawAll();
    });

    document.getElementById('evalSimBtn').addEventListener('click', evaluate);

    drawAll();
}
