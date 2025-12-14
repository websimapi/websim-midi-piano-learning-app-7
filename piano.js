import * as Tone from 'tonejs';
import { PIANO_CONFIG } from './piano-config.js';
import { PianoRenderer } from './piano-renderer.js';
import { PianoKeyboardHandler } from './piano-keyboard-handler.js';

export class Piano {
    constructor() {
        this.currentOctave = 4;
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
        this.activeKeys = new Map(); // Map stores active note counts for polyphony handling
        this.isRightShiftDown = false;
        this.onPianoRendered = null; // Callback for when piano is rendered

        // Initialize components
        this.renderer = new PianoRenderer(this);
        this.keyboardHandler = new PianoKeyboardHandler(this);
        
        this.initializePiano();
    }

    initializePiano() {
        this.renderer.initializeMainPiano();
        this.renderer.initializeLeftSubKeyboard();
        this.renderer.initializeRightSubKeyboard();

        // After rendering, notify the app if a listener is set up
        if (this.onPianoRendered) {
            this.onPianoRendered();
        }
    }
    
    changeOctave(direction) {
        const newOctave = this.currentOctave + direction;
        if (newOctave >= 1 && newOctave <= 7) {
            this.currentOctave = newOctave;
            this.initializePiano();
            document.getElementById('current-octave').textContent = this.currentOctave;
        }
    }
    
    playNote(note) {
        // Track number of active triggers for this note (overlapping MIDI notes)
        const count = this.activeKeys.get(note) || 0;
        this.activeKeys.set(note, count + 1);

        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
        
        // Re-trigger synth for articulation even if holding (hammer strike)
        // Release first to reset envelope for distinct attack
        this.synth.triggerRelease(note);
        this.synth.triggerAttack(note);
        
        // Visuals only need to be enabled if they weren't already
        if (count === 0) {
            this.highlightKey(note, true);
        }
    }
    
    stopNote(note) {
        const count = this.activeKeys.get(note);
        if (count === undefined) return;
        
        if (count > 1) {
            // If other triggers are still active, just decrement
            this.activeKeys.set(note, count - 1);
        } else {
            // Last trigger released - stop sound and visuals
            this.activeKeys.delete(note);
            this.synth.triggerRelease(note);
            this.highlightKey(note, false);
        }
    }

    stopAll() {
        this.synth.releaseAll();
        for (const note of this.activeKeys.keys()) {
            this.highlightKey(note, false);
        }
        this.activeKeys.clear();
    }
    
    highlightKey(note, active) {
        const keyElement = document.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            if (active) {
                keyElement.classList.add('active');
            } else {
                // Clear any existing fill animation styles before removing 'active'
                // We disable transition momentarily to ensure the removal is instant and doesn't fade out weirdly
                keyElement.style.transition = 'none';
                keyElement.style.backgroundImage = ''; 
                keyElement.style.backgroundSize = ''; 
                keyElement.classList.remove('active');
                
                void keyElement.offsetWidth; // Force reflow to commit the clearing
                
                // Revert to stylesheet transition (all 0.1s ease) for mouse interactions
                keyElement.style.transition = ''; 
            }
        }
    }
    
    playNoteForTime(note, duration) {
        this.playNote(note);
        setTimeout(() => this.stopNote(note), duration * 1000);
    }
}