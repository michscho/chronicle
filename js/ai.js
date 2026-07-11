// Chronicle — AI event generator (OpenAI chat completions, JSON mode).

import { categories, catName, MIN_TIME, MAX_TIME } from './data.js';
import { state, addAiEvents } from './store.js';
import { formatTime } from './time.js';
import { escapeHtml, showToast, openModal, closeModal } from './ui.js';
import { openSettings, updateStats } from './settings.js';
import { targetSpanFor } from './search.js';

let goTo = null;

const body = () => document.getElementById('aiModalBody');

export function initAi(goToFn) {
    goTo = goToFn;
    document.getElementById('aiBtn').addEventListener('click', openAiModal);
    document.getElementById('closeAi').addEventListener('click', () => closeModal('aiModal'));
}

function openAiModal() {
    if (!state.apiKey) {
        showToast('Bitte zuerst API-Key in den Einstellungen hinzufügen', 'error');
        openSettings();
        return;
    }
    renderForm();
    openModal('aiModal');
}

const SUGGESTIONS = [
    ['Erfindungen 20. Jh.', 'Die wichtigsten Erfindungen des 20. Jahrhunderts'],
    ['Wissenschaftlerinnen', 'Berühmte Wissenschaftlerinnen der Geschichte'],
    ['Raumfahrt', 'Die Geschichte der Raumfahrt'],
    ['Kunstbewegungen', 'Wichtige Kunstbewegungen'],
    ['Internet', 'Die Geschichte des Internets']
];

function renderForm() {
    body().innerHTML = `
        <div class="form-group">
            <label class="form-label">Beschreibe, was du hinzufügen möchtest</label>
            <textarea class="form-textarea" id="aiPrompt" placeholder="z.B. 'Die Erfindung des Telefons' oder 'Leben von Marie Curie'"></textarea>
        </div>
        <div class="ai-suggestions">
            ${SUGGESTIONS.map(([label, prompt]) =>
                `<button class="ai-suggestion" data-prompt="${escapeHtml(prompt)}">${escapeHtml(label)}</button>`).join('')}
        </div>
        <div class="form-group">
            <label class="form-label">Anzahl Ereignisse</label>
            <select class="form-select" id="aiCount">
                <option value="1">1 Ereignis</option>
                <option value="3" selected>3 Ereignisse</option>
                <option value="5">5 Ereignisse</option>
                <option value="10">10 Ereignisse</option>
            </select>
        </div>
        <button class="btn btn-primary btn-full" id="generateAi">✨ Mit KI generieren</button>
        <p class="form-hint centered">Verwendet OpenAI gpt-4o-mini. Der Key bleibt lokal.</p>`;

    body().querySelector('#generateAi').addEventListener('click', generate);
    body().querySelectorAll('.ai-suggestion').forEach(btn =>
        btn.addEventListener('click', () => { body().querySelector('#aiPrompt').value = btn.dataset.prompt; }));
}

async function generate() {
    const prompt = body().querySelector('#aiPrompt').value.trim();
    const count = body().querySelector('#aiCount').value;
    if (!prompt) {
        showToast('Bitte Beschreibung eingeben', 'error');
        return;
    }

    body().innerHTML = `
        <div class="ai-loading">
            <div class="spinner"></div>
            <div class="ai-loading-text">Generiere ${escapeHtml(count)} Ereignis(se)…</div>
        </div>`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [{
                    role: 'system',
                    content: 'Du bist ein Historiker, der präzise historische Ereignisse als JSON liefert.'
                }, {
                    role: 'user',
                    content: `Erstelle ${count} historische(s) Ereignis(se) zum Thema: "${prompt}".

Antworte als JSON-Objekt: {"events": [...]} — jedes Ereignis:
{
  "time": <Jahr als Zahl, negativ für v. Chr.>,
  "title": "<Kurzer Titel, max 30 Zeichen>",
  "subtitle": "<Untertitel, max 25 Zeichen>",
  "desc": "<Beschreibung, 50-150 Zeichen>",
  "cat": "<ereignis|wissenschaft|kultur|politik|person>",
  "imp": <1=sehr wichtig, 2=wichtig, 3=interessant>
}`
                }],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) throw new Error(`API-Fehler ${response.status}`);
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        const raw = Array.isArray(parsed) ? parsed : parsed.events;
        if (!Array.isArray(raw)) throw new Error('Unerwartetes Antwortformat');

        const valid = raw
            .filter(ev => Number.isFinite(ev.time) && typeof ev.title === 'string' && ev.title)
            .map(ev => ({
                time: Math.min(MAX_TIME, Math.max(MIN_TIME, ev.time)),
                title: String(ev.title).slice(0, 60),
                subtitle: String(ev.subtitle || '').slice(0, 60),
                desc: String(ev.desc || '').slice(0, 400),
                cat: categories[ev.cat] ? ev.cat : 'ereignis',
                imp: [1, 2, 3].includes(ev.imp) ? ev.imp : 2
            }));
        if (valid.length === 0) throw new Error('Keine gültigen Ereignisse erhalten');

        const added = addAiEvents(valid);
        updateStats();
        renderResults(added);
        showToast(`${added.length} Ereignis(se) hinzugefügt`);
    } catch (err) {
        console.error('AI Error:', err);
        body().innerHTML = `
            <div class="ai-error">
                <div class="ai-error-icon">⚠️</div>
                <div class="ai-error-text">Fehler: ${escapeHtml(err.message)}</div>
                <button class="btn btn-secondary" id="aiRetry">Erneut versuchen</button>
            </div>`;
        body().querySelector('#aiRetry').addEventListener('click', renderForm);
        showToast('Generierung fehlgeschlagen', 'error');
    }
}

function renderResults(added) {
    body().innerHTML = `
        <div class="ai-success">
            <div class="ai-success-icon">✨</div>
            <div class="ai-success-title">${added.length} Ereignis(se) hinzugefügt!</div>
        </div>
        ${added.map(ev => `
            <div class="ai-result">
                <div class="ai-result-title">${escapeHtml(ev.title)}</div>
                <div class="ai-result-meta">${escapeHtml(formatTime(ev.time))} • ${escapeHtml(catName(ev.cat))}</div>
                <div class="ai-result-desc">${escapeHtml(ev.desc)}</div>
            </div>`).join('')}
        <button class="btn btn-primary btn-full" id="aiGoto">Zum ersten Ereignis</button>
        <button class="btn btn-secondary btn-full" id="aiMore">Weitere generieren</button>`;

    body().querySelector('#aiGoto').addEventListener('click', () => {
        closeModal('aiModal');
        state.highlightedEventId = added[0].id;
        goTo(added[0].time, targetSpanFor(added[0].time));
    });
    body().querySelector('#aiMore').addEventListener('click', renderForm);
}
