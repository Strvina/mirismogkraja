import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { t } from '@/lib/i18n';
import { type Category } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type AdminCategory = Category & { parent?: Category | null; products_count: number };

export default function AdminCategoriesIndex({ categories }: { categories: AdminCategory[] }) {
    const { data, setData, post, processing, reset, errors } = useForm({ name: '', parent_id: '' });
    // A refused delete comes back as an error on the page, not on this form.
    const deleteError = usePage<{ errors: Record<string, string> }>().props.errors.category;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.categories.store'), { onSuccess: () => reset() });
    };

    const destroy = (category: Category) => {
        if (confirm(t('Obrisati kategoriju „:name”?', { name: category.name }))) {
            router.delete(route('admin.categories.destroy', category.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout title={t('Kategorije')}>
            <Head title={t('Kategorije')} />

            <div className="flex flex-col gap-4">
                <form onSubmit={submit} className="flex max-w-md flex-col gap-1">
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <Input
                                aria-label={t('Naziv nove kategorije')}
                                placeholder={t('Nova kategorija')}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                        </div>
                        <select
                            aria-label={t('Nadređena kategorija')}
                            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                            value={data.parent_id}
                            onChange={(e) => setData('parent_id', e.target.value)}
                        >
                            <option value="">{t('Bez roditelja')}</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <Button disabled={processing}>{t('Dodaj')}</Button>
                    </div>
                    <InputError message={errors.name ?? errors.parent_id} />
                </form>

                <InputError message={deleteError} />

                <div className="space-y-2">
                    {categories.map((category) => (
                        <div key={category.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4">
                            <div>
                                <p className="font-medium">{category.name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {category.parent && <>Podkategorija: {category.parent.name} · </>}
                                    Proizvoda: {category.products_count}
                                </p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => destroy(category)}>
                                {t('Obriši')}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
