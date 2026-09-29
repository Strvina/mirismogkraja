/**
 * The site's words in the reader's language.
 *
 * Serbian is the source: the code is written in Serbian, and t() looks each
 * sentence up in lang/en.json or lang/ru.json - the same files Laravel's
 * __() reads, so server and client share one dictionary. A sentence with no
 * translation is shown in Serbian rather than as a key, so a missing entry
 * degrades to the original instead of to nonsense.
 *
 * Only the chosen language's dictionary is downloaded, as a separate file
 * the browser caches; a Serbian page downloads none.
 */

type Dictionary = Record<string, string>;

const dictionaries = import.meta.glob<{ default: Dictionary }>('../../../lang/{en,ru}.json');

export const LOCALES = [
    { code: 'sr', label: 'Srpski', short: 'SR' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'ru', label: 'Русский', short: 'RU' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];

/** Browser locale tags for dates and numbers, per site language. */
const INTL: Record<Locale, string> = { sr: 'sr-Latn-RS', en: 'en-GB', ru: 'ru-RU' };

let current: Locale = 'sr';
let dictionary: Dictionary = {};

/** Load the words for a language; called once, before the first render. */
export async function loadLocale(locale: string): Promise<void> {
    current = (LOCALES.some((item) => item.code === locale) ? locale : 'sr') as Locale;

    const load = dictionaries[`../../../lang/${current}.json`];
    dictionary = load ? (await load()).default : {};
}

/**
 * A sentence in the current language. :name placeholders are filled from
 * params, longest name first so ":count" never eats ":countries".
 */
export function t(text: string, params?: Record<string, string | number | null>): string {
    let result = dictionary[text] ?? text;

    if (params) {
        for (const name of Object.keys(params).sort((a, b) => b.length - a.length)) {
            result = result.replaceAll(`:${name}`, String(params[name] ?? ''));
        }
    }

    return result;
}

/**
 * Marks a sentence for translation without translating it - for words
 * defined when a module loads, before the dictionary has arrived (labels in
 * a tab list, breadcrumb titles). Whatever shows them passes them through
 * t() when it renders. The key check finds sentences by t( and tx( alike.
 */
export function tx(text: string): string {
    return text;
}

export function currentLocale(): Locale {
    return current;
}

/** What to pass to toLocaleDateString / Intl for the current language. */
export function intlLocale(): string {
    return INTL[current];
}
