import { currentLocale, intlLocale, loadLocale, LOCALES, t, tx } from '@/lib/i18n';
import { describe, expect, it } from 'vitest';

type Dictionary = Record<string, string>;

// The dictionaries themselves, read the way the application reads them, so
// the tests follow whatever the translators wrote.
const files = import.meta.glob<{ default: Dictionary }>('../../../../lang/{en,ru}.json', { eager: true });
const english = files['../../../../lang/en.json'].default;
const russian = files['../../../../lang/ru.json'].default;

/** A sentence that exists in the dictionary and reads differently there. */
const translated = (dictionary: Dictionary, key: string) => {
    expect(dictionary[key], `"${key}" is expected to be in the dictionary`).toBeTruthy();
    expect(dictionary[key]).not.toBe(key);

    return dictionary[key];
};

describe('t', () => {
    it('shows Serbian as written: Serbian is the source, with no dictionary', () => {
        const sentence = 'Proizvodi';

        expect(currentLocale()).toBe('sr');
        expect(t(sentence)).toBe(sentence);
    });

    it('looks a sentence up in the chosen language', async () => {
        const sentence = 'Proizvodi';

        await loadLocale('en');
        expect(t(sentence)).toBe(translated(english, sentence));

        await loadLocale('ru');
        expect(t(sentence)).toBe(translated(russian, sentence));
    });

    it('falls back to the Serbian sentence when a translation is missing', async () => {
        const untranslated = 'Rečenica koje nema ni u jednom rečniku';

        await loadLocale('en');

        expect(t(untranslated)).toBe(untranslated);
    });

    it('fills :name placeholders, in Serbian and in a translation', async () => {
        const sentence = 'Odgovora: :count';

        expect(t(sentence, { count: 3 })).toBe('Odgovora: 3');

        await loadLocale('en');
        expect(t(sentence, { count: 3 })).toBe(translated(english, sentence).replace(':count', '3'));
    });

    it('fills the longest name first, so :count never eats the start of :countries', () => {
        const sentence = ':count od :countries';

        expect(t(sentence, { count: 2, countries: 'pet zemalja' })).toBe('2 od pet zemalja');
    });

    it('fills every occurrence of a placeholder', () => {
        const sentence = ':name i opet :name';

        expect(t(sentence, { name: 'Zapis' })).toBe('Zapis i opet Zapis');
    });

    it('writes nothing for a null value, and keeps a zero', () => {
        const sentence = 'Ostalo: :count (:note)';

        expect(t(sentence, { count: 0, note: null })).toBe('Ostalo: 0 ()');
    });

    it('leaves a placeholder nobody filled as it is', () => {
        const sentence = 'Zdravo, :name';

        expect(t(sentence)).toBe('Zdravo, :name');
        expect(t(sentence, {})).toBe('Zdravo, :name');
    });
});

describe('tx', () => {
    it('marks a sentence without translating it, whatever the language', async () => {
        const sentence = 'Proizvodi';

        await loadLocale('en');

        expect(tx(sentence)).toBe(sentence);
        expect(t(tx(sentence))).toBe(translated(english, sentence));
    });
});

describe('loadLocale', () => {
    it.each([
        ['sr', 'sr-Latn-RS'],
        ['en', 'en-GB'],
        ['ru', 'ru-RU'],
    ] as const)('switches to %s and its number and date format', async (locale, intl) => {
        await loadLocale(locale);

        expect(currentLocale()).toBe(locale);
        expect(intlLocale()).toBe(intl);
    });

    it('falls back to Serbian for a language the site does not have', async () => {
        await loadLocale('en');
        await loadLocale('de');

        expect(currentLocale()).toBe('sr');
        expect(t('Proizvodi')).toBe('Proizvodi');
    });

    it('drops the previous dictionary when going back to Serbian', async () => {
        await loadLocale('ru');
        await loadLocale('sr');

        expect(t('Proizvodi')).toBe('Proizvodi');
    });

    it('offers the three languages of the site', () => {
        expect(LOCALES.map((locale) => locale.code)).toEqual(['sr', 'en', 'ru']);
    });
});
