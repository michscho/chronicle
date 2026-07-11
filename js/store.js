// Chronicle — central state: view (center/span), filters, events, persistence.

import { baseEvents, categories, MIN_TIME, MAX_TIME } from './data.js';

const MIN_SPAN = 24;                       // years visible at max zoom
const MAX_SPAN = (MAX_TIME - MIN_TIME) * 1.05;

const listeners = new Set();

export const state = {
    center: 1900,
    span: 400,                             // total visible years
    activeCats: new Set(['epoche', ...Object.keys(categories)]),
    highlightedEventId: null,
    apiKey: localStorage.getItem('openai_api_key') || '',
    aiEvents: loadAiEvents(),
    events: [],                            // baseEvents + aiEvents, sorted by time
    nextEventId: 1000
};

function loadAiEvents() {
    try {
        const arr = JSON.parse(localStorage.getItem('ai_events') || '[]');
        return Array.isArray(arr) ? arr.filter(e => typeof e.time === 'number' && e.title) : [];
    } catch {
        return [];
    }
}

export function rebuildEvents() {
    state.events = [...baseEvents, ...state.aiEvents].sort((a, b) => a.time - b.time);
    state.nextEventId = Math.max(999, ...state.events.map(e => e.id || 0)) + 1;
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function notify() {
    for (const fn of listeners) fn(state);
}

export function clampView() {
    state.span = Math.min(MAX_SPAN, Math.max(MIN_SPAN, state.span));
    const half = state.span / 2;
    state.center = Math.min(MAX_TIME - half, Math.max(MIN_TIME + half, state.center));
    // If the span exceeds the full range the two clamps above fight; recenter.
    if (state.span >= MAX_TIME - MIN_TIME) state.center = (MIN_TIME + MAX_TIME) / 2;
}

export function setView(center, span) {
    state.center = center;
    if (span !== undefined) state.span = span;
    clampView();
    notify();
}

export function viewBounds() {
    return { start: state.center - state.span / 2, end: state.center + state.span / 2 };
}

export function toggleCategory(cat) {
    if (state.activeCats.has(cat)) state.activeCats.delete(cat);
    else state.activeCats.add(cat);
    notify();
}

export function setApiKey(key) {
    state.apiKey = key;
    if (key) localStorage.setItem('openai_api_key', key);
    else localStorage.removeItem('openai_api_key');
}

export function addAiEvents(evts) {
    const added = evts.map(ev => ({ ...ev, id: state.nextEventId++, aiGenerated: true }));
    state.aiEvents.push(...added);
    localStorage.setItem('ai_events', JSON.stringify(state.aiEvents));
    rebuildEvents();
    notify();
    return added;
}

export function clearAiEvents() {
    state.aiEvents = [];
    localStorage.setItem('ai_events', '[]');
    rebuildEvents();
    notify();
}

// --- Shareable URL hash (#t=<center>&s=<span>) ---

export function readHash() {
    const m = new URLSearchParams(location.hash.slice(1));
    const t = parseFloat(m.get('t'));
    const s = parseFloat(m.get('s'));
    if (Number.isFinite(t) && Number.isFinite(s)) {
        state.center = t;
        state.span = s;
        clampView();
        return true;
    }
    return false;
}

let hashTimer = null;
export function scheduleHashUpdate() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
        const t = Math.round(state.center * 100) / 100;
        const s = Math.round(state.span * 100) / 100;
        history.replaceState(null, '', `#t=${t}&s=${s}`);
    }, 400);
}
