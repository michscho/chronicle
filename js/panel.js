// Chronicle — info panel for events and epochs.

import { catName, catColor, MAX_TIME } from './data.js';
import { state, notify } from './store.js';
import { formatTime, formatTimeLong } from './time.js';

const panel = () => document.getElementById('infoPanel');

export function showPanel(item, type) {
    const set = (id, text) => { document.getElementById(id).textContent = text; };
    const catEl = document.getElementById('infoCategory');
    const aiBadge = document.getElementById('infoAiBadge');

    if (type === 'epoch') {
        set('infoTime', `${formatTime(item.start)} – ${formatTime(Math.min(item.end, MAX_TIME))}`);
        catEl.textContent = 'Epoche';
        catEl.style.background = item.color;
        aiBadge.hidden = true;
        set('infoTitle', item.title);
        set('infoSubtitle', '');
        set('infoDescription', item.desc || '');
    } else {
        set('infoTime', formatTimeLong(item.time));
        catEl.textContent = catName(item.cat);
        catEl.style.background = catColor(item.cat);
        aiBadge.hidden = !item.aiGenerated;
        set('infoTitle', item.title);
        set('infoSubtitle', item.subtitle || '');
        set('infoDescription', item.desc || '');
        state.highlightedEventId = item.id;
        notify();
    }
    panel().classList.add('visible');
}

export function hidePanel() {
    panel().classList.remove('visible');
    if (state.highlightedEventId !== null) {
        state.highlightedEventId = null;
        notify();
    }
}
