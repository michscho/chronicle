// Chronicle — minimap: all 13.8 billion years on a logarithmic strip.
// Time maps to x via log10(years before "today"), so deep time compresses
// gracefully while recent history keeps room.

import { epochs, catColor, MIN_TIME, MAX_TIME } from './data.js';
import { state, viewBounds, setView } from './store.js';

const LOG_MAX = Math.log10(MAX_TIME - MIN_TIME);
const LOG_MIN = Math.log10(1); // 1 year before today = right edge

export function timeToU(t) {
    const yearsAgo = Math.max(1, MAX_TIME - t);
    return 1 - (Math.log10(yearsAgo) - LOG_MIN) / (LOG_MAX - LOG_MIN);
}

export function uToTime(u) {
    const yearsAgo = Math.pow(10, LOG_MIN + (1 - u) * (LOG_MAX - LOG_MIN));
    return MAX_TIME - yearsAgo;
}

export class Minimap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        this.bindInput();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.w = rect.width;
        this.h = rect.height;
        this.canvas.width = Math.round(rect.width * dpr);
        this.canvas.height = Math.round(rect.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    bindInput() {
        let dragging = false;
        const jump = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const u = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            setView(uToTime(u), state.span);
        };
        this.canvas.addEventListener('pointerdown', (e) => {
            dragging = true;
            this.canvas.setPointerCapture(e.pointerId);
            jump(e);
        });
        this.canvas.addEventListener('pointermove', (e) => { if (dragging) jump(e); });
        this.canvas.addEventListener('pointerup', () => { dragging = false; });
        this.canvas.addEventListener('pointercancel', () => { dragging = false; });
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        // epoch bands (row 0 = cosmic/geologic backdrop, row 1 = human eras on top)
        for (const row of [0, 1]) {
            for (const ep of epochs) {
                if (ep.row !== row) continue;
                const x1 = timeToU(ep.start) * this.w;
                const x2 = timeToU(Math.min(ep.end, MAX_TIME)) * this.w;
                ctx.fillStyle = ep.color + (row === 0 ? '38' : '55');
                ctx.fillRect(x1, row === 0 ? 4 : this.h / 2, Math.max(1, x2 - x1), this.h - 8 - (row === 0 ? 0 : this.h / 2 - 4));
            }
        }

        // top-importance events as dots
        for (const ev of state.events) {
            if (ev.imp > 1) continue;
            const x = timeToU(ev.time) * this.w;
            ctx.fillStyle = catColor(ev.cat);
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(x, this.h / 2, 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // current viewport window
        const { start, end } = viewBounds();
        const x1 = timeToU(start) * this.w;
        const x2 = timeToU(end) * this.w;
        const wx = Math.max(6, x2 - x1);
        ctx.fillStyle = 'rgba(129,140,248,0.18)';
        ctx.strokeStyle = 'rgba(129,140,248,0.85)';
        ctx.beginPath();
        ctx.roundRect(x1, 1.5, wx, this.h - 3, 4);
        ctx.fill();
        ctx.stroke();
    }
}
