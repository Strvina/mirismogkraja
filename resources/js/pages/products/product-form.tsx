import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t, tx } from '@/lib/i18n';
import { monthName } from '@/lib/season';
import { type Category, type Product } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type ProductFormData = {
    category_id: string;
    name: string;
    description: string;
    price: string;
    unit: Product['unit'];
    stock_quantity: string;
    /** "" for all year, otherwise "1"-"12". */
    season_from: string;
    season_to: string;
    status: Product['status'];
};

/**
 * The stored values are enum-ish keys; producers see plain language for what
 * each one actually does to their listing.
 */
const STATUS_OPTIONS: { value: Product['status']; label: string }[] = [
    { value: 'draft', label: tx('Nacrt — još nije javno') },
    { value: 'active', label: tx('Objavljeno') },
    { value: 'archived', label: tx('Sklonjeno') },
];

const STATUS_HINTS: Record<Product['status'], string> = {
    draft: tx('Vidite ga samo vi, dok ga ne objavite.'),
    active: tx('Svi ga vide i mogu da vam pišu o njemu.'),
    archived: tx('Sklonjen sa sajta, ali ostaje sačuvan kod vas.'),
    blocked: tx('Administrator je sklonio ovaj proizvod sa sajta. Možete da ga ispravite, ali samo administrator može ponovo da ga objavi.'),
};

export default function ProductForm({
    product,
    categories,
    action,
    method,
    submitLabel,
}: {
    product?: Product;
    categories: Category[];
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
}) {
    const { data, setData, post, put, processing, errors } = useForm<ProductFormData>({
        category_id: product ? String(product.category_id) : '',
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        unit: product?.unit ?? 'kom',
        stock_quantity: product ? String(product.stock_quantity) : '0',
        season_from: product?.season_from ? String(product.season_from) : '',
        season_to: product?.season_to ? String(product.season_to) : '',
        status: product?.status ?? 'draft',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        (method === 'post' ? post : put)(action);
    };

    return (
        <form onSubmit={submit} className="max-w-xl space-y-6">
            <div className="grid gap-2">
                <Label htmlFor="category_id">{t('Kategorija')}</Label>
                <select
                    id="category_id"
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    value={data.category_id}
                    onChange={(e) => setData('category_id', e.target.value)}
                    required
                >
                    <option value="">{t('Izaberi kategoriju')}</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <InputError message={errors.category_id} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">{t('Naziv proizvoda')}</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">{t('Opis')}</Label>
                <textarea
                    id="description"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="price">{t('Cena (RSD)')}</Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.price}
                        onChange={(e) => setData('price', e.target.value)}
                        required
                    />
                    <InputError message={errors.price} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="unit">{t('Jedinica mere')}</Label>
                    <select
                        id="unit"
                        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        value={data.unit}
                        onChange={(e) => setData('unit', e.target.value as Product['unit'])}
                    >
                        {['kg', 'g', 'l', 'ml', 'kom', 'paket'].map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.unit} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="stock_quantity">{t('Količina na stanju')}</Label>
                    <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={data.stock_quantity}
                        onChange={(e) => setData('stock_quantity', e.target.value)}
                        required
                    />
                    <InputError message={errors.stock_quantity} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="status">{t('Vidljivost')}</Label>
                    {data.status === 'blocked' ? (
                        <p id="status" className="text-destructive text-sm font-medium">
                            {t('Blokiran')}
                        </p>
                    ) : (
                        <select
                            id="status"
                            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value as Product['status'])}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {t(option.label)}
                                </option>
                            ))}
                        </select>
                    )}
                    <p className="text-muted-foreground text-xs">{t(STATUS_HINTS[data.status])}</p>
                    <InputError message={errors.status} />
                </div>
            </div>

            <fieldset className="grid gap-2">
                <legend className="text-sm leading-none font-medium">{t('Sezona')}</legend>
                <p className="text-muted-foreground text-xs">
                    {t('Za proizvode kojih nema cele godine. Kupci vide da li je proizvod sada u sezoni, i mogu da traže samo takve.')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                    {(['season_from', 'season_to'] as const).map((field) => (
                        <select
                            key={field}
                            aria-label={field === 'season_from' ? t('Sezona od') : t('Sezona do')}
                            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                            value={data[field]}
                            onChange={(e) => {
                                const value = e.target.value;
                                // "All year" clears both ends; picking one end
                                // of an empty range fills the other with it.
                                setData((current) => ({
                                    ...current,
                                    [field]: value,
                                    ...(value === ''
                                        ? { season_from: '', season_to: '' }
                                        : field === 'season_from' && !current.season_to
                                          ? { season_to: value }
                                          : field === 'season_to' && !current.season_from
                                            ? { season_from: value }
                                            : {}),
                                }));
                            }}
                        >
                            <option value="">{field === 'season_from' ? t('Cele godine') : '—'}</option>
                            {Array.from({ length: 12 }, (_, index) => (
                                <option key={index + 1} value={String(index + 1)}>
                                    {monthName(index + 1, 'long')}
                                </option>
                            ))}
                        </select>
                    ))}
                </div>
                <InputError message={errors.season_from ?? errors.season_to} />
            </fieldset>

            <Button disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
