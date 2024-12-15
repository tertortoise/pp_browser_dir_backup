interface QueueWrapper<T> {
    queueItem: T;
    next: QueueWrapper<T> | null;
}

export class ItemsQueue<T> {
    #head: QueueWrapper<T> | null = null;
    #tail: QueueWrapper<T> | null = null;

    get head() { return this.#head?.queueItem };
    get tail() { return this.#tail?.queueItem };

    enqueue(itemsToAdd: T): void;
    enqueue(itemsToAdd: T[]): void;
    enqueue(itemsToAdd: T | T[]): void {

        if (Array.isArray(itemsToAdd)) {
            itemsToAdd.forEach(item => this.#addItemToQueue(item));
        } else {
            this.#addItemToQueue(itemsToAdd);
        }

    };

    dequeue(): T | null {
        if (!this.#head) {
            return null;
        }

        const dequeueItem = this.#head.queueItem;
        this.#head = this.#head.next;

        if (dequeueItem === this.#tail?.queueItem) {
            this.#tail = null;
        }

        return dequeueItem;
    };

    #addItemToQueue(item: T) {

        const newQueueWrapper: QueueWrapper<T> = {
            queueItem: item,
            next: null,
        };

        if (!this.#head && !this.#tail) {

            this.#head = newQueueWrapper;
            this.#tail = newQueueWrapper;
        } else if (this.#head && this.#tail) {

            this.#tail.next = newQueueWrapper;
            this.#tail = newQueueWrapper;
        }
    };
};