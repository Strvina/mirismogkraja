import Head from '@/components/head';
import ShareButtons from '@/components/marketplace/share-buttons';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Gift } from 'lucide-react';

interface ReferralRow {
    id: number;
    /** The new producer's name, once they have registered one. */
    producer: string | null;
    status: string;
    status_label: string;
    created_at: string;
    rewarded_at: string | null;
}

/** "Preporuči proizvođača": the producer's link, the rules, and who came through it. */
export default function ProducerReferrals({
    producer,
    link,
    referrals,
    rules,
}: {
    producer: Pick<Producer, 'id' | 'name' | 'status'>;
    /** Null until the producer is approved. */
    link: string | null;
    referrals: ReferralRow[];
    rules: { rewardDays: number; maxPerYear: number; windowDays: number; usedThisYear: number };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/preporuke` },
    ];

    const day = (value: string) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Preporuči proizvođača')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Preporuči proizvođača')}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                {t(
                    'Poznajete nekoga ko pravi dobar sir, med ili rakiju? Pošaljite mu svoj link. Kada otvori nalog, registruje proizvođača i mi ga odobrimo, oboje dobijate :days dana Premium članstva.',
                    {
                        days: rules.rewardDays,
                    },
                )}
            </p>

            {link ? (
                <div className="border-border/70 mt-8 max-w-xl rounded-lg border p-5">
                    <p className="flex items-center gap-2 text-sm font-medium">
                        <Gift className="text-primary size-4" aria-hidden />
                        {t('Vaš link za preporuku')}
                    </p>
                    <p className="bg-muted/60 mt-3 rounded-md px-3 py-2 text-sm break-all select-all">{link}</p>
                    <ShareButtons
                        url={link}
                        title={t('Pridruži se sajtu Vrelina juga — preko ovog linka oboje dobijamo mesec dana Premium članstva')}
                        className="mt-4"
                    />
                </div>
            ) : (
                <p className="text-muted-foreground mt-8 text-sm">{t('Link za preporuku dobijate kada vaš proizvođač bude odobren.')}</p>
            )}

            <section className="mt-10 max-w-xl">
                <h2 className="font-serif text-2xl">{t('Kako se računa')}</h2>
                <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6">
                    <li>{t('Važi za nove naloge: onaj koga preporučujete treba da se registruje preko vašeg linka.')}</li>
                    <li>
                        {t('Nagrada stiže kada njegov prvi proizvođač bude odobren, najkasnije :days dana od registracije.', {
                            days: rules.windowDays,
                        })}
                    </li>
                    <li>{t('Najviše :max nagrada godišnje. Do sada ove godine: :used.', { max: rules.maxPerYear, used: rules.usedThisYear })}</li>
                    <li>{t('Mesec se dodaje na članarinu koju već imate, ne umesto nje.')}</li>
                    <li>{t('Preporuka samom sebi, sa drugim nalogom, ne donosi nagradu.')}</li>
                </ul>
            </section>

            <section className="mt-10 max-w-2xl">
                <h2 className="font-serif text-2xl">{t('Ko je došao preko vašeg linka')}</h2>
                {referrals.length === 0 ? (
                    <p className="text-muted-foreground mt-3 text-sm">{t('Još niko. Pošaljite link nekome ko bi se uklopio ovde.')}</p>
                ) : (
                    <ul className="divide-border/70 mt-3 divide-y">
                        {referrals.map((referral) => (
                            <li key={referral.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium break-words">{referral.producer ?? t('Novi nalog, još bez proizvođača')}</p>
                                    <p className="text-muted-foreground text-xs">{t('Registrovan :date', { date: day(referral.created_at) })}</p>
                                </div>
                                <span
                                    className={cn(
                                        'rounded-full px-2.5 py-1 text-xs',
                                        referral.status === 'rewarded' ? 'bg-olive-soft text-olive' : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {referral.status_label}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </MarketplaceLayout>
    );
}
