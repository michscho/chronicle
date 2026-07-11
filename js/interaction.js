// Chronicle — input handling: drag/momentum pan, wheel zoom anchored at the
// cursor, two-finger pinch, keyboard, and animated goToTime navigation.

import { state, setView, viewBounds, notify, clampView } from './store.js';
import { MIN_TIME, MAX_TIME } from './data.js';

export function timeAtPixel(px, width) {
    const { start } = viewBounds();
    return start + (px / width) * state.span;
}

export class Interaction {
    constructor(canvas, renderer, { onItemClick, onHover, onBackgroundClick }) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.onItemClick = onItemClick;
        this.onHover = onHover;
        this.onBackgroundClick = onBackgroundClick;

        this.pointers = new Map();  // pointerId -> {x, y}
        this.velocity = 0;          // years per frame
        this.momentumFrame = null;
        this.animFrame = null;
        this.moved = false;

        this.bind();
    }

    bind() {
        const c = this.canvas;
        c.addEventListener('pointerdown', e => this.down(e));
        c.addEventListener('pointermove', e => this.move(e));
        c.addEventListener('pointerup', e => this.up(e));
        c.addEventListener('pointercancel', e => this.up(e, true));
        c.addEventListener('wheel', e => this.wheel(e), { passive: false });
        window.addEventListener('keydown', e => this.key(e));
    }

    stopAnimations() {
        cancelAnimationFrame(this.momentumFrame);
        cancelAnimationFrame(this.animFrame);
        this.momentumFrame = this.animFrame = null;
    }

    down(e) {
        this.canvas.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.stopAnimations();
        this.velocity = 0;
        this.moved = false;
        this.downX = e.clientX;
        this.downY = e.clientY;
        this.lastX = e.clientX;
        this.lastT = performance.now();
        if (this.pointers.size === 2) {
            const [a, b] = [...this.pointers.values()];
            this.pinchStart = {
                dist: Math.abs(a.x - b.x),
                span: state.span,
                centerT: timeAtPixel(((a.x + b.x) / 2) - this.canvas.getBoundingClientRect().left, this.renderer.w)
            };
        }
    }

    move(e) {
        if (!this.pointers.has(e.pointerId)) {
            // plain hover
            const rect = this.canvas.getBoundingClientRect();
            const hit = this.renderer.hitTest(e.clientX - rect.left, e.clientY - rect.top);
            this.onHover(hit?.item ?? null);
            this.canvas.style.cursor = hit ? 'pointer' : 'grab';
            return;
        }
        const p = this.pointers.get(e.pointerId);
        p.x = e.clientX;
        p.y = e.clientY;

        if (this.pointers.size === 2 && this.pinchStart) {
            const [a, b] = [...this.pointers.values()];
            const dist = Math.max(20, Math.abs(a.x - b.x));
            const rect = this.canvas.getBoundingClientRect();
            const midPx = ((a.x + b.x) / 2) - rect.left;
            const span = this.pinchStart.span * (this.pinchStart.dist / dist);
            // keep the time under the pinch midpoint fixed
            const center = this.pinchStart.centerT + span * (0.5 - midPx / this.renderer.w);
            setView(center, span);
            this.moved = true;
            return;
        }

        if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 4) this.moved = true;
        const dx = e.clientX - this.lastX;
        if (dx !== 0) {
            const yearsPerPx = state.span / this.renderer.w;
            const now = performance.now();
            const dt = Math.max(1, now - this.lastT);
            this.velocity = (-dx * yearsPerPx) / dt * 16;
            this.lastX = e.clientX;
            this.lastT = now;
            setView(state.center - dx * yearsPerPx, state.span);
        }
    }

    up(e, cancelled = false) {
        this.pointers.delete(e.pointerId);
        this.pinchStart = null;
        if (this.pointers.size > 0) return;

        if (!this.moved && !cancelled) {
            const rect = this.canvas.getBoundingClientRect();
            const hit = this.renderer.hitTest(e.clientX - rect.left, e.clientY - rect.top);
            if (hit) this.onItemClick(hit.item, hit.type);
            else this.onBackgroundClick();
            return;
        }
        if (Math.abs(this.velocity) > state.span / this.renderer.w * 0.5) this.momentum();
    }

    momentum() {
        const friction = 0.93;
        const step = () => {
            this.velocity *= friction;
            if (Math.abs(this.velocity) < state.span / this.renderer.w * 0.3) return;
            setView(state.center + this.velocity, state.span);
            this.momentumFrame = requestAnimationFrame(step);
        };
        this.momentumFrame = requestAnimationFrame(step);
    }

    wheel(e) {
        e.preventDefault();
        this.stopAnimations();
        const rect = this.canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;

        if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
            // zoom, anchored at the cursor
            const anchor = timeAtPixel(px, this.renderer.w);
            const factor = Math.exp(e.deltaY * 0.0018);
            const span = state.span * factor;
            const center = anchor + span * (0.5 - px / this.renderer.w);
            setView(center, span);
        } else {
            // horizontal scroll pans
            setView(state.center + e.deltaX * (state.span / this.renderer.w) * 1.5, state.span);
        }
    }

    key(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        switch (e.key) {
            case '+': case '=': this.zoomBy(1 / 1.5); break;
            case '-': this.zoomBy(1.5); break;
            case 'ArrowLeft': setView(state.center - state.span * 0.12, state.span); break;
            case 'ArrowRight': setView(state.center + state.span * 0.12, state.span); break;
            case 'Home': this.goTo((MIN_TIME + MAX_TIME) / 2, MAX_TIME - MIN_TIME); break;
            default: return;
        }
        e.preventDefault();
    }

    zoomBy(factor) {
        this.goTo(state.center, state.span * factor, 220);
    }

    // Animate center + span (span interpolated in log space so cosmic→fine
    // jumps feel uniform) to the target.
    goTo(targetCenter, targetSpan = state.span, duration = 650) {
        this.stopAnimations();
        const c0 = state.center;
        const s0 = Math.log(state.span);
        const s1 = Math.log(targetSpan);
        const t0 = performance.now();

        const step = (now) => {
            const p = Math.min(1, (now - t0) / duration);
            const ease = 1 - Math.pow(1 - p, 3);
            state.span = Math.exp(s0 + (s1 - s0) * ease);
            state.center = c0 + (targetCenter - c0) * ease;
            clampView();
            notify();
            if (p < 1) this.animFrame = requestAnimationFrame(step);
        };
        this.animFrame = requestAnimationFrame(step);
    }
}
