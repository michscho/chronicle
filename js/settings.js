// Chronicle — settings modal: API key, stats, AI-event cleanup.

import { state, setApiKey, clearAiEvents } from './store.js';
import { showToast, openModal, closeModal } from './ui.js';

export function initSettings() {
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettings').addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('saveApiKey').addEventListener('click', saveKey);
    document.getElementById('clearApiKey').addEventListener('click', clearKey);
    document.getElementById('clearAiEvents').addEventListener('click', () => {
        clearAiEvents();
        updateStats();
        showToast('KI-Ereignisse gelöscht');
    });
    updateKeyStatus();
    updateStats();
}

export function openSettings() {
    document.getElementById('apiKeyInput').value = state.apiKey ? '••••••••••••••••' : '';
    updateStats();
    openModal('settingsModal');
}

function saveKey() {
    const val = document.getElementById('apiKeyInput').value.trim();
    if (val && !val.startsWith('••')) {
        setApiKey(val);
        updateKeyStatus();
        showToast('API-Key gespeichert');
    }
}

function clearKey() {
    setApiKey('');
    document.getElementById('apiKeyInput').value = '';
    updateKeyStatus();
    showToast('API-Key gelöscht');
}

function updateKeyStatus() {
    const has = !!state.apiKey;
    document.getElementById('statusDot').className = `status-dot ${has ? 'connected' : 'disconnected'}`;
    document.getElementById('apiKeyText').textContent = has ? 'API-Key konfiguriert' : 'Kein API-Key konfiguriert';
    document.getElementById('apiKeyStatus').className = `api-key-status ${has ? 'connected' : 'disconnected'}`;
}

export function updateStats() {
    document.getElementById('eventCount').textContent = state.events.length;
    document.getElementById('aiEventCount').textContent = state.aiEvents.length;
}
