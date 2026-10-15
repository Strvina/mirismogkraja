import { type KeyboardEvent } from 'react';

/**
 * Enter sends what was written to someone, Shift+Enter starts a new line:
 * for the boxes that hold a message or a comment, not the long texts (a
 * description, a story), where Enter is a new paragraph.
 *
 * On a phone or a tablet Enter stays a new line, as in the messaging apps
 * people use there: the on-screen keyboard has no Shift+Enter, and the
 * send button is right beside the box. Nor while an input method is still
 * composing a character, where Enter picks it.
 *
 * Without `send`, the box's own form is submitted, through its handler.
 */
export function sendOnEnter(send?: () => void) {
    return (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || window.matchMedia('(pointer: coarse)').matches) {
            return;
        }

        event.preventDefault();

        if (send) {
            send();
        } else {
            event.currentTarget.form?.requestSubmit();
        }
    };
}
