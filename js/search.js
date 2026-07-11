// Chronicle — search overlay: weighted scoring, keyboard navigation.

import { epochs, catName, epochKindNames, MAX_TIME } from './data.js';
import { state } from './store.js';
import { formatTime } from './time.js';
import { escapeHtml } from './ui.js';
import { showPanel } from './panel.js';

let goTo = null;      // injected from main.js to avoid a module cycle
let results = [];
let selectedIndex = -1;

const container = () => document.getElementById('searchContainer');
const input = () => document.getElementById('searchInput');
const resultsEl = () => document.getElementById('searchResults');

export function initSearch(goToFn) {
    goTo = goToFn;
    document.getElementById('searchBtn').addEventListener('click', openSearch);
    document.getElementById('searchClose').addEventListener('click', closeSearch);
    input().addEventListener('input', e => render(e.target.value));
    input().addEventListener('keydown', onKey);
    resultsEl().addEventListener('click', e => {
        const el = e.target.closest('.search-result');
        if (el) activate(+el.dataset.index);
    });
}

export function openSearch() {
    container().classList.add('active');
    input().focus();
}

export function closeSearch() {
    container().classList.remove('active');
    resultsEl().classList.remove('active');
    input().value = '';
    results = [];
    selectedIndex = -1;
}

export function isSearchOpen() {
    return container().classList.contains('active');
}

function score(ev, q) {
    let s = 0;
    const title = ev.title.toLowerCase();
    if (title.includes(q)) s += 20;
    if (title.startsWith(q)) s += 10;
    if (ev.subtitle?.toLowerCase().includes(q)) s += 10;
    if (ev.desc?.toLowerCase().includes(q)) s += 5;
    if (s > 0) s += (4 - ev.imp) * 2;
    return s;
}

function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
        resultsEl().classList.remove('active');
        results = [];
        return;
    }

    results = [];
    for (const ev of state.events) {
        const s = score(ev, q);
        if (s > 0) results.push({ type: 'event', item: ev, score: s });
    }
    for (const ep of epochs) {
        if (ep.title.toLowerCase().includes(q)) results.push({ type: 'epoch', item: ep, score: 10 });
        else if (ep.desc?.toLowerCase().includes(q)) results.push({ type: 'epoch', item: ep, score: 4 });
    }
    results.sort((a, b) => b.score - a.score);
    results = results.slice(0, 20);
    selectedIndex = results.length ? 0 : -1;

    resultsEl().innerHTML = results.length === 0
        ? '<div class="search-no-results">Keine Ergebnisse gefunden</div>'
        : results.map((r, i) => {
            const item = r.item;
            const time = r.type === 'epoch'
                ? `${formatTime(item.start)} – ${formatTime(Math.min(item.end, MAX_TIME))}`
                : formatTime(item.time);
            const cat = r.type === 'epoch' ? (epochKindNames[item.kind] || 'Epoche') : catName(item.cat);
            return `
                <div class="search-result${i === selectedIndex ? ' selected' : ''}" data-index="${i}">
                    <div class="search-result-title">${escapeHtml(item.title)}${item.aiGenerated ? ' ✨' : ''}</div>
                    <div class="search-result-meta">
                        <span>${escapeHtml(time)}</span>
                        <span class="search-result-cat">${escapeHtml(cat)}</span>
                    </div>
                </div>`;
        }).join('');
    resultsEl().classList.add('active');
}

function onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!results.length) return;
        selectedIndex = (selectedIndex + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        resultsEl().querySelectorAll('.search-result').forEach((el, i) => {
            el.classList.toggle('selected', i === selectedIndex);
            if (i === selectedIndex) el.scrollIntoView({ block: 'nearest' });
        });
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
        activate(selectedIndex);
    }
}

function activate(i) {
    const r = results[i];
    if (!r) return;
    closeSearch();
    if (r.type === 'event') {
        state.highlightedEventId = r.item.id;
        goTo(r.item.time, targetSpanFor(r.item.time));
        setTimeout(() => showPanel(r.item, 'event'), 680);
    } else {
        const end = Math.min(r.item.end, MAX_TIME);
        goTo((r.item.start + end) / 2, Math.max(60, (end - r.item.start) * 1.6));
        setTimeout(() => showPanel(r.item, 'epoch'), 680);
    }
}

// A sensible zoom depth for jumping to a single event.
export function targetSpanFor(time) {
    const abs = Math.abs(time);
    if (abs > 1e8) return abs * 1.2;
    if (abs > 1e6) return 8e6;
    if (abs > 20000) return 120000;
    if (abs > 3000) return 8000;
    return 300;
}
