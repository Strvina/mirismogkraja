import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { ask } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type Category } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type AdminCategory = Category & {
    slug: string;
    /** The category as people search for it ("Domaći ajvar"); titles its page. */
    search_name: string | null;
    /** The paragraph at the top of its page. */
    intro: string | null;
    products_count: number;
};

const selectClass = 'border-input bg-background rounded-md border px-3 py-2 text-sm';

/** The categories arrive in tree order: each subcategory right under its parent. */
export default function AdminCategoriesIndex({ categories }: { categories: AdminCategory[] }) {
    const { data, setData, post, processing, reset, errors } = useForm({ name: '', parent_id: '' });
    const [editing, setEditing] = useState<number | null>(null);
    // A refused delete comes back as an error on the page, not on this form.
    const deleteError = usePage<{ errors: Record<string, string> }>().props.errors.category;

    // Two levels and no deeper: only a top-level category can be a parent.
    const roots = categories.filter((category) => !category.parent_id);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.categories.store'), { onSuccess: () => reset() });
    };

    const destroy = async (category: Category) => {
        if (
            await ask({
                title: t('Obrisati kategoriju „:name”?', { name: category.name }),
                description: t('Ova radnja se ne može poništiti.'),
                tone: 'danger',
            })
        ) {
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
                            className={selectClass}
                            value={data.parent_id}
                            onChange={(e) => setData('parent_id', e.target.value)}
                        >
                            <option value="">{t('Bez roditelja')}</option>
                            {roots.map((c) => (
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
                        <div key={category.id} className={cn('rounded-xl border p-4', category.parent_id && 'ml-6')}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="font-medium">{category.name}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {category.search_name && <>{category.search_name} · </>}/kategorija/{category.slug} ·{' '}
                                        {t('Proizvoda: :count', { count: category.products_count })}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditing(editing === category.id ? null : category.id)}
                                        aria-expanded={editing === category.id}
                                    >
                                        {t('Izmeni')}
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => destroy(category)}>
                                        {t('Obriši')}
                                    </Button>
                                </div>
                            </div>

                            {editing === category.id && (
                                <EditCategory
                                    category={category}
                                    // A category with subcategories of its own stays at the top.
                                    parents={
                                        categories.some((other) => other.parent_id === category.id)
                                            ? []
                                            : roots.filter((root) => root.id !== category.id)
                                    }
                                    onDone={() => setEditing(null)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}

function EditCategory({ category, parents, onDone }: { category: AdminCategory; parents: AdminCategory[]; onDone: () => void }) {
    const { data, setData, put, processing, errors } = useForm({
        name: category.name,
        parent_id: category.parent_id ? String(category.parent_id) : '',
        search_name: category.search_name ?? '',
        intro: category.intro ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.categories.update', category.id), { preserveScroll: true, onSuccess: onDone });
    };

    const id = (field: string) => `category-${category.id}-${field}`;

    return (
        <form onSubmit={submit} className="mt-4 grid max-w-xl gap-4 border-t pt-4">
            <div className="grid gap-2">
                <Label htmlFor={id('name')}>{t('Naziv')}</Label>
                <Input id={id('name')} value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <p className="text-muted-foreground text-xs">{t('Adresa stranice ostaje ista i kad se naziv promeni.')}</p>
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={id('search')}>{t('Naziv za pretraživače')}</Label>
                <Input
                    id={id('search')}
                    value={data.search_name}
                    onChange={(e) => setData('search_name', e.target.value)}
                    placeholder={t('npr. Domaći ajvar')}
                />
                <p className="text-muted-foreground text-xs">
                    {t('Onako kako ljudi kucaju u pretrazi. Stoji u naslovu stranice kategorije; bez njega, tu je sam naziv.')}
                </p>
                <InputError message={errors.search_name} />
            </div>

            {parents.length > 0 && (
                <div className="grid gap-2">
                    <Label htmlFor={id('parent')}>{t('Nadređena kategorija')}</Label>
                    <select id={id('parent')} className={selectClass} value={data.parent_id} onChange={(e) => setData('parent_id', e.target.value)}>
                        <option value="">{t('Bez roditelja')}</option>
                        {parents.map((parent) => (
                            <option key={parent.id} value={parent.id}>
                                {parent.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.parent_id} />
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor={id('intro')}>{t('Uvodni tekst')}</Label>
                <textarea
                    id={id('intro')}
                    rows={3}
                    maxLength={1000}
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    value={data.intro}
                    onChange={(e) => setData('intro', e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                    {t('Pasus na vrhu stranice kategorije, i njen opis u rezultatima pretrage. Nije obavezan.')}
                </p>
                <InputError message={errors.intro} />
            </div>

            <div className="flex gap-2">
                <Button disabled={processing}>{t('Sačuvaj')}</Button>
                <Button type="button" variant="outline" onClick={onDone}>
                    {t('Otkaži')}
                </Button>
            </div>
        </form>
    );
}
