import InputError from '@/components/input-error';
import CompactSelect from '@/components/marketplace/compact-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: tx('Tražim'), href: '/trazim' },
    { title: tx('Novi oglas'), href: '/trazim/novi' },
];

/** Writing a "Tražim" ad: what, how much, where - and anything else a producer should know. */
export default function WantedCreate({
    categories,
    city,
    suggestedTitle,
    bodyMax,
    daysOpen,
}: {
    categories: Category[];
    /** The buyer's own town, as a starting point. */
    city: string | null;
    /** What they searched for before coming here, if anything. */
    suggestedTitle: string;
    bodyMax: number;
    daysOpen: number;
}) {
    const { data, setData, post, processing, errors } = useForm({
        title: suggestedTitle,
        category_id: '',
        quantity: '',
        city: city ?? '',
        body: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('wanted.store'));
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Novi oglas')} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Šta tražite?')}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                {t('Oglas je javan :days dana i vidi se samo vaše ime. Proizvođači vam odgovaraju u porukama, a vi birate kome ćete se javiti.', {
                    days: daysOpen,
                })}
            </p>

            <form onSubmit={submit} className="mt-8 max-w-xl space-y-5">
                <div className="grid gap-2">
                    <Label htmlFor="wanted-title">{t('Šta tražite')}</Label>
                    <Input
                        id="wanted-title"
                        value={data.title}
                        maxLength={120}
                        onChange={(e) => setData('title', e.target.value)}
                        placeholder={t('Na primer: Paprika za ajvar, 50 kg')}
                        required
                    />
                    <InputError message={errors.title} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="wanted-category">{t('Kategorija')}</Label>
                        <CompactSelect
                            id="wanted-category"
                            value={data.category_id}
                            onChange={(value) => setData('category_id', value)}
                            options={[
                                { value: '', label: t('Ne znam / nešto drugo') },
                                ...categories.map((category) => ({ value: String(category.id), label: t(category.name) })),
                            ]}
                        />
                        <p className="text-muted-foreground text-xs">{t('Proizvođači iz te kategorije dobijaju obaveštenje o oglasu.')}</p>
                        <InputError message={errors.category_id} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="wanted-quantity">{t('Količina (neobavezno)')}</Label>
                        <Input
                            id="wanted-quantity"
                            value={data.quantity}
                            maxLength={60}
                            onChange={(e) => setData('quantity', e.target.value)}
                            placeholder={t('Na primer: 50 kg')}
                        />
                        <InputError message={errors.quantity} />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="wanted-city">{t('Mesto (neobavezno)')}</Label>
                    <Input
                        id="wanted-city"
                        value={data.city}
                        onChange={(e) => setData('city', e.target.value)}
                        autoComplete="address-level2"
                        className="sm:max-w-xs"
                    />
                    <InputError message={errors.city} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="wanted-body">{t('Opis')}</Label>
                    <textarea
                        id="wanted-body"
                        value={data.body}
                        maxLength={bodyMax}
                        onChange={(e) => setData('body', e.target.value)}
                        placeholder={t('Kada vam treba, da li je bitna dostava, za šta ćete koristiti…')}
                        className="border-input bg-background min-h-32 w-full rounded-md border px-3 py-2 text-sm"
                        required
                    />
                    <p className="text-muted-foreground text-xs">
                        {data.body.length} / {bodyMax}
                    </p>
                    <InputError message={errors.body} />
                </div>

                <Button type="submit" disabled={processing}>
                    {t('Objavi oglas')}
                </Button>
            </form>
        </MarketplaceLayout>
    );
}
