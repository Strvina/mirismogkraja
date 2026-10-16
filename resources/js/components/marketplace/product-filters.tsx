import CompactSelect from '@/components/marketplace/compact-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type Category } from '@/types';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

export interface ProductFilterValues {
    q?: string;
    category_id?: string;
    producer_id?: string;
    district?: string;
    city?: string;
    min_price?: string;
    max_price?: string;
    in_stock?: string;
    in_season?: string;
    /** "dostava" (brought or sent) or "preuzimanje" (fetched from the producer). */
    delivery?: string;
    /** Added in the last 1, 3 or 7 days. */
    period?: string;
    sort?: string;
}

/** A district with the towns its producers sell from. */
export interface DistrictOption {
    value: string;
    label: string;
    cities: string[];
}

/** What the panel narrows by; the search and the order are not its to change. */
const KEYS = ['category_id', 'producer_id', 'district', 'city', 'min_price', 'max_price', 'in_stock', 'in_season', 'delivery', 'period'] as const;

type Draft = Partial<Record<(typeof KEYS)[number], string>>;

const draftOf = (filters: ProductFilterValues): Draft =>
    // A category's own page sends its id as a number.
    Object.fromEntries(KEYS.filter((key) => filters[key]).map((key) => [key, String(filters[key])]));

const same = (a: Draft, b: Draft) => KEYS.every((key) => (a[key] ?? '') === (b[key] ?? ''));

interface Props {
    filters: ProductFilterValues;
    categories: Category[];
    producers: { id: number; name: string }[];
    districts?: DistrictOption[];
    cities: string[];
    priceBounds: { min: number; max: number };
    /** How many the filters in force show. */
    total?: number;
    onChange: (patch: ProductFilterValues) => void;
    onReset: () => void;
}

/**
 * The catalogue's filters, the way KupujemProdajem has taught people to use
 * them: everything is chosen first and applied with one button, which says
 * beforehand how many products the choice will show - no reload after every
 * tick, and no empty list found out the hard way. The basic filters come
 * first, a narrower field opening once the wider one is chosen (category,
 * then subcategory; district, then town); the rest folds away.
 *
 * Beside the list on a computer. On a phone a row of quick choices under
 * the search - each applied at once - and "Filteri" for the whole panel.
 */
export default function ProductFilters({ filters, total, onChange, onReset, ...choices }: Props) {
    const applied = draftOf(filters);
    const [draft, setDraft] = useState<Draft>(applied);
    const [panelOpen, setPanelOpen] = useState(false);
    const count = usePendingCount(draft, applied, filters.q, total);
    const appliedKey = JSON.stringify(applied);

    // A list changed from outside the panel - a chip, "Poništi", the back button - starts it over.
    useEffect(() => setDraft(JSON.parse(appliedKey) as Draft), [appliedKey]);

    const activeCount = Object.keys(applied).length;
    const apply = (next: Draft = draft) => {
        onChange(Object.fromEntries(KEYS.map((key) => [key, next[key] || undefined])));
        setPanelOpen(false);
    };
    const quick = (patch: Draft) => apply({ ...applied, ...patch });

    const panel = (
        <FilterFields
            draft={draft}
            setDraft={setDraft}
            count={count}
            changed={!same(draft, applied)}
            activeCount={activeCount}
            onApply={() => apply()}
            onReset={() => {
                setPanelOpen(false);
                onReset();
            }}
            {...choices}
        />
    );

    const roots = choices.categories.filter((category) => !category.parent_id);
    const rootOf = (id?: string) => {
        const category = choices.categories.find((option) => String(option.id) === id);

        return category?.parent_id ? String(category.parent_id) : category ? String(category.id) : '';
    };
    const pill = (active: boolean) => cn('h-9 w-auto shrink-0 rounded-full px-4 font-medium', active && 'border-primary bg-primary/10 text-primary');

    return (
        <div className="lg:w-72 lg:shrink-0">
            {/* On a phone: the quick choices, one swipe wide. */}
            <div className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 lg:hidden [&::-webkit-scrollbar]:hidden">
                <Button variant="outline" className={pill(activeCount > 0)} onClick={() => setPanelOpen(true)}>
                    <SlidersHorizontal className="size-4" />
                    {t('Filteri')}
                    {activeCount > 0 && <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">{activeCount}</span>}
                </Button>
                <CompactSelect
                    label={t('Kategorija')}
                    className={pill(Boolean(applied.category_id))}
                    value={rootOf(applied.category_id)}
                    onChange={(value) => quick({ category_id: value })}
                    options={[
                        { value: '', label: t('Kategorija') },
                        ...roots.map((category) => ({ value: String(category.id), label: t(category.name) })),
                    ]}
                />
                {(choices.districts ?? []).length > 0 && (
                    <CompactSelect
                        label={t('Okrug')}
                        className={pill(Boolean(applied.district))}
                        value={applied.district ?? ''}
                        onChange={(value) => quick({ district: value, city: '' })}
                        options={[{ value: '', label: t('Okrug') }, ...(choices.districts ?? [])]}
                    />
                )}
                <Button
                    variant="outline"
                    className={pill(applied.in_stock === '1')}
                    aria-pressed={applied.in_stock === '1'}
                    onClick={() => quick({ in_stock: applied.in_stock === '1' ? '' : '1' })}
                >
                    {t('Dostupno odmah')}
                </Button>
            </div>

            <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
                <DialogContent
                    aria-describedby={undefined}
                    className="top-0 left-0 flex h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none p-0 sm:rounded-none [&>button:last-child]:top-5"
                >
                    <DialogTitle className="sr-only">{t('Filteri')}</DialogTitle>
                    {panelOpen && (
                        <section aria-label={t('Filteri')} className="flex flex-1 flex-col">
                            {panel}
                        </section>
                    )}
                </DialogContent>
            </Dialog>

            <section aria-label={t('Filteri')} className="hidden lg:block">
                {panel}
            </section>
        </div>
    );
}

/**
 * How many products the filters being chosen would show: asked of the
 * server a moment after the last change, while they differ from the ones in
 * force; those in force show the list's own count.
 */
function usePendingCount(draft: Draft, applied: Draft, q: string | undefined, total: number | undefined): number | null {
    const [count, setCount] = useState<number | null>(null);
    const pending = !same(draft, applied);
    const query = JSON.stringify({ ...draft, q: q || undefined });

    useEffect(() => {
        if (!pending) {
            return;
        }

        setCount(null);
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(route('marketplace.products.count', JSON.parse(query)), { signal: controller.signal, headers: { Accept: 'application/json' } })
                .then((response) => (response.ok ? response.json() : null))
                .then((body: { count?: number } | null) => setCount(typeof body?.count === 'number' ? body.count : null))
                .catch(() => undefined);
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [pending, query]);

    return pending ? count : (total ?? null);
}

// Larger than the site's small print: the panel is read and tapped through,
// often on a phone, often by people who do not squint at 14px grey.
const label = 'text-[0.95rem] font-semibold';
const control = 'h-10 w-full text-[0.95rem]';
const tick = 'border-input text-primary focus-visible:ring-ring/50 size-5 shrink-0 rounded border focus-visible:ring-[3px]';

function FilterFields({
    draft,
    setDraft,
    count,
    changed,
    activeCount,
    onApply,
    onReset,
    categories,
    producers,
    districts = [],
    cities,
    priceBounds,
}: Omit<Props, 'filters' | 'total' | 'onChange' | 'onReset'> & {
    draft: Draft;
    setDraft: (update: (draft: Draft) => Draft) => void;
    count: number | null;
    changed: boolean;
    activeCount: number;
    onApply: () => void;
    onReset: () => void;
}) {
    const id = useId();
    const [more, setMore] = useState(Boolean(draft.producer_id || draft.in_season || draft.period));
    const set = (patch: Draft) => setDraft((current) => ({ ...current, ...patch }));

    // Category, then the narrower one within it.
    const chosen = categories.find((category) => String(category.id) === draft.category_id);
    const root = chosen?.parent_id ? categories.find((category) => category.id === chosen.parent_id) : chosen;
    const subcategories = root ? categories.filter((category) => category.parent_id === root.id) : [];

    // District, then a town within it.
    const district = districts.find((option) => option.value === draft.district);
    const towns = districts.length > 0 ? (district?.cities ?? []) : cities;

    // Both ways of getting it, or neither, is no filter at all.
    const delivery = (way: 'dostava' | 'preuzimanje', on: boolean) => {
        const ways = new Set(draft.delivery ? [draft.delivery] : []);

        if (on) {
            ways.add(way);
        } else {
            ways.delete(way);
        }

        set({ delivery: ways.size === 1 ? [...ways][0] : '' });
    };

    return (
        <div className="bg-card flex flex-1 flex-col rounded-xl border shadow-sm max-lg:rounded-none max-lg:border-0">
            <div className="flex items-center justify-between border-b px-5 py-4 max-lg:pr-14">
                <p className="flex items-center gap-2 font-serif text-xl">
                    <SlidersHorizontal className="text-primary size-4" aria-hidden />
                    {t('Filteri')}
                </p>
                {activeCount > 0 && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-primary hover:bg-muted flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors"
                    >
                        <X className="size-3.5" />
                        {t('Poništi')}
                    </button>
                )}
            </div>

            <div className="grid gap-5 p-5">
                <p className="text-primary text-sm font-semibold">{t('Osnovni filteri')}</p>

                <div className="grid gap-2">
                    <Label htmlFor={`${id}-category`} className={label}>
                        {t('Kategorija')}
                    </Label>
                    <CompactSelect
                        id={`${id}-category`}
                        className={control}
                        value={root ? String(root.id) : ''}
                        onChange={(value) => set({ category_id: value })}
                        options={[
                            { value: '', label: t('Sve kategorije') },
                            ...categories
                                .filter((category) => !category.parent_id)
                                .map((category) => ({ value: String(category.id), label: t(category.name) })),
                        ]}
                    />
                    {subcategories.length > 0 && root && (
                        <CompactSelect
                            label={t('Potkategorija')}
                            className={control}
                            value={chosen && chosen.id !== root.id ? String(chosen.id) : ''}
                            onChange={(value) => set({ category_id: value || String(root.id) })}
                            options={[
                                { value: '', label: t('Sve iz „:category”', { category: t(root.name) }) },
                                ...subcategories.map((category) => ({ value: String(category.id), label: t(category.name) })),
                            ]}
                        />
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor={`${id}-district`} className={label}>
                        {districts.length > 0 ? t('Okrug i mesto') : t('Mesto')}
                    </Label>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                        {districts.length > 0 && (
                            <CompactSelect
                                id={`${id}-district`}
                                label={t('Okrug')}
                                className={control}
                                value={draft.district ?? ''}
                                onChange={(value) => set({ district: value, city: '' })}
                                options={[{ value: '', label: t('Svi okruzi') }, ...districts]}
                            />
                        )}
                        <CompactSelect
                            id={districts.length > 0 ? undefined : `${id}-district`}
                            label={t('Mesto')}
                            // Like "Okolina" after "Mesto": nothing to pick until a district is.
                            disabled={districts.length > 0 && !district}
                            className={cn(control, districts.length === 0 && 'col-span-2 lg:col-span-1')}
                            value={draft.city ?? ''}
                            onChange={(value) => set({ city: value })}
                            options={[
                                { value: '', label: district ? t('Sva mesta') : t('Mesto') },
                                ...towns.map((city) => ({ value: city, label: city })),
                            ]}
                        />
                    </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                    <input
                        type="checkbox"
                        className={tick}
                        checked={draft.in_stock === '1'}
                        onChange={(e) => set({ in_stock: e.target.checked ? '1' : '' })}
                    />
                    {t('Dostupno odmah')}
                </label>

                <div className="grid gap-2">
                    <p className={label}>
                        {t('Cena')} <span className="text-muted-foreground font-normal">(RSD)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className="h-10"
                            placeholder={t('od :price', { price: Math.floor(priceBounds.min) })}
                            aria-label={t('Najniža cena')}
                            value={draft.min_price ?? ''}
                            onChange={(e) => set({ min_price: e.target.value })}
                        />
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className="h-10"
                            placeholder={t('do :price', { price: Math.ceil(priceBounds.max) })}
                            aria-label={t('Najviša cena')}
                            value={draft.max_price ?? ''}
                            onChange={(e) => set({ max_price: e.target.value })}
                        />
                    </div>
                </div>

                <fieldset className="grid gap-2.5">
                    <legend className={cn(label, 'mb-2')}>{t('Isporuka')}</legend>
                    <label className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                        <input
                            type="checkbox"
                            className={tick}
                            checked={draft.delivery === 'dostava'}
                            onChange={(e) => delivery('dostava', e.target.checked)}
                        />
                        {t('Dostava')}
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                        <input
                            type="checkbox"
                            className={tick}
                            checked={draft.delivery === 'preuzimanje'}
                            onChange={(e) => delivery('preuzimanje', e.target.checked)}
                        />
                        {t('Lično preuzimanje')}
                    </label>
                </fieldset>

                <div className="border-t pt-4">
                    <button
                        type="button"
                        onClick={() => setMore(!more)}
                        aria-expanded={more}
                        className="text-primary flex w-full items-center justify-between text-sm font-semibold"
                    >
                        {t('Dodatni filteri')}
                        <span className="flex items-center gap-1 font-medium">
                            {more ? t('Skupite') : t('Proširite')}
                            {more ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </span>
                    </button>

                    {more && (
                        <div className="mt-5 grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor={`${id}-producer`} className={label}>
                                    {t('Proizvođač')}
                                </Label>
                                <CompactSelect
                                    id={`${id}-producer`}
                                    className={control}
                                    value={draft.producer_id ?? ''}
                                    onChange={(value) => set({ producer_id: value })}
                                    options={[
                                        { value: '', label: t('Svi proizvođači') },
                                        ...producers.map((producer) => ({ value: String(producer.id), label: producer.name })),
                                    ]}
                                />
                            </div>

                            <label className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                                <input
                                    type="checkbox"
                                    className={tick}
                                    checked={draft.in_season === '1'}
                                    onChange={(e) => set({ in_season: e.target.checked ? '1' : '' })}
                                />
                                {t('Samo ono što je sada u sezoni')}
                            </label>

                            <fieldset className="grid gap-2.5">
                                <legend className={cn(label, 'mb-2')}>{t('Period')}</legend>
                                {[
                                    ['', t('Bilo kada')],
                                    ['1', t('Dodato danas')],
                                    ['3', t('Poslednja 3 dana')],
                                    ['7', t('Poslednjih 7 dana')],
                                ].map(([value, text]) => (
                                    <label key={value} className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                                        <input
                                            type="radio"
                                            name={`${id}-period`}
                                            className="accent-primary size-5 shrink-0"
                                            checked={(draft.period ?? '') === value}
                                            onChange={() => set({ period: value })}
                                        />
                                        {text}
                                    </label>
                                ))}
                            </fieldset>
                        </div>
                    )}
                </div>
            </div>

            {/* Always in reach, saying beforehand what the choice will show. */}
            <div className="bg-card/95 sticky bottom-0 mt-auto rounded-b-xl border-t p-4 backdrop-blur">
                <Button className="h-11 w-full text-[0.95rem]" onClick={onApply} disabled={!changed}>
                    {count === null ? t('Prikaži rezultate') : t('Prikaži rezultate (:count)', { count })}
                </Button>
            </div>
        </div>
    );
}
