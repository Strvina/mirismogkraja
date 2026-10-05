import ShareButtons from '@/components/marketplace/share-buttons';
import ProducerMoreMenu from '@/components/producer-more-menu';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Clock } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: tx('Moji proizvođači'), href: '/moji-proizvodjaci' }];

const statusLabels: Record<Producer['status'], string> = {
    pending: tx('Na čekanju odobrenja'),
    active: tx('Aktivno'),
    blocked: tx('Blokirano'),
};

interface Completeness {
    percent: number;
    missing: { key: string; label: string; href: string }[];
}

interface PendingChange {
    id: number;
    producer_id: number;
    field: string;
    requested_value: string;
}

export default function ProducersIndex({
    producers,
    pendingChanges,
}: {
    producers: (Producer & { completeness: Completeness })[];
    pendingChanges: PendingChange[];
}) {
    const destroy = async (producer: Producer) => {
        if (
            await ask({
                title: t('Obrisati proizvođača „:name”?', { name: producer.name }),
                description: t('Stranica proizvođača i njegovi proizvodi više neće biti vidljivi na sajtu.'),
                tone: 'danger',
            })
        ) {
            router.delete(route('producers.destroy', producer.id));
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Moji proizvođači')} />

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h1 className="font-serif text-4xl sm:text-5xl">{t('Moji proizvođači')}</h1>
                    <Button asChild>
                        <Link href={route('producers.create')}>{t('Novi proizvođač')}</Link>
                    </Button>
                </div>

                {producers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('Još uvek nemaš registrovanog proizvođača.')}</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {producers.map((producer) => (
                            <div key={producer.id} className="rounded-xl border p-4">
                                {producer.cover_image_path && (
                                    <img src={thumbUrl(producer.cover_image_path)} alt="" className="mb-3 h-32 w-full rounded-md object-cover" />
                                )}
                                <div className="flex items-start justify-between">
                                    <h2 className="font-serif text-lg">{producer.name}</h2>
                                    <span className="bg-muted rounded-full px-2 py-1 text-xs">{t(statusLabels[producer.status])}</span>
                                </div>
                                {producer.city && <p className="text-muted-foreground mt-1 text-sm">{producer.city}</p>}

                                {/* A rename of a published producer waits for
                                    an admin, so say so rather than letting the
                                    unchanged name look like a failed save. */}
                                {pendingChanges
                                    .filter((change) => change.producer_id === producer.id)
                                    .map((change) => (
                                        <p key={change.id} className="text-muted-foreground mt-3 flex items-start gap-1.5 text-xs">
                                            <Clock className="mt-0.5 size-3.5 shrink-0" />
                                            {t('Novi naziv „:name” čeka odobrenje. Do tada ostaje dosadašnji.', { name: change.requested_value })}
                                        </p>
                                    ))}
                                {producer.completeness.missing.length > 0 && (
                                    <div className="bg-muted/40 mt-4 rounded-lg p-3">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="font-medium">
                                                {t('Profil je popunjen :percent%', { percent: producer.completeness.percent })}
                                            </span>
                                        </div>
                                        <div
                                            className="bg-border mt-2 h-1.5 overflow-hidden rounded-full"
                                            role="progressbar"
                                            aria-valuenow={producer.completeness.percent}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        >
                                            <div className="bg-primary h-full rounded-full" style={{ width: `${producer.completeness.percent}%` }} />
                                        </div>
                                        <p className="text-muted-foreground mt-2 text-xs">
                                            {t('Kupci češće pišu proizvođačima sa potpunim profilom. Još nedostaje:')}
                                        </p>
                                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                            {producer.completeness.missing.map((item) => (
                                                <li key={item.key}>
                                                    <Link
                                                        href={item.href}
                                                        className="border-border hover:border-primary/40 hover:text-foreground text-muted-foreground inline-block rounded-full border px-2.5 py-0.5 text-xs transition-colors"
                                                    >
                                                        + {item.label}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* The price list has an address once the producer is public. */}
                                {producer.status === 'active' && (
                                    <div className="border-border/70 mt-4 rounded-lg border border-dashed p-3">
                                        <p className="text-sm font-medium">{t('Vaš katalog za deljenje')}</p>
                                        <p className="text-muted-foreground mt-1 text-xs leading-5">
                                            {t(
                                                'Jedan link sa svim proizvodima i cenama. Pošaljite ga kupcima u Viber grupi, porukom ili na WhatsApp-u.',
                                            )}
                                        </p>
                                        <a
                                            href={route('marketplace.catalog', producer.slug)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary mt-2 block text-xs font-medium break-all underline underline-offset-2"
                                        >
                                            {route('marketplace.catalog', producer.slug)}
                                        </a>
                                        <ShareButtons
                                            url={route('marketplace.catalog', producer.slug)}
                                            title={t(':name — ponuda i cene', { name: producer.name })}
                                            className="mt-3"
                                        />
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('producers.edit', producer.id)}>{t('Izmeni')}</Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('producers.products.index', producer.id)}>{t('Proizvodi')}</Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('producers.statistics', producer.id)}>{t('Statistika')}</Link>
                                    </Button>
                                    <ProducerMoreMenu producer={producer} />
                                    <Button variant="destructive" size="sm" onClick={() => destroy(producer)}>
                                        {t('Obriši')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MarketplaceLayout>
    );
}
