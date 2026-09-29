export type ContactEvent = 'phone_reveal' | 'viber_click' | 'whatsapp_click' | 'email_click';

/**
 * Tells the server a visitor used one of a producer's contact options, for
 * the producer's statistics.
 *
 * A beacon rather than a request: it is fire-and-forget, costs the page
 * nothing, and still goes out when the click leaves the page - opening
 * Viber or the mail app is exactly that.
 */
export function trackContact(producerId: number, event: ContactEvent): void {
    try {
        navigator.sendBeacon(route('statistics.click', [producerId, event]));
    } catch {
        // A counter is never worth breaking the click it counts.
    }
}

/**
 * A Serbian mobile number in the international form Viber and WhatsApp
 * links need (3816...), or null when the number is not a mobile one - a
 * landline has neither app behind it.
 */
export function mobileNumberForApps(phone: string): string | null {
    let digits = phone.replace(/\D/g, '');

    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
        digits = `381${digits.slice(1)}`;
    }

    return /^3816\d{7,8}$/.test(digits) ? digits : null;
}
