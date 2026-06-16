// Chronicle — small UI helpers (toast notifications).

        // ============================================
        // TOAST
        // ============================================
        function showToast(message, type = 'success') {
            toast.textContent = (type === 'success' ? '✓ ' : '⚠ ') + message;
            toast.className = `toast ${type} visible`;
            setTimeout(() => toast.classList.remove('visible'), 3000);
        }

