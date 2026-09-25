import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { type Producer } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { BadgeCheck, Ban, Check, Pencil, RotateCcw } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type AdminProducer = Producer & { user: { id: number; name: string; email: string }; products_count: number };

const statusLabels: Record<Producer['status'], string> = {
    pending: 'Na čekanju',
    active: 'Odobren',
    blocked: 'Blokiran',
};

const statusClasses: Record<Producer['status'], string> = {
    pending: 'bg-gold/15 text-foreground',
    active: 'bg-olive-soft text-olive',
    blocked: 'bg-destructive/10 text-destructive',
};

function EditForm({ producer, onDone }: { producer: AdminProducer; onDone: () => void }) {
    const { data, setData, put, processing, errors } = useForm({
        name: producer.name,
        city: producer.city ?? '',
        phone: producer.phone ?? '',
        contact_email: producer.contact_email ?? '',
        description: producer.description ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.producers.update', producer.id), { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form onSubmit={submit} className="bg-muted/40 mt-4 grid gap-4 rounded-lg p-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
                <Label htmlFor={`name-${producer.id}`}>Naziv</Label>
                <Input id={`name-${producer.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={`city-${producer.id}`}>Grad</Label>
                <Input id={`city-${producer.id}`} value={data.city} onChange={(e) => setData('city', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={`phone-${producer.id}`}>Telefon</Label>
                <Input id={`phone-${producer.id}`} value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={`email-${producer.id}`}>Email</Label>
                <Input id={`email-${producer.id}`} value={data.contact_email} onChange={(e) => setData('contact_email', e.target.value)} />
                {errors.contact_email && <p className="text-destructive text-xs">{errors.contact_email}</p>}
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`description-${producer.id}`}>Opis</Label>
                <textarea
                    id={`description-${producer.id}`}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    className="border-input bg-background min-h-24 rounded-md border px-3 py-2 text-sm"
                />
            </div>
            <div className="flex gap-2 sm:col-span-2">
                <Button size="sm" disabled={processing}>
                    Sačuvaj
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={onDone}>
                    Otkaži
                </Button>
            </div>
        </form>
    );
}

export default function AdminProducersIndex({
    producers,
    pendingCount,
    filters,
}: {
    producers: Paginated<AdminProducer>;
    pendingCount: number;
    filters: { status?: string };
}) {
    const [editing, setEditing] = useState<number | null>(null);

    const setStatus = (producer: AdminProducer, status: Producer['status']) => {
        router.patch(route('admin.producers.status', producer.id), { status }, { preserveScroll: true });
    };

    // Verification is a separate judgement from approval: approving puts a
    // producer on the site, verifying says an admin checked who they are.
    const setVerified = (producer: AdminProducer, verified: boolean) => {
        router.patch(route('admin.producers.verify', producer.id), { verified }, { preserveScroll: true });
    };

    const filter = (status?: string) => {
        router.get('/admin/proizvodjaci', status ? { status } : {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <AdminLayout title="Proizvođači">
            <Head title="Proizvođači — Admin" />

            {pendingCount > 0 && (
                <p className="bg-gold/15 rounded-lg px-4 py-3 text-sm">
                    {pendingCount === 1 ? '1 zahtev čeka' : `${pendingCount} zahteva čeka`} na odobrenje.
                </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                {[
                    { value: undefined, label: 'Svi' },
                    { value: 'pending', label: 'Na čekanju' },
                    { value: 'active', label: 'Odobreni' },
                    { value: 'blocked', label: 'Blokirani' },
                ].map((option) => (
                    <button
                        key={option.label}
                        type="button"
                        onClick={() => filter(option.value)}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                            (filters.status ?? undefined) === option.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="mt-6 space-y-3">
                {producers.data.map((producer) => (
                    <div key={producer.id} className="border-border/70 rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium break-words">{producer.name}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[producer.status]}`}>
                                        {statusLabels[producer.status]}
                                    </span>
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs break-words">
                                    {producer.user.name} · {producer.user.email} · {producer.products_count} proizvoda
                                    {producer.city ? ` · ${producer.city}` : ''}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {producer.status === 'pending' && (
                                    <Button size="sm" onClick={() => setStatus(producer, 'active')}>
                                        <Check className="size-4" />
                                        Odobri
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => setEditing(editing === producer.id ? null : producer.id)}>
                                    <Pencil className="size-4" />
                                    Izmeni
                                </Button>
                                <Button
                                    size="sm"
                                    variant={producer.verified_at ? 'secondary' : 'outline'}
                                    onClick={() => setVerified(producer, !producer.verified_at)}
                                >
                                    <BadgeCheck className="size-4" />
                                    {producer.verified_at ? 'Skini oznaku' : 'Označi kao provereno'}
                                </Button>
                                {producer.status !== 'blocked' ? (
                                    <Button variant="destructive" size="sm" onClick={() => setStatus(producer, 'blocked')}>
                                        <Ban className="size-4" />
                                        {producer.status === 'pending' ? 'Odbij' : 'Blokiraj'}
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => setStatus(producer, 'active')}>
                                        <RotateCcw className="size-4" />
                                        Odblokiraj
                                    </Button>
                                )}
                            </div>
                        </div>

                        {editing === producer.id && <EditForm producer={producer} onDone={() => setEditing(null)} />}
                    </div>
                ))}

                {producers.data.length === 0 && <p className="text-muted-foreground py-8 text-center text-sm">Nema proizvođača za ovaj filter.</p>}
            </div>

            <Pagination meta={producers} />
        </AdminLayout>
    );
}
