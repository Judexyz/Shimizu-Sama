import { LoopMode } from '../../types/music.js';
export class QueueManager {
    queue = [];
    history = [];
    current = null;
    loopMode = LoopMode.NONE;
    add(track) {
        this.queue.push(track);
    }
    addMany(tracks) {
        this.queue.push(...tracks);
    }
    getNext(isFailed = false) {
        if (this.current) {
            if (!isFailed) {
                if (this.loopMode === LoopMode.TRACK) {
                    return this.current;
                }
                this.history.push(this.current);
                if (this.history.length > 20) {
                    this.history.shift();
                }
                if (this.loopMode === LoopMode.QUEUE) {
                    this.queue.push(this.current);
                }
            }
        }
        this.current = this.queue.shift() || null;
        return this.current;
    }
    shuffle() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }
    clear() {
        this.queue = [];
    }
    get length() {
        return this.queue.length;
    }
    get tracks() {
        return [...this.queue];
    }
    remove(index) {
        if (index < 0 || index >= this.queue.length)
            return null;
        return this.queue.splice(index, 1)[0];
    }
    reset() {
        this.queue = [];
        this.history = [];
        this.current = null;
        this.loopMode = LoopMode.NONE;
    }
}
