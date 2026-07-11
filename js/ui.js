// Chronicle — small UI helpers: toasts, HTML escaping, modal plumbing.

export function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

let toastTimer = null;
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = (type === 'success' ? '✓ ' : '⚠ ') + message;
    toast.className = `toast ${type} visible`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}

export function openModal(id) {
    document.getElementById(id).classList.add('active');
}

export function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Fisher–Yates, unbiased (the old sort(() => Math.random()-0.5) was not).
export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
