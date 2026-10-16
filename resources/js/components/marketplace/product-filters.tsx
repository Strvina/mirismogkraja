import CompactSelect from '@/components/marketplace/compact-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryOptions } from '@/lib/categories';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type Category } from '@/types';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

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
    sort?: string;
}

/** A district with the towns its producers sell from. */
export interface DistrictOption {
    value: string;
    label: string;
    cities: string[];
}

interface Props {
    filters: ProductFilterValues;
    categories: Category[];
    producers: { id: number; name: string }[];
    districts?: DistrictOption[];
    cities: string[];
    priceBounds: { min: number; max: number };
    onChange: (patch: ProductFilterValues) => void;
    onReset: () => void;
}

// Larger than the site's small print: the panel is read and tapped through,
// often on a phone, often by people who do not squint at 14px grey.
const label = 'text-[0.95rem] font-semibold';
const control = 'h-10 w-full text-[0.95rem]';
const checkbox = 'border-input text-primary focus-visible:ring-ring/50 size-5 shrink-0 rounded border focus-visible:ring-[3px]';

/**
 * Catalog filter panel. Sits in a sidebar on desktop; on a phone it
 * folds behind a button and opens as a compact two-column panel, with lists
 * that stay small instead of taking over the screen.
 */
export default function ProductFilters({ filters, categories, producers, districts = [], cities, priceBounds, onChange, onReset }: Props) {
    const [open, setOpen] = useState(false);

    const activeCount = [
        filters.category_id,
        filters.producer_id,
        filters.district,
        filters.city,
        filters.min_price,
        filters.max_price,
        filters.in_stock,
        filters.in_season,
    ].filter(Boolean).length;

    // Within a district, only its towns.
    const district = districts.find((option) => option.value === filters.district);
    const towns = district ? district.cities : cities;

    const chooseDistrict = (value: string) => {
        const chosen = districts.find((option) => option.value === value);

        // A town from another district would leave nothing to show.
        onChange({ district: value || undefined, ...(chosen && filters.city && !chosen.cities.includes(filters.city) ? { city: undefined } : {}) });
    };

    return (
        <div className="lg:w-72 lg:shrink-0">
            <div className="flex items-center justify-between lg:hidden">
                <Button variant="outline" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
                    <SlidersHorizontal className="size-4" />
                    {t('Filteri')}
                    {activeCount > 0 && (
                        <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">{activeCount}</span>
                    )}
                </Button>
            </div>

            <div className={cn(open ? 'mt-4 block' : 'hidden', 'lg:mt-0 lg:block')}>
                <div className="bg-card grid gap-5 rounded-xl border p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-1">
                    <div className="flex items-center justify-between border-b pb-3 sm:col-span-2 lg:col-span-1">
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

                    <div className="grid gap-2">
                        <Label htmlFor="filter-category" className={label}>
                            {t('Kategorija')}
                        </Label>
                        <CompactSelect
                            id="filter-category"
                            className={control}
                            // A category's own page sends its id as a number.
                            value={filters.category_id ? String(filters.category_id) : ''}
                            onChange={(value) => onChange({ category_id: value || undefined })}
                            options={[{ value: '', label: t('Sve kategorije') }, ...categoryOptions(categories)]}
                        />
                    </div>

                    {districts.length > 0 && (
                        <div className="grid gap-2">
                            <Label htmlFor="filter-district" className={label}>
                                {t('Okrug')}
                            </Label>
                            <CompactSelect
                                id="filter-district"
                                className={control}
                                value={filters.district ?? ''}
                                onChange={chooseDistrict}
                                options={[{ value: '', label: t('Svi okruzi') }, ...districts]}
                            />
                        </div>
                    )}

                    {towns.length > 0 && (
                        <div className="grid gap-2">
                            <Label htmlFor="filter-city" className={label}>
                                {t('Mesto')}
                            </Label>
                            <CompactSelect
                                id="filter-city"
                                className={control}
                                value={filters.city ?? ''}
                                onChange={(value) => onChange({ city: value || undefined })}
                                options={[
                                    { value: '', label: district ? t('Sva mesta u okrugu') : t('Cela Srbija') },
                                    ...towns.map((city) => ({ value: city, label: city })),
                                ]}
                            />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="filter-producer" className={label}>
                            {t('Proizvođač')}
                        </Label>
                        <CompactSelect
                            id="filter-producer"
                            className={control}
                            value={filters.producer_id ?? ''}
                            onChange={(value) => onChange({ producer_id: value || undefined })}
                            options={[
                                { value: '', label: t('Svi proizvođači') },
                                ...producers.map((producer) => ({ value: String(producer.id), label: producer.name })),
                            ]}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label className={label}>
                            {t('Cena')} <span className="text-muted-foreground font-normal">(RSD)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                className="h-10"
                                placeholder={String(Math.floor(priceBounds.min))}
                                aria-label={t('Najniža cena')}
                                defaultValue={filters.min_price ?? ''}
                                onBlur={(e) => onChange({ min_price: e.target.value || undefined })}
                            />
                            <span className="text-muted-foreground">—</span>
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                className="h-10"
                                placeholder={String(Math.ceil(priceBounds.max))}
                                aria-label={t('Najviša cena')}
                                defaultValue={filters.max_price ?? ''}
                                onBlur={(e) => onChange({ max_price: e.target.value || undefined })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 border-t pt-4 sm:col-span-2 lg:col-span-1">
                        <label className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                            <input
                                type="checkbox"
                                className={checkbox}
                                checked={filters.in_stock === '1'}
                                onChange={(e) => onChange({ in_stock: e.target.checked ? '1' : undefined })}
                            />
                            {t('Samo dostupno na stanju')}
                        </label>

                        <label className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                            <input
                                type="checkbox"
                                className={checkbox}
                                checked={filters.in_season === '1'}
                                onChange={(e) => onChange({ in_season: e.target.checked ? '1' : undefined })}
                            />
                            {t('Samo ono što je sada u sezoni')}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
