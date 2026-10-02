import { intlLocale } from '@/lib/i18n';

/** Month numbers 1-12. A range may wrap the new year (11 → 2). */
export interface Season {
    season_from?: number | null;
    season_to?: number | null;
}

export function hasSeason(season: Season): season is { season_from: number; season_to: number } {
    return season.season_from != null && season.season_to != null;
}

/** Whether a month (default: this one) falls in the season. All year when none is set. */
export function isInSeason(season: Season, month = new Date().getMonth() + 1): boolean {
    if (!hasSeason(season)) {
        return true;
    }

    const { season_from: from, season_to: to } = season;

    return from <= to ? month >= from && month <= to : month >= from || month <= to;
}

/** A month's short name in the page's language: "jul", "июль", "Jul". */
export function monthName(month: number, style: 'short' | 'long' = 'short'): string {
    return new Intl.DateTimeFormat(intlLocale(), { month: style }).format(new Date(2000, month - 1, 15));
}

/** "jul – sep", or null for a product available all year. */
export function seasonLabel(season: Season): string | null {
    return hasSeason(season) ? `${monthName(season.season_from)} – ${monthName(season.season_to)}` : null;
}
