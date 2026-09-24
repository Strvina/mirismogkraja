import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    status: Product['status'];
};

/**
 * The stored values are enum-ish keys; producers see plain language for what
 * each one actually does to their listing.
 */
const STATUS_OPTIONS: { value: Product['status']; label: string }[] = [
    { value: 'draft', label: 'Nacrt — još nije javno' },
    { value: 'active', label: 'Objavljeno' },
    { value: 'out_of_stock', label: 'Trenutno nema' },
    { value: 'archived', label: 'Sklonjeno' },
];

const STATUS_HINTS: Record<Product['status'], string> = {
    draft: 'Vidite ga samo vi, dok ga ne objavite.',
    active: 'Svi ga vide i mogu da vam pišu o njemu.',
    out_of_stock: 'Ostaje vidljiv, uz oznaku da trenutno nema.',
    archived: 'Sklonjen sa sajta, ali ostaje sačuvan kod vas.',
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
        status: product?.status ?? 'draft',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        (method === 'post' ? post : put)(action);
    };

    return (
        <form onSubmit={submit} className="max-w-xl space-y-6">
            <div className="grid gap-2">
                <Label htmlFor="category_id">Kategorija</Label>
                <select
                    id="category_id"
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    value={data.category_id}
                    onChange={(e) => setData('category_id', e.target.value)}
                    required
                >
                    <option value="">Izaberi kategoriju</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <InputError message={errors.category_id} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Naziv proizvoda</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Opis</Label>
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
                    <Label htmlFor="price">Cena (RSD)</Label>
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
                    <Label htmlFor="unit">Jedinica mere</Label>
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
                    <Label htmlFor="stock_quantity">Količina na stanju</Label>
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
                    <Label htmlFor="status">Vidljivost</Label>
                    <select
                        id="status"
                        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value as Product['status'])}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-muted-foreground text-xs">{STATUS_HINTS[data.status]}</p>
                    <InputError message={errors.status} />
                </div>
            </div>

            <Button disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
