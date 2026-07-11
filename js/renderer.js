// Chronicle — canvas timeline renderer: epochs, axis, events with dynamic
// label layout and hit-testing. Pure drawing; interaction lives elsewhere.

import { epochs, catColor, MAX_TIME } from './data.js';
import { state, viewBounds } from './store.js';
import { formatTime, tickStep, ticks, impAlpha } from './time.js';

const FONT_TITLE = '600 12.5px Inter, system-ui, sans-serif';
const FONT_TIME = '500 10.5px Inter, system-ui, sans-serif';
const FONT_TICK = '500 11px Inter, system-ui, sans-serif';
const FONT_EPOCH = '600 11.5px Inter, system-ui, sans-serif';

const EPOCH_ROW_H = 30;
const EPOCH_TOP = 14;
const CARD_H = 40;
const LANE_H = 54;
const CARD_PAD_X = 10;

export class TimelineRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hitRegions = [];   // {x, y, w, h, item, type}
        this.hoverItem = null;
        this.widthCache = new Map();
        this.resize();
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

    xOf(t, start, span) {
        return ((t - start) / span) * this.w;
    }

    textWidth(text, font) {
        const key = font + '|' + text;
        let w = this.widthCache.get(key);
        if (w === undefined) {
            this.ctx.font = font;
            w = this.ctx.measureText(text).width;
            this.widthCache.set(key, w);
        }
        return w;
    }

    hitTest(px, py) {
        // Later regions are drawn on top; test in reverse.
        for (let i = this.hitRegions.length - 1; i >= 0; i--) {
            const r = this.hitRegions[i];
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r;
        }
        return null;
    }

    render() {
        const ctx = this.ctx;
        const { start, end } = viewBounds();
        const span = state.span;
        this.hitRegions = [];

        ctx.clearRect(0, 0, this.w, this.h);

        const axisY = Math.min(Math.max(this.h * 0.4, EPOCH_TOP + 4 * EPOCH_ROW_H + 56), 300);
        this.drawGridAndAxis(start, end, span, axisY);
        if (state.activeCats.has('epoche')) this.drawEpochs(start, end, span);
        this.drawEvents(start, end, span, axisY);
        this.drawCenterMarker(axisY);
    }

    drawGridAndAxis(start, end, span, axisY) {
        const ctx = this.ctx;
        const step = tickStep(span, this.w);
        const sub = step / 5;

        // sub-ticks
        ctx.strokeStyle = 'rgba(148,163,184,0.10)';
        ctx.beginPath();
        for (const t of ticks(start, end, sub)) {
            if (t > MAX_TIME) break;
            const x = this.xOf(t, start, span);
            ctx.moveTo(x, axisY - 5);
            ctx.lineTo(x, axisY + 5);
        }
        ctx.stroke();

        // major ticks: full-height grid line + tick + label
        ctx.font = FONT_TICK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (const t of ticks(start, end, step)) {
            if (t > MAX_TIME) break;
            const x = this.xOf(t, start, span);
            ctx.strokeStyle = 'rgba(148,163,184,0.07)';
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.h);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(148,163,184,0.45)';
            ctx.beginPath();
            ctx.moveTo(x, axisY - 8);
            ctx.lineTo(x, axisY + 8);
            ctx.stroke();
            ctx.fillStyle = 'rgba(203,213,225,0.75)';
            ctx.fillText(formatTime(t), x, axisY + 13);
        }

        // axis line
        ctx.strokeStyle = 'rgba(148,163,184,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, axisY);
        ctx.lineTo(this.w, axisY);
        ctx.stroke();

        // "Heute" edge marker when the right border of time is in view
        if (MAX_TIME <= end) {
            const x = this.xOf(MAX_TIME, start, span);
            ctx.strokeStyle = 'rgba(129,140,248,0.5)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.h);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    drawEpochs(start, end, span) {
        const ctx = this.ctx;
        const labelRight = {};   // per row: right edge of the last drawn label
        for (const ep of epochs) {
            const epEnd = Math.min(ep.end, MAX_TIME);
            if (epEnd <= start || ep.start >= end) continue;
            const x1 = Math.max(-40, this.xOf(ep.start, start, span));
            const x2 = Math.min(this.w + 40, this.xOf(epEnd, start, span));
            const w = x2 - x1;
            if (w < 2) continue;

            const y = EPOCH_TOP + ep.row * EPOCH_ROW_H;
            const h = EPOCH_ROW_H - 7;
            const hovered = this.hoverItem === ep;

            ctx.beginPath();
            ctx.roundRect(x1, y, w, h, 6);
            ctx.fillStyle = hexA(ep.color, hovered ? 0.42 : 0.22);
            ctx.fill();
            ctx.strokeStyle = hexA(ep.color, 0.55);
            ctx.lineWidth = 1;
            ctx.stroke();

            // pin the label inside the on-screen part of the bar; skip it when
            // the visible slice is too narrow or it would collide with the
            // previous label in the same row (row-0 epochs overlap in time)
            const label = ep.title;
            const tw = this.textWidth(label, FONT_EPOCH);
            const visL = Math.max(x1, 0);
            const visR = Math.min(x2, this.w);
            const lx = Math.min(visL + 8, visR - tw - 8);
            if (visR - visL > tw + 16 && lx > (labelRight[ep.row] ?? -Infinity) + 12) {
                ctx.font = FONT_EPOCH;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(241,245,249,0.92)';
                ctx.fillText(label, lx, y + h / 2 + 0.5);
                labelRight[ep.row] = lx + tw;
            }
            this.hitRegions.push({ x: x1, y, w, h, item: ep, type: 'epoch' });
        }
    }

    drawEvents(start, end, span, axisY) {
        const ctx = this.ctx;
        const laneTop = axisY + 40;
        const laneCount = Math.max(3, Math.min(6, Math.floor((this.h - laneTop - 16) / LANE_H)));
        const lanes = Array.from({ length: laneCount }, () => []); // placed [x1,x2] intervals

        // candidates in view, honoring category filter + importance fade
        const candidates = [];
        for (const ev of state.events) {
            if (ev.time < start || ev.time > end) continue;
            const highlighted = ev.id === state.highlightedEventId;
            if (!state.activeCats.has(ev.cat) && !highlighted) continue;
            const alpha = highlighted ? 1 : impAlpha(ev.imp, span);
            if (alpha <= 0.02) continue;
            candidates.push({ ev, alpha, highlighted });
        }

        // place important events first so they never lose their card to a minor one
        candidates.sort((a, b) => (a.ev.imp - b.ev.imp) || (a.ev.time - b.ev.time));

        const placed = [];
        const dots = [];
        for (const c of candidates) {
            const x = this.xOf(c.ev.time, start, span);
            const label = c.ev.title;
            const cardW = Math.min(190, Math.max(
                this.textWidth(label, FONT_TITLE),
                this.textWidth(formatTime(c.ev.time), FONT_TIME)
            ) + CARD_PAD_X * 2);
            const x1 = x - cardW / 2 - 6;
            const x2 = x + cardW / 2 + 6;

            let lane = -1;
            for (let i = 0; i < laneCount; i++) {
                if (lanes[i].every(([a, b]) => x2 < a || x1 > b)) { lane = i; break; }
            }
            if (lane === -1) {
                dots.push(c);      // no room: render as a density dot on the axis
                continue;
            }
            lanes[lane].push([x1, x2]);
            placed.push({ ...c, x, lane, cardW });
        }

        // density dots first (underneath)
        for (const c of dots) {
            const x = this.xOf(c.ev.time, start, span);
            ctx.globalAlpha = c.alpha * 0.55;
            ctx.fillStyle = catColor(c.ev.cat);
            ctx.beginPath();
            ctx.arc(x, axisY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            this.hitRegions.push({ x: x - 6, y: axisY - 6, w: 12, h: 12, item: c.ev, type: 'event' });
        }

        // cards, back lanes first
        placed.sort((a, b) => b.lane - a.lane);
        for (const p of placed) {
            this.drawEventCard(p, laneTop, axisY);
        }
    }

    drawEventCard({ ev, alpha, highlighted, x, lane, cardW }, laneTop, axisY) {
        const ctx = this.ctx;
        const color = catColor(ev.cat);
        const hovered = this.hoverItem === ev;
        const y = laneTop + lane * LANE_H;
        const cx = Math.round(x - cardW / 2);

        ctx.globalAlpha = alpha;

        // node on the axis + stem down to the card
        ctx.strokeStyle = hexA(color, 0.35);
        ctx.beginPath();
        ctx.moveTo(x, axisY + 6);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, axisY, highlighted || hovered ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        if (highlighted) {
            ctx.strokeStyle = hexA(color, 0.6);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, axisY, 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        // card
        ctx.beginPath();
        ctx.roundRect(cx, y, cardW, CARD_H, 8);
        ctx.fillStyle = hovered || highlighted ? 'rgba(30,41,66,0.98)' : 'rgba(17,24,44,0.92)';
        ctx.fill();
        ctx.strokeStyle = hovered || highlighted ? hexA(color, 0.9) : 'rgba(148,163,184,0.22)';
        ctx.stroke();

        // category accent
        ctx.beginPath();
        ctx.roundRect(cx, y, 3, CARD_H, { tl: 8, bl: 8, tr: 0, br: 0 });
        ctx.fillStyle = color;
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.rect(cx + 3, y, cardW - 3 - 4, CARD_H);
        ctx.clip();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = FONT_TIME;
        ctx.fillStyle = hexA(color, 0.95);
        ctx.fillText(formatTime(ev.time) + (ev.aiGenerated ? ' ✨' : ''), cx + CARD_PAD_X, y + 15);
        ctx.font = FONT_TITLE;
        ctx.fillStyle = 'rgba(241,245,249,0.95)';
        ctx.fillText(ev.title, cx + CARD_PAD_X, y + 31);
        ctx.restore();

        ctx.globalAlpha = 1;
        this.hitRegions.push({ x: cx, y, w: cardW, h: CARD_H, item: ev, type: 'event' });
    }

    drawCenterMarker(axisY) {
        const ctx = this.ctx;
        const x = this.w / 2;
        ctx.strokeStyle = 'rgba(129,140,248,0.18)';
        ctx.beginPath();
        ctx.moveTo(x, axisY - 26);
        ctx.lineTo(x, axisY + 26);
        ctx.stroke();
    }
}

// hex color + alpha → rgba() string, memoized
const rgbaCache = new Map();
function hexA(hex, a) {
    const key = hex + a;
    let v = rgbaCache.get(key);
    if (!v) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        v = `rgba(${r},${g},${b},${a})`;
        rgbaCache.set(key, v);
    }
    return v;
}
