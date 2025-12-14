export class KeyHitAnimator {
    constructor() {
        this.pausedHitAnimations = [];
        this.hitQueue = [];
    }
    
    startKeyHitAnimation(note) {
        this.hitQueue.push(note);
    }

    processHitQueue() {
        if (this.hitQueue.length === 0) return;
        
        const updates = [];
        const notesToProcess = [...this.hitQueue];
        this.hitQueue = []; // Clear queue

        notesToProcess.forEach(note => {
            const keyElement = document.querySelector(`[data-note="${note.name}"]`);
            if (!keyElement) return;
            
            keyElement.dataset.hitDuration = note.duration;
            
            const gradient = note.isBlack
                ? 'linear-gradient(to bottom, #ff6b6b, #ee5a52)'
                : 'linear-gradient(to bottom, #4ecdc4, #44a08d)';
            
            keyElement.style.backgroundImage = gradient;
            keyElement.style.backgroundRepeat = 'no-repeat';
            keyElement.style.backgroundPosition = 'top center';
            
            // Disable transition explicitly to ensure the reset to 0% is instantaneous
            keyElement.style.transition = 'none';
            keyElement.style.backgroundSize = '100% 0%';
            
            updates.push({ element: keyElement, duration: note.duration });
        });

        if (updates.length === 0) return;
        
        // Force reflow ONCE for all elements to commit the 0% size
        void updates[0].element.offsetWidth;
        
        // Start the fill animations
        updates.forEach(({ element, duration }) => {
            element.style.transition = `background-size ${duration}s linear`;
            element.style.backgroundSize = '100% 100%';
        });
    }
    
    pauseCSSHitAnimations() {
        this.pausedHitAnimations = [];
        document.querySelectorAll('.piano-key').forEach(keyEl => {
            const transition = keyEl.style.transition;
            if (transition && transition.includes('background-size')) {
                const computedBS = getComputedStyle(keyEl).backgroundSize;
                const parts = computedBS.split(' ');
                if (parts.length >= 2) {
                    let percent = 0;
                    const heightPart = parts[1];
                    if (heightPart.endsWith('%')) {
                        percent = parseFloat(heightPart);
                    }
                    const duration = keyEl.dataset.hitDuration
                        ? parseFloat(keyEl.dataset.hitDuration)
                        : (() => {
                            const m = transition.match(/background-size\s+([\d.]+)s/);
                            return m ? parseFloat(m[1]) : 0;
                        })();
                    
                    keyEl.style.transition = 'none';
                    keyEl.style.backgroundSize = `100% ${percent}%`;
                    
                    if (percent > 0 && percent < 100 && duration > 0 && keyEl.dataset.note) {
                        this.pausedHitAnimations.push({
                            noteName: keyEl.dataset.note,
                            remainingTime: duration * (1 - percent / 100),
                        });
                    }
                }
            }
        });
    }
    
    resumeCSSHitAnimations() {
        if (!this.pausedHitAnimations || this.pausedHitAnimations.length === 0) return;
        this.pausedHitAnimations.forEach(({ noteName, remainingTime }) => {
            const keyEl = document.querySelector(`[data-note="${noteName}"]`);
            if (keyEl) {
                keyEl.style.transition = `background-size ${remainingTime}s linear`;
                void keyEl.offsetWidth;
                keyEl.style.backgroundSize = '100% 100%';
            }
        });
        this.pausedHitAnimations = [];
    }
}