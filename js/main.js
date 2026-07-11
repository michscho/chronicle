// Chronicle — entry point: wiring between store, renderer, minimap and UI.

import { state, subscribe, notify, rebuildEvents, toggleCategory, readHash, scheduleHashUpdate } from './store.js';
import { formatTime, formatSpan, spanName } from './time.js';
import { TimelineRenderer } from './renderer.js';
import { Minimap } from './minimap.js';
import { Interaction } from './interaction.js';
import { showPanel, hidePanel } from './panel.js';
import { initSearch, openSearch, closeSearch, isSearchOpen, targetSpanFor } from './search.js';
import { initSettings } from './settings.js';
import { initAi } from './ai.js';
import { initQuiz, closeQuiz } from './quiz.js';
import { closeModal } from './ui.js';

rebuildEvents();
readHash();

const canvas = document.getElementById('timelineCanvas');
const renderer = new TimelineRenderer(canvas);
const minimap = new Minimap(document.getElementById('minimapCanvas'));

const interaction = new Interaction(canvas, renderer, {
    onItemClick: (item, type) => showPanel(item, type),
    onBackgroundClick: () => hidePanel(),
    onHover: (item) => {
        if (item !== renderer.hoverItem) {
            renderer.hoverItem = item;
            requestRender();
        }
    }
});

const goTo = (time, span) => interaction.goTo(time, span);

// --- render loop: draw at most once per frame, only when something changed ---
let renderQueued = false;
function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderer.render();
        minimap.render();
        updateHeader();
    });
}

subscribe(() => {
    requestRender();
    scheduleHashUpdate();
});

function updateHeader() {
    document.getElementById('currentTime').textContent = formatTime(state.center);
    document.getElementById('zoomInfo').textContent = `${spanName(state.span)} · ${formatSpan(state.span)} sichtbar`;
}

// --- static UI wiring ---
document.getElementById('zoomIn').addEventListener('click', () => interaction.zoomBy(1 / 1.6));
document.getElementById('zoomOut').addEventListener('click', () => interaction.zoomBy(1.6));
document.getElementById('closeInfo').addEventListener('click', hidePanel);

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () =>
        goTo(+btn.dataset.goto, btn.dataset.span ? +btn.dataset.span : targetSpanFor(+btn.dataset.goto)));
});

document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        toggleCategory(btn.dataset.category);
        btn.classList.toggle('active', state.activeCats.has(btn.dataset.category));
    });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeSearch();
        closeModal('settingsModal');
        closeModal('aiModal');
        closeQuiz();
        hidePanel();
        return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if ((e.key === '/' || e.key === 'f') && !e.metaKey && !e.ctrlKey && !isSearchOpen()) {
        e.preventDefault();
        openSearch();
    }
});

window.addEventListener('resize', () => {
    renderer.resize();
    minimap.resize();
    requestRender();
});

initSearch(goTo);
initSettings();
initAi(goTo);
initQuiz();

notify();
document.getElementById('loading').classList.add('hidden');
