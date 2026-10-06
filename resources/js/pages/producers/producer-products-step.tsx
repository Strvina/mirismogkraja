import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryLabel } from '@/lib/categories';
import { t } from '@/lib/i18n';
import { shrinkImage } from '@/lib/shrink-image';
import { type Category } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

export type DraftProduct = {
    /** Which row this is, for React - an index would move with every removal. */
    uid: number;
    name: string;
    category_id: string;
    price: string;
    unit: string;
    stock_quantity: string;
    image: File | null;
};

const UNITS = ['kg', 'g', 'l', 'ml', 'kom', 'paket'];

let nextUid = 0;

export const emptyProduct = (): DraftProduct => ({
    uid: ++nextUid,
    name: '',
    category_id: '',
    price: '',
    unit: 'kg',
    stock_quantity: '0',
    image: null,
});

/**
 * The sign-up wizard's last step: the first few products, entered along
 * with the producer so a new seller does not arrive at an empty page and
 * have to find where products are added. Optional - more can be added,
 * with more detail, from the producer's own page at any time.
 */
export default function ProducerProductsStep({
    products,
    categories,
    errors,
    onChange,
}: {
    products: DraftProduct[];
    categories: Category[];
    errors: Record<string, string | undefined>;
    onChange: (products: DraftProduct[]) => void;
}) {
    const update = (index: number, patch: Partial<DraftProduct>) =>
        onChange(products.map((product, i) => (i === index ? { ...product, ...patch } : product)));

    const error = (index: number, field: keyof DraftProduct) => errors[`products.${index}.${field}`];

    return (
        <div className="space-y-4">
            {products.length === 0 && (
                <p className="border-border/70 text-muted-foreground rounded-lg border border-dashed p-5 text-center text-sm">
                    {t('Još niste dodali proizvode. Ovaj korak nije obavezan — proizvode možete dodati i kasnije.')}
                </p>
            )}

            {products.map((product, index) => {
                const id = (field: string) => `product-${index}-${field}`;

                return (
                    <fieldset key={product.uid} className="border-border/70 grid gap-3 rounded-xl border p-4 sm:grid-cols-6">
                        <legend className="px-1 text-sm font-medium">{t('Proizvod :number', { number: index + 1 })}</legend>

                        <div className="grid gap-1.5 sm:col-span-4">
                            <Label htmlFor={id('name')}>{t('Naziv')}</Label>
                            <Input
                                id={id('name')}
                                value={product.name}
                                onChange={(e) => update(index, { name: e.target.value })}
                                placeholder={t('Npr. Bagremov med')}
                            />
                            <InputError message={error(index, 'name')} />
                        </div>

                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label htmlFor={id('category')}>{t('Kategorija')}</Label>
                            <select
                                id={id('category')}
                                value={product.category_id}
                                onChange={(e) => update(index, { category_id: e.target.value })}
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                            >
                                <option value="">{t('Izaberite…')}</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {categoryLabel(category)}
                                    </option>
                                ))}
                            </select>
                            <InputError message={error(index, 'category_id')} />
                        </div>

                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label htmlFor={id('price')}>{t('Cena (RSD)')}</Label>
                            <Input
                                id={id('price')}
                                type="number"
                                min={0}
                                step="0.01"
                                value={product.price}
                                onChange={(e) => update(index, { price: e.target.value })}
                            />
                            <InputError message={error(index, 'price')} />
                        </div>

                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label htmlFor={id('unit')}>{t('Po jedinici')}</Label>
                            <select
                                id={id('unit')}
                                value={product.unit}
                                onChange={(e) => update(index, { unit: e.target.value })}
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                            >
                                {UNITS.map((unit) => (
                                    <option key={unit} value={unit}>
                                        {unit}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label htmlFor={id('stock')}>{t('Na stanju')}</Label>
                            <Input
                                id={id('stock')}
                                type="number"
                                min={0}
                                value={product.stock_quantity}
                                onChange={(e) => update(index, { stock_quantity: e.target.value })}
                            />
                            <InputError message={error(index, 'stock_quantity')} />
                        </div>

                        <div className="grid gap-1.5 sm:col-span-5">
                            <Label htmlFor={id('image')}>{t('Slika (opciono)')}</Label>
                            <Input
                                id={id('image')}
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    update(index, { image: file ? await shrinkImage(file) : null });
                                }}
                            />
                            <InputError message={error(index, 'image')} />
                        </div>

                        <div className="flex items-end sm:col-span-1 sm:justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t('Ukloni proizvod :number', { number: index + 1 })}
                                onClick={() => onChange(products.filter((_, i) => i !== index))}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </fieldset>
                );
            })}

            {products.length < 20 && (
                <Button type="button" variant="outline" onClick={() => onChange([...products, emptyProduct()])}>
                    <Plus className="size-4" />
                    {t('Dodaj proizvod')}
                </Button>
            )}
            <InputError message={errors.products} />
        </div>
    );
}
