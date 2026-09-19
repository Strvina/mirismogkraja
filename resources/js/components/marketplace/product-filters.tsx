import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Category } from '@/types';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

export interface ProductFilterValues {
    category_id?: string;
    producer_id?: string;
    city?: string;
    min_price?: string;
    max_price?: string;
    in_stock?: string;
    min_rating?: string;
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

const selectClasses =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none';

/**
 * Catalog filter panel (task 12). Sits in a sidebar on desktop and collapses
 * behind a toggle on mobile, using the same inputs and type scale as the
 * rest of the site rather than bare unstyled selects.
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
        filters.min_rating,
    ].filter(Boolean).length;

    return (
        <div className="lg:w-64 lg:shrink-0">
            <div className="flex items-center justify-between lg:hidden">
                <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
                    <SlidersHorizontal className="size-4" />
                    Filteri{activeCount > 0 && ` (${activeCount})`}
                </Button>
            </div>

            <div className={`${open ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}>
                <div className="border-border/70 space-y-5 rounded-lg border p-5">
                    <div className="flex items-center justify-between">
                        <p className="font-serif text-lg">Filteri</p>
                        {activeCount > 0 && (
                            <button
                                type="button"
                                onClick={onReset}
                                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                            >
                                <X className="size-3" />
                                Poništi
                            </button>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="filter-category">Kategorija</Label>
                        <select
                            id="filter-category"
                            className={selectClasses}
                            value={filters.category_id ?? ''}
                            onChange={(e) => onChange({ category_id: e.target.value || undefined })}
                        >
                            <option value="">Sve kategorije</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="filter-producer">Proizvođač</Label>
                        <select
                            id="filter-producer"
                            className={selectClasses}
                            value={filters.producer_id ?? ''}
                            onChange={(e) => onChange({ producer_id: e.target.value || undefined })}
                        >
                            <option value="">Svi proizvođači</option>
                            {producers.map((producer) => (
                                <option key={producer.id} value={producer.id}>
                                    {producer.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {cities.length > 0 && (
                        <div className="grid gap-2">
                            <Label htmlFor="filter-city">Mesto</Label>
                            <select
                                id="filter-city"
                                className={selectClasses}
                                value={filters.city ?? ''}
                                onChange={(e) => onChange({ city: e.target.value || undefined })}
                            >
                                <option value="">Cela Srbija</option>
                                {cities.map((city) => (
                                    <option key={city} value={city}>
                                        {city}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>
                            Cena <span className="text-muted-foreground font-normal">(RSD)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                placeholder={String(Math.floor(priceBounds.min))}
                                aria-label="Najniža cena"
                                defaultValue={filters.min_price ?? ''}
                                onBlur={(e) => onChange({ min_price: e.target.value || undefined })}
                            />
                            <span className="text-muted-foreground text-sm">—</span>
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                placeholder={String(Math.ceil(priceBounds.max))}
                                aria-label="Najviša cena"
                                defaultValue={filters.max_price ?? ''}
                                onBlur={(e) => onChange({ max_price: e.target.value || undefined })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="filter-rating">Ocena proizvođača</Label>
                        <select
                            id="filter-rating"
                            className={selectClasses}
                            value={filters.min_rating ?? ''}
                            onChange={(e) => onChange({ min_rating: e.target.value || undefined })}
                        >
                            <option value="">Sve ocene</option>
                            <option value="4">4★ i više</option>
                            <option value="3">3★ i više</option>
                            <option value="2">2★ i više</option>
                        </select>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded border focus-visible:ring-[3px]"
                            checked={filters.in_stock === '1'}
                            onChange={(e) => onChange({ in_stock: e.target.checked ? '1' : undefined })}
                        />
                        Samo dostupno na stanju
                    </label>
                </div>
            </div>
        </div>
    );
}
