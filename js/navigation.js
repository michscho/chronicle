// Chronicle — navigation: zoom, drag/pan, momentum, and goToTime animation.

        // ============================================
        // NAVIGATION
        // ============================================
        function zoomIn() {
            if (zoomIndex < zoomLevels.length - 1) {
                zoomIndex++;
                update();
            }
        }

        function zoomOut() {
            if (zoomIndex > 0) {
                zoomIndex--;
                update();
            }
        }

        function goToTime(t) {
            const startTime = centerTime;
            const duration = 500;
            const startTs = performance.now();

            const targetTime = Math.min(t, MAX_TIME);

            if (Math.abs(targetTime) > 1e8) zoomIndex = Math.min(2, zoomIndex);
            else if (Math.abs(targetTime) > 1e6) zoomIndex = Math.max(3, Math.min(4, zoomIndex));
            else if (Math.abs(targetTime) > 5000) zoomIndex = Math.max(5, Math.min(6, zoomIndex));
            else zoomIndex = Math.max(7, zoomIndex);

            function animate(ts) {
                const elapsed = ts - startTs;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                centerTime = startTime + (targetTime - startTime) * eased;
                update();
                if (progress < 1) requestAnimationFrame(animate);
            }
            requestAnimationFrame(animate);
        }

        // ============================================
        // DRAG
        // ============================================
        function startDrag(x) {
            isDragging = true;
            dragStartX = x;
            dragStartTime = centerTime;
            lastDragX = x;
            lastDragTime = performance.now();
            velocity = 0;
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
        }

        function doDrag(x) {
            if (!isDragging) return;

            const z = zoomLevels[zoomIndex];
            const viewportWidth = viewport.offsetWidth;
            const timePerPixel = (z.halfRange * 2) / viewportWidth;
            const deltaX = dragStartX - x;
            centerTime = dragStartTime + deltaX * timePerPixel;

            const now = performance.now();
            const dt = now - lastDragTime;
            if (dt > 0) {
                velocity = (lastDragX - x) * timePerPixel / dt * 16;
            }
            lastDragX = x;
            lastDragTime = now;
            update();
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            if (Math.abs(velocity) > 0.5) {
                applyMomentum();
            }
        }

        function applyMomentum() {
            const friction = 0.92;
            function animate() {
                if (Math.abs(velocity) < 0.5 || isDragging) {
                    animationFrame = null;
                    return;
                }
                centerTime += velocity;
                velocity *= friction;
                update();
                animationFrame = requestAnimationFrame(animate);
            }
            animationFrame = requestAnimationFrame(animate);
        }

