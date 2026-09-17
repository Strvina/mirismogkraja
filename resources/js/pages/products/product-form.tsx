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
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    <Label htmlFor="status">Status</Label>
                    <select
                        id="status"
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value as Product['status'])}
                    >
                        {['draft', 'active', 'out_of_stock', 'archived'].map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.status} />
                </div>
            </div>

            <Button disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
