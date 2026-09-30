/**
 * "Are you sure?" in the site's own dialog instead of the browser's
 * confirm() box, which cannot be styled and reads "localhost says…".
 *
 *     if (await ask({ title, description, tone: 'danger' })) { … }
 *
 * One question at a time, shown by <ConfirmHost /> mounted once next to the
 * app; the promise settles with the answer.
 */
export interface ConfirmOptions {
    title: string;
    /** What happens if they say yes. */
    description?: string;
    /** The yes button; "Obriši" for danger, "Potvrdi" otherwise. */
    confirmLabel?: string;
    /** Danger is for what cannot be undone: a red button and a warning icon. */
    tone?: 'danger' | 'default';
}

export interface PendingConfirm extends ConfirmOptions {
    resolve: (answer: boolean) => void;
}

let pending: PendingConfirm | null = null;
const listeners = new Set<() => void>();

function publish(next: PendingConfirm | null): void {
    pending = next;
    listeners.forEach((listener) => listener());
}

export function ask(options: ConfirmOptions): Promise<boolean> {
    // A question still open is answered "no" rather than left hanging.
    pending?.resolve(false);

    return new Promise((resolve) => publish({ ...options, resolve }));
}

/** Called by the host with the answer; closes the dialog. */
export function answer(value: boolean): void {
    pending?.resolve(value);
    publish(null);
}

export function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function current(): PendingConfirm | null {
    return pending;
}
