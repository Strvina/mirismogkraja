import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Kategorije', href: '/admin/kategorije' },
];

type CategoryWithParent = Category & { parent?: Category | null };

export default function AdminCategoriesIndex({ categories }: { categories: CategoryWithParent[] }) {
    const { data, setData, post, processing, reset } = useForm({ name: '', parent_id: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.categories.store'), { onSuccess: () => reset() });
    };

    const destroy = (category: Category) => {
        if (confirm(`Obrisati kategoriju "${category.name}"?`)) {
            router.delete(route('admin.categories.destroy', category.id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kategorije" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Kategorije</h1>

                <form onSubmit={submit} className="flex max-w-md items-end gap-2">
                    <div className="flex-1">
                        <Input placeholder="Nova kategorija" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </div>
                    <select
                        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        value={data.parent_id}
                        onChange={(e) => setData('parent_id', e.target.value)}
                    >
                        <option value="">Bez roditelja</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <Button disabled={processing}>Dodaj</Button>
                </form>

                <div className="space-y-2">
                    {categories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between rounded-xl border p-4">
                            <div>
                                <p className="font-medium">{category.name}</p>
                                {category.parent && <p className="text-muted-foreground text-xs">Podkategorija: {category.parent.name}</p>}
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => destroy(category)}>
                                Obriši
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
