import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ArrowDownUp, Check, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';

/**
 * Filters on a phone, the way KupujemProdajem has taught people to use
 * them there: a row of pills under the search - "Filteri", then the main
 * filters, each saying what is chosen - and one sheet behind them all. The
 * sheet lists every filter with what is chosen in it; a filter opens a page
 * of its own in the sheet (a list to pick from, searchable when long), with
 * "back" to the list of them and "Resetuj" for the page or for everything;
 * one button at the foot applies the lot, saying beforehand how many it
 * will show. The order is apart, as "Sortiraj" over the results.
 */

/** One filter in the sheet. */
export interface FilterPage {
    key: string;
    label: string;
    /** What is chosen, in a word or two; nothing when nothing is. */
    summary?: string;
    /** Also a pill in the row under the search. */
    pill?: boolean;
    /** The page itself. `done` goes back to the list of filters, for a choice that is complete. */
    render: (done: () => void) => ReactNode;
    reset: () => void;
}

/**
 * Under the search, once a filter is chosen: "Filteri" stays where it is,
 * and the pills beside it are a strip that scrolls on its own. Until then
 * the button sits inside the search field (FilterButton) and there is no
 * strip - nothing chosen, nothing to show.
 */
export function FilterPills({ pages, activeCount, onOpen }: { pages: FilterPage[]; activeCount: number; onOpen: (page: string) => void }) {
    return (
        <div role="group" aria-label={t('Brzi filteri')} className="flex items-center gap-2">
            <Button
                variant="outline"
                className="border-primary bg-primary/10 text-primary h-10 shrink-0 rounded-full px-4 font-medium"
                onClick={() => onOpen('index')}
            >
                <SlidersHorizontal className="size-4" />
                {t('Filteri')}
                {activeCount > 0 && <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">{activeCount}</span>}
            </Button>
            <span className="bg-border h-6 w-px shrink-0" aria-hidden />
            <div
                className="-mr-5 flex min-w-0 flex-1 [scrollbar-width:none] gap-2 overflow-x-auto pr-5 pb-0.5 [&::-webkit-scrollbar]:hidden"
                data-scroll-x
            >
                {pages
                    .filter((page) => page.pill)
                    .map((page) => (
                        <Button
                            key={page.key}
                            variant="outline"
                            className={cn(
                                'h-10 max-w-52 shrink-0 rounded-full px-4 font-medium',
                                page.summary && 'border-primary bg-primary/10 text-primary',
                            )}
                            onClick={() => onOpen(page.key)}
                            aria-label={page.summary ? `${page.label}: ${page.summary}` : page.label}
                        >
                            <span className="truncate">{page.summary ?? page.label}</span>
                            <ChevronDown className="size-4 shrink-0 opacity-60" />
                        </Button>
                    ))}
            </div>
        </div>
    );
}

/** "Filteri" inside the search field, while no filter is chosen. */
export function FilterButton({ onOpen, className }: { onOpen: () => void; className?: string }) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className={cn(
                'text-primary hover:bg-primary/10 flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
                className,
            )}
        >
            <SlidersHorizontal className="size-4" />
            {t('Filteri')}
        </button>
    );
}

export function FilterSheet({
    page,
    onPage,
    pages,
    count,
    onApply,
    onResetAll,
}: {
    /** The page on screen: 'index' for the list of filters, a filter's key, or null when the sheet is closed. */
    page: string | null;
    onPage: (page: string | null) => void;
    pages: FilterPage[];
    /** How many the choice will show; null while that is being asked. */
    count: number | null;
    onApply: () => void;
    onResetAll: () => void;
}) {
    const current = pages.find((candidate) => candidate.key === page);
    const back = () => onPage(current ? 'index' : null);

    return (
        <Dialog open={page !== null} onOpenChange={(open) => !open && onPage(null)}>
            <DialogContent
                aria-describedby={undefined}
                className="top-16 bottom-0 left-0 flex h-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none rounded-t-2xl border-0 p-0 sm:rounded-none sm:rounded-t-2xl [&>button:last-child]:hidden"
            >
                <header className="bg-muted/50 grid grid-cols-[3rem_1fr_auto] items-center rounded-t-2xl border-b px-2 py-3">
                    <Button variant="ghost" size="icon" onClick={back} aria-label={current ? t('Nazad na filtere') : t('Zatvori filtere')}>
                        <ChevronLeft className="size-6" />
                    </Button>
                    <DialogTitle className="text-center text-lg font-semibold">{current?.label ?? t('Filteri')}</DialogTitle>
                    <button
                        type="button"
                        onClick={() => (current ? current.reset() : onResetAll())}
                        className="text-primary disabled:text-muted-foreground px-3 text-sm font-medium"
                        disabled={current ? !current.summary : !pages.some((candidate) => candidate.summary)}
                    >
                        {t('Resetuj')}
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {current ? (
                        <div className="p-5">{current.render(() => onPage('index'))}</div>
                    ) : (
                        <ul className="px-5">
                            {pages.map((candidate) => (
                                <li key={candidate.key} className="border-b last:border-b-0">
                                    <button
                                        type="button"
                                        onClick={() => onPage(candidate.key)}
                                        className="flex w-full items-center gap-3 py-4 text-left"
                                    >
                                        <span className="flex-1 text-base">{candidate.label}</span>
                                        {candidate.summary && (
                                            <span className="text-primary max-w-[45%] truncate text-sm font-medium">{candidate.summary}</span>
                                        )}
                                        <ChevronRight className="text-muted-foreground size-5 shrink-0" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <Button className="h-12 w-full text-base" onClick={onApply}>
                        {count === null ? t('Prikaži rezultate') : t('Prikaži rezultate (:count)', { count })}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** A list to pick one from, as each page of the sheet has it: searchable once it is long. */
export function ChoiceList({
    options,
    value,
    onChoose,
}: {
    options: { value: string; label: string; hint?: string }[];
    value: string;
    onChoose: (value: string) => void;
}) {
    const [query, setQuery] = useState('');
    const searchable = options.length > 8;
    const needle = query.trim().toLocaleLowerCase();
    const shown = needle ? options.filter((option) => option.label.toLocaleLowerCase().includes(needle)) : options;

    return (
        <div className="grid gap-3">
            {searchable && (
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('Pretražite…')}
                    aria-label={t('Pretražite…')}
                    className="h-12"
                />
            )}
            <ul>
                {shown.map((option) => (
                    <li key={option.value} className="border-b last:border-b-0">
                        <button
                            type="button"
                            onClick={() => onChoose(option.value)}
                            aria-pressed={option.value === value}
                            className={cn(
                                'flex w-full items-center gap-3 py-3.5 text-left text-base',
                                option.value === value && 'text-primary font-semibold',
                            )}
                        >
                            <span className="flex-1">
                                {option.label}
                                {option.hint && <span className="text-muted-foreground block text-xs font-normal">{option.hint}</span>}
                            </span>
                            {option.value === value && <Check className="size-5 shrink-0" />}
                        </button>
                    </li>
                ))}
                {shown.length === 0 && <li className="text-muted-foreground py-6 text-center text-sm">{t('Ništa ne odgovara pretrazi.')}</li>}
            </ul>
        </div>
    );
}

/**
 * "↑↓ Sortiraj" over the results: the orders in a sheet from the foot of
 * the screen, with a cross to close it. A choice applies at once.
 */
export function SortMenu({
    value,
    options,
    onChange,
}: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="text-primary flex items-center gap-1.5 text-sm font-medium">
                <ArrowDownUp className="size-4" />
                {t('Sortiraj')}
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    aria-describedby={undefined}
                    className="data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 top-auto bottom-0 left-0 block max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-t-2xl border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:rounded-none sm:rounded-t-2xl [&>button:last-child]:hidden"
                >
                    <header className="bg-muted/50 grid grid-cols-[3rem_1fr_3rem] items-center rounded-t-2xl border-b px-2 py-3">
                        <span aria-hidden />
                        <DialogTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
                            <ArrowDownUp className="size-4" aria-hidden />
                            {t('Sortiraj')}
                        </DialogTitle>
                        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t('Zatvori')}>
                            <X className="size-5" />
                        </Button>
                    </header>
                    <ul className="max-h-[60dvh] overflow-y-auto overscroll-contain py-1">
                        {options.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    aria-pressed={option.value === value}
                                    onClick={() => {
                                        setOpen(false);
                                        onChange(option.value);
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-3 border-b px-6 py-4 text-left text-base last:border-b-0',
                                        option.value === value && 'bg-primary/10 text-primary font-semibold',
                                    )}
                                >
                                    <span className="flex-1">{option.label}</span>
                                    {option.value === value && <Check className="size-5 shrink-0" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </DialogContent>
            </Dialog>
        </>
    );
}
