import CompactSelect from '@/components/marketplace/compact-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryOptions } from '@/lib/categories';
import { t } from '@/lib/i18n';
import { type Category } from '@/types';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

export interface ProductFilterValues {
    q?: string;
    category_id?: string;
    producer_id?: string;
    city?: string;
    min_price?: string;
    max_price?: string;
    in_stock?: string;
    in_season?: string;
    sort?: string;
}

interface Props {
    filters: ProductFilterValues;
    categories: Category[];
    producers: { id: number; name: string }[];
    cities: string[];
    priceBounds: { min: number; max: number };
    onChange: (patch: ProductFilterValues) => void;
    onReset: () => void;
}

/**
 * Catalog filter panel. Sits in a sidebar on desktop; on a phone it
 * folds behind a button and opens as a compact two-column panel, with lists
 * that stay small instead of taking over the screen.
 */
export default function ProductFilters({ filters, categories, producers, cities, priceBounds, onChange, onReset }: Props) {
    const [open, setOpen] = useState(false);

    const activeCount = [
        filters.category_id,
        filters.producer_id,
        filters.city,
        filters.min_price,
        filters.max_price,
        filters.in_stock,
        filters.in_season,
    ].filter(Boolean).length;

    return (
        <div className="lg:w-64 lg:shrink-0">
            <div className="flex items-center justify-between lg:hidden">
                <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
                    <SlidersHorizontal className="size-4" />
                    {t('Filteri')}
                    {activeCount > 0 && ` (${activeCount})`}
                </Button>
            </div>

            <div className={`${open ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}>
                <div className="border-border/70 grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5 lg:p-5">
                    <div className="flex items-center justify-between sm:col-span-2 lg:col-span-1">
                        <p className="font-serif text-lg">{t('Filteri')}</p>
                        {activeCount > 0 && (
                            <button
                                type="button"
                                onClick={onReset}
                                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                            >
                                <X className="size-3" />
                                {t('Poništi')}
                            </button>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="filter-category">{t('Kategorija')}</Label>
                        <CompactSelect
                            id="filter-category"
                            className="w-full"
                            value={filters.category_id ?? ''}
                            onChange={(value) => onChange({ category_id: value || undefined })}
                            options={[{ value: '', label: t('Sve kategorije') }, ...categoryOptions(categories)]}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="filter-producer">{t('Proizvođač')}</Label>
                        <CompactSelect
                            id="filter-producer"
                            className="w-full"
                            value={filters.producer_id ?? ''}
                            onChange={(value) => onChange({ producer_id: value || undefined })}
                            options={[
                                { value: '', label: t('Svi proizvođači') },
                                ...producers.map((producer) => ({ value: String(producer.id), label: producer.name })),
                            ]}
                        />
                    </div>

                    {cities.length > 0 && (
                        <div className="grid gap-2">
                            <Label htmlFor="filter-city">{t('Mesto')}</Label>
                            <CompactSelect
                                id="filter-city"
                                className="w-full"
                                value={filters.city ?? ''}
                                onChange={(value) => onChange({ city: value || undefined })}
                                options={[{ value: '', label: t('Cela Srbija') }, ...cities.map((city) => ({ value: city, label: city }))]}
                            />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>
                            {t('Cena')} <span className="text-muted-foreground font-normal">(RSD)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                placeholder={String(Math.floor(priceBounds.min))}
                                aria-label={t('Najniža cena')}
                                defaultValue={filters.min_price ?? ''}
                                onBlur={(e) => onChange({ min_price: e.target.value || undefined })}
                            />
                            <span className="text-muted-foreground text-sm">—</span>
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                placeholder={String(Math.ceil(priceBounds.max))}
                                aria-label={t('Najviša cena')}
                                defaultValue={filters.max_price ?? ''}
                                onBlur={(e) => onChange({ max_price: e.target.value || undefined })}
                            />
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2.5 self-end text-sm sm:pb-2 lg:self-auto lg:pb-0">
                        <input
                            type="checkbox"
                            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded border focus-visible:ring-[3px]"
                            checked={filters.in_stock === '1'}
                            onChange={(e) => onChange({ in_stock: e.target.checked ? '1' : undefined })}
                        />
                        {t('Samo dostupno na stanju')}
                    </label>

                    <label className="flex cursor-pointer items-center gap-2.5 self-end text-sm sm:pb-2 lg:self-auto lg:pb-0">
                        <input
                            type="checkbox"
                            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded border focus-visible:ring-[3px]"
                            checked={filters.in_season === '1'}
                            onChange={(e) => onChange({ in_season: e.target.checked ? '1' : undefined })}
                        />
                        {t('Samo ono što je sada u sezoni')}
                    </label>
                </div>
            </div>
        </div>
    );
}
