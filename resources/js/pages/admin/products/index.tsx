import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { formatPrice } from '@/lib/format';
import { type Category, type Product } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

type AdminProduct = Product & { producer: { id: number; name: string } | null; category: { id: number; name: string } | null };

const statusLabels: Record<string, string> = {
    draft: 'Nacrt',
    active: 'Aktivan',
    archived: 'Arhiviran',
};

const selectClasses =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none';

export default function AdminProductsIndex({
    products,
    producers,
    categories,
    statuses,
    filters,
}: {
    products: Paginated<AdminProduct>;
    producers: { id: number; name: string }[];
    categories: Category[];
    statuses: string[];
    filters: { search?: string; producer_id?: string; status?: string };
}) {
    const [selected, setSelected] = useState<number[]>([]);

    const filter = (patch: Record<string, string | undefined>) => {
        router.get('/admin/proizvodi', { ...filters, ...patch, page: undefined }, { preserveState: true, preserveScroll: true });
    };

    const allOnPageSelected = products.data.length > 0 && products.data.every((product) => selected.includes(product.id));

    const toggleAll = () => {
        setSelected(allOnPageSelected ? [] : products.data.map((product) => product.id));
    };

    const toggle = (id: number) => {
        setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    };

    const runBulk = (payload: Record<string, unknown>) => {
        router.post(route('admin.products.bulk'), { ids: selected, ...payload }, { preserveScroll: true, onSuccess: () => setSelected([]) });
    };

    const bulkDelete = () => {
        if (confirm(`Obrisati ${selected.length} proizvoda? Ova radnja se ne može poništiti.`)) {
            runBulk({ action: 'delete' });
        }
    };

    return (
        <AdminLayout title="Proizvodi">
            <Head title="Proizvodi — Admin" />

            <div className="flex flex-wrap gap-3">
                <Input
                    defaultValue={filters.search ?? ''}
                    placeholder="Pretraga po nazivu"
                    className="max-w-xs"
                    onBlur={(e) => filter({ search: e.target.value || undefined })}
                />

                <select
                    className={selectClasses}
                    value={filters.producer_id ?? ''}
                    onChange={(e) => filter({ producer_id: e.target.value || undefined })}
                >
                    <option value="">Svi proizvođači</option>
                    {producers.map((producer) => (
                        <option key={producer.id} value={producer.id}>
                            {producer.name}
                        </option>
                    ))}
                </select>

                <select className={selectClasses} value={filters.status ?? ''} onChange={(e) => filter({ status: e.target.value || undefined })}>
                    <option value="">Svi statusi</option>
                    {statuses.map((status) => (
                        <option key={status} value={status}>
                            {statusLabels[status]}
                        </option>
                    ))}
                </select>
            </div>

            {selected.length > 0 && (
                <div className="bg-olive-soft mt-4 flex flex-wrap items-center gap-3 rounded-lg p-4 text-sm">
                    <span className="text-olive font-medium">Izabrano: {selected.length}</span>

                    <select
                        className={selectClasses}
                        defaultValue=""
                        onChange={(e) => e.target.value && runBulk({ action: 'status', status: e.target.value })}
                    >
                        <option value="">Promeni status…</option>
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {statusLabels[status]}
                            </option>
                        ))}
                    </select>

                    <select
                        className={selectClasses}
                        defaultValue=""
                        onChange={(e) => e.target.value && runBulk({ action: 'category', category_id: e.target.value })}
                    >
                        <option value="">Promeni kategoriju…</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <Button variant="destructive" size="sm" onClick={bulkDelete}>
                        <Trash2 className="size-4" />
                        Obriši izabrane
                    </Button>

                    <button type="button" onClick={() => setSelected([])} className="text-muted-foreground hover:text-foreground underline">
                        Poništi izbor
                    </button>
                </div>
            )}

            <div className="border-border/70 mt-6 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
                        <tr>
                            <th className="w-10 p-3">
                                <input type="checkbox" aria-label="Izaberi sve" checked={allOnPageSelected} onChange={toggleAll} className="size-4" />
                            </th>
                            <th className="p-3 font-medium">Proizvod</th>
                            <th className="p-3 font-medium">Proizvođač</th>
                            <th className="p-3 font-medium">Cena</th>
                            <th className="p-3 font-medium">Status</th>
                            <th className="w-12 p-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-border/70 divide-y">
                        {products.data.map((product) => (
                            <tr key={product.id} className={selected.includes(product.id) ? 'bg-olive-soft/40' : undefined}>
                                <td className="p-3">
                                    <input
                                        type="checkbox"
                                        aria-label={`Izaberi ${product.name}`}
                                        checked={selected.includes(product.id)}
                                        onChange={() => toggle(product.id)}
                                        className="size-4"
                                    />
                                </td>
                                <td className="p-3">
                                    <p className="font-medium break-words">{product.name}</p>
                                    <p className="text-muted-foreground text-xs">{product.category?.name}</p>
                                </td>
                                <td className="text-muted-foreground p-3 break-words">{product.producer?.name ?? 'Arhiviran proizvođač'}</td>
                                <td className="p-3 whitespace-nowrap">{formatPrice(product.price)}</td>
                                <td className="p-3">
                                    <span className="bg-muted rounded-full px-2 py-1 text-xs whitespace-nowrap">{statusLabels[product.status]}</span>
                                </td>
                                <td className="p-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Obriši ${product.name}`}
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                            if (confirm(`Obrisati "${product.name}"?`)) {
                                                router.delete(route('admin.products.destroy', product.id), { preserveScroll: true });
                                            }
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {products.data.length === 0 && <p className="text-muted-foreground p-8 text-center text-sm">Nema proizvoda za ove filtere.</p>}
            </div>

            <Pagination meta={products} />
        </AdminLayout>
    );
}
