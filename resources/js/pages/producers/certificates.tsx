import Head from '@/components/head';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Producer } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Download, Trash2 } from 'lucide-react';
import { type FormEventHandler, useRef } from 'react';

interface Certificate {
    id: number;
    producer_id: number;
    type: string;
    title: string;
    issuer: string | null;
    issued_on: string | null;
    expires_on: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    /** Approved once, but past its date: no longer on the public page. */
    expired: boolean;
    created_at: string;
}

const STATUS_LABELS: Record<Certificate['status'], string> = {
    pending: tx('Čeka proveru'),
    approved: tx('Potvrđen'),
    rejected: tx('Nije prihvaćen'),
};

const STATUS_STYLES: Record<Certificate['status'], string> = {
    pending: 'bg-muted text-muted-foreground',
    approved: 'bg-olive-soft text-olive',
    rejected: 'bg-destructive/10 text-destructive',
};

interface CertificateForm {
    type: string;
    title: string;
    issuer: string;
    issued_on: string;
    expires_on: string;
    file: File | null;
}

/** The owner sends in a document; an admin checks it before it shows on the profile. */
export default function ProducerCertificates({
    producer,
    certificates,
    types,
    limit,
    maxMegabytes,
}: {
    producer: Pick<Producer, 'id' | 'name' | 'slug'>;
    certificates: Certificate[];
    /** Kinds of document, keyed by what is stored, labelled in the reader's language. */
    types: Record<string, string>;
    limit: number;
    maxMegabytes: number;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/sertifikati` },
    ];

    const fileInput = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors, reset, progress } = useForm<CertificateForm>({
        type: Object.keys(types)[0] ?? '',
        title: '',
        issuer: '',
        issued_on: '',
        expires_on: '',
        file: null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('producers.certificates.store', producer.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();

                if (fileInput.current) {
                    fileInput.current.value = '';
                }
            },
        });
    };

    const destroy = async (certificate: Certificate) => {
        if (
            await ask({
                title: t('Obrisati „:name”?', { name: certificate.title }),
                description: t('Dokument se briše sa sajta i sertifikat se više neće prikazivati na profilu.'),
                tone: 'danger',
            })
        ) {
            router.delete(route('producers.certificates.destroy', [producer.id, certificate.id]), { preserveScroll: true });
        }
    };

    const day = (value: string) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Sertifikati')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Sertifikati')}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                {t(
                    'Organska proizvodnja, zaštićeno poreklo, registrovano gazdinstvo, nagrade. Pošaljite dokument, mi ga pregledamo i na vašem profilu se pojavljuje oznaka. Sam dokument vidimo samo mi i vi — kupcima se ne prikazuje.',
                )}
            </p>

            {certificates.length > 0 && (
                <ul className="mt-8 max-w-2xl space-y-3">
                    {certificates.map((certificate) => (
                        <li key={certificate.id} className="rounded-xl border p-4 text-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="font-medium break-words">{certificate.title}</p>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-1 text-xs',
                                        certificate.expired ? STATUS_STYLES.rejected : STATUS_STYLES[certificate.status],
                                    )}
                                >
                                    {certificate.expired ? t('Istekao') : t(STATUS_LABELS[certificate.status])}
                                </span>
                            </div>
                            <p className="text-muted-foreground mt-1">
                                {[
                                    types[certificate.type],
                                    certificate.issuer,
                                    certificate.expires_on && t('Važi do :date', { date: day(certificate.expires_on) }),
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                            {certificate.status === 'rejected' && certificate.rejection_reason && (
                                <p className="text-destructive mt-2 break-words">
                                    {t('Razlog:')} {certificate.rejection_reason}
                                </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button asChild variant="outline" size="sm">
                                    {/* A file, not a page: a plain link so the browser downloads it. */}
                                    <a href={route('producers.certificates.file', [producer.id, certificate.id])}>
                                        <Download className="size-4" />
                                        {t('Preuzmi dokument')}
                                    </a>
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => destroy(certificate)}>
                                    <Trash2 className="size-4" />
                                    {t('Obriši')}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {certificates.length >= limit ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {t('Poslali ste najveći broj dokumenata (:max). Obrišite neki da biste dodali novi.', { max: limit })}
                </p>
            ) : (
                <form onSubmit={submit} className="mt-10 max-w-xl space-y-5">
                    <h2 className="font-serif text-2xl">{t('Pošalji dokument')}</h2>

                    <div className="grid gap-2">
                        <Label htmlFor="certificate-type">{t('Vrsta')}</Label>
                        <select
                            id="certificate-type"
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value)}
                            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        >
                            {Object.entries(types).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.type} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="certificate-title">{t('Naziv, kako će pisati na profilu')}</Label>
                        <Input
                            id="certificate-title"
                            value={data.title}
                            maxLength={120}
                            required
                            placeholder={t('npr. Sertifikat za organsku proizvodnju meda')}
                            onChange={(e) => setData('title', e.target.value)}
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="certificate-issuer">{t('Ko ga je izdao (nije obavezno)')}</Label>
                        <Input id="certificate-issuer" value={data.issuer} maxLength={120} onChange={(e) => setData('issuer', e.target.value)} />
                        <InputError message={errors.issuer} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="certificate-issued">{t('Izdat')}</Label>
                            <Input
                                id="certificate-issued"
                                type="date"
                                value={data.issued_on}
                                onChange={(e) => setData('issued_on', e.target.value)}
                            />
                            <InputError message={errors.issued_on} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="certificate-expires">{t('Važi do')}</Label>
                            <Input
                                id="certificate-expires"
                                type="date"
                                value={data.expires_on}
                                onChange={(e) => setData('expires_on', e.target.value)}
                            />
                            <InputError message={errors.expires_on} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="certificate-file">{t('Dokument')}</Label>
                        <Input
                            id="certificate-file"
                            ref={fileInput}
                            type="file"
                            required
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                        />
                        <p className="text-muted-foreground text-xs">
                            {t('PDF ili fotografija dokumenta, do :size MB. Neka se jasno vide naziv, izdavalac i datum.', { size: maxMegabytes })}
                        </p>
                        <InputError message={errors.file} />
                    </div>

                    <Button disabled={processing}>{progress ? `${t('Šaljem…')} ${progress.percentage ?? 0}%` : t('Pošalji na proveru')}</Button>
                </form>
            )}
        </MarketplaceLayout>
    );
}
