import InputError from '@/components/input-error';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { formatRelativeTime } from '@/lib/format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Campaign {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    starts_on: string;
    ends_on: string;
    price_rsd: number;
    is_active: boolean;
    active_count: number;
    pending_count: number;
}

interface PendingPlace {
    id: number;
    reference: string;
    amount_rsd: number;
    created_at: string;
    campaign: { id: number; name: string } | null;
    producer: { id: number; name: string; slug: string } | null;
}

// A type, not an interface: useForm needs the implicit index signature.
type CampaignForm = {
    name: string;
    description: string;
    starts_on: string;
    ends_on: string;
    price_rsd: number;
    is_active: boolean;
};

const dinars = new Intl.NumberFormat('sr-RS');

function CampaignFields({ campaign, onDone }: { campaign?: Campaign; onDone?: () => void }) {
    const { data, setData, post, put, processing, errors, reset } = useForm<CampaignForm>({
        name: campaign?.name ?? '',
        description: campaign?.description ?? '',
        starts_on: campaign?.starts_on ?? '',
        ends_on: campaign?.ends_on ?? '',
        price_rsd: campaign?.price_rsd ?? 1990,
        is_active: campaign?.is_active ?? false,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                if (!campaign) {
                    reset();
                }
                onDone?.();
            },
        };

        if (campaign) {
            put(route('admin.campaigns.update', campaign.id), options);
        } else {
            post(route('admin.campaigns.store'), options);
        }
    };

    const id = (field: string) => `campaign-${campaign?.id ?? 'new'}-${field}`;

    return (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={id('name')}>Naziv</Label>
                <Input id={id('name')} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ajvar sezona" />
                <InputError message={errors.name} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={id('description')}>Opis</Label>
                <textarea
                    id={id('description')}
                    rows={3}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                />
                <InputError message={errors.description} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={id('starts')}>Počinje</Label>
                <Input id={id('starts')} type="date" value={data.starts_on} onChange={(e) => setData('starts_on', e.target.value)} />
                <InputError message={errors.starts_on} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={id('ends')}>Završava se</Label>
                <Input id={id('ends')} type="date" value={data.ends_on} onChange={(e) => setData('ends_on', e.target.value)} />
                <InputError message={errors.ends_on} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={id('price')}>Cena učešća (RSD)</Label>
                <Input id={id('price')} type="number" min={0} value={data.price_rsd} onChange={(e) => setData('price_rsd', Number(e.target.value))} />
                <InputError message={errors.price_rsd} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                Objavljena (vidljiva proizvođačima i na sajtu)
            </label>
            <div className="sm:col-span-2">
                <Button disabled={processing}>{campaign ? 'Sačuvaj izmene' : 'Napravi kampanju'}</Button>
            </div>
        </form>
    );
}

export default function AdminCampaigns({ campaigns, pending }: { campaigns: Paginated<Campaign>; pending: PendingPlace[] }) {
    const [editing, setEditing] = useState<number | null>(null);

    const confirm = (place: PendingPlace) => router.patch(route('admin.campaigns.confirm', place.id), {}, { preserveScroll: true });
    const cancel = (place: PendingPlace) => router.patch(route('admin.campaigns.cancel', place.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title="Kampanje">
            <Head title="Kampanje" />

            <section>
                <h2 className="font-serif text-2xl">Prijave koje čekaju uplatu</h2>
                {pending.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Nema prijava na čekanju.</p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {pending.map((place) => (
                            <div key={place.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium break-words">
                                        {place.producer?.name ?? 'Obrisan proizvođač'} · {place.campaign?.name}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Poziv na broj <span className="text-foreground font-medium">{place.reference}</span> ·{' '}
                                        {dinars.format(place.amount_rsd)} RSD · zatraženo {formatRelativeTime(place.created_at)}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button size="sm" onClick={() => confirm(place)}>
                                        <Check className="size-4" />
                                        Uplata primljena
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => cancel(place)}>
                                        <X className="size-4" />
                                        Otkaži
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-12">
                <h2 className="font-serif text-2xl">Nova kampanja</h2>
                <div className="mt-4 max-w-2xl">
                    <CampaignFields />
                </div>
            </section>

            <section className="mt-12">
                <h2 className="font-serif text-2xl">Sve kampanje</h2>
                {campaigns.data.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Još nema kampanja.</p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {campaigns.data.map((campaign) => (
                            <div key={campaign.id} className="rounded-xl border p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium break-words">
                                            {campaign.name}{' '}
                                            {!campaign.is_active && (
                                                <span className="text-muted-foreground text-xs font-normal">(nije objavljena)</span>
                                            )}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            {new Date(campaign.starts_on).toLocaleDateString('sr-RS')} –{' '}
                                            {new Date(campaign.ends_on).toLocaleDateString('sr-RS')} · {dinars.format(campaign.price_rsd)} RSD ·
                                            učestvuje {campaign.active_count}, čeka {campaign.pending_count}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {campaign.is_active && (
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={route('campaigns.show', campaign.slug)}>Stranica</Link>
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => setEditing(editing === campaign.id ? null : campaign.id)}>
                                            {editing === campaign.id ? 'Zatvori' : 'Izmeni'}
                                        </Button>
                                    </div>
                                </div>
                                {editing === campaign.id && (
                                    <div className="mt-4 max-w-2xl">
                                        <CampaignFields campaign={campaign} onDone={() => setEditing(null)} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <Pagination meta={campaigns} />
            </section>
        </AdminLayout>
    );
}
