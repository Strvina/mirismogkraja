import { mobileNumberForApps, trackContact } from '@/lib/statistics';
import { describe, expect, it, vi } from 'vitest';

describe('mobileNumberForApps', () => {
    it.each([
        ['064 123 4567', '381641234567'],
        ['064/123-45-67', '381641234567'],
        ['+381 64 123 4567', '381641234567'],
        ['00381641234567', '381641234567'],
        ['381641234567', '381641234567'],
        ['060 1234567', '381601234567'],
        // Some mobile numbers are a digit shorter.
        ['063 123 456', '38163123456'],
    ])('writes the mobile number %s in the international form', (phone, expected) => {
        expect(mobileNumberForApps(phone)).toBe(expected);
    });

    it.each([
        ['018 123 456', 'a landline in Niš'],
        ['011 1234567', 'a landline in Belgrade'],
        ['+381 18 123 456', 'a landline written internationally'],
        ['064 123', 'too short to be a number'],
        ['064 123 4567 89', 'too long to be a number'],
        ['+49 151 1234567', 'a foreign number'],
        ['', 'nothing'],
        ['nema telefona', 'no digits at all'],
    ])('offers no app for %s (%s)', (phone) => {
        expect(mobileNumberForApps(phone)).toBeNull();
    });
});

describe('trackContact', () => {
    it('sends a beacon naming the producer and what was used', () => {
        const beacon = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);

        trackContact(12, 'viber_click');

        expect(beacon).toHaveBeenCalledExactlyOnceWith(route('statistics.click', [12, 'viber_click']));
    });

    it('never breaks the click it counts', () => {
        vi.spyOn(navigator, 'sendBeacon').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(() => trackContact(12, 'phone_reveal')).not.toThrow();
    });
});
