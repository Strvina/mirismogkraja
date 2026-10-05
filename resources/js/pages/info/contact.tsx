import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';

/**
 * How to reach the people behind the site. An address rather than a form: a
 * form needs somewhere to store what arrives and something to keep robots
 * out, and a mail client already does both.
 */
export default function Contact() {
    const { contactEmail } = usePage<SharedData>().props;

    return (
        <MarketplaceLayout>
            <Head title={t('Kontakt | Vrelina juga')} />

            <div className="max-w-2xl">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Kontakt')}</h1>
                <p className="text-muted-foreground mt-4 leading-7">
                    {t('Pitanja, predlozi, pomoć oko naloga ili stranice proizvođača — pišite nam, odgovaramo u roku od dva radna dana.')}
                </p>

                <a
                    href={`mailto:${contactEmail}`}
                    className="border-border/70 hover:border-border mt-8 inline-flex items-center gap-3 rounded-lg border px-5 py-4 transition-shadow hover:shadow-lg"
                >
                    <span className="bg-olive-soft text-olive grid size-10 place-items-center rounded-full">
                        <Mail className="size-4" aria-hidden />
                    </span>
                    <span className="font-serif text-xl">{contactEmail}</span>
                </a>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">{t('Pre nego što pišete')}</h2>
                    <ul className="text-muted-foreground list-disc space-y-2 pl-5">
                        <li>{t('Za pitanje o proizvodu, ceni ili dostavi pišite proizvođaču sa stranice proizvoda — mi te podatke nemamo.')}</li>
                        <li>{t('Za neprimeren sadržaj ili prevaru koristite dugme „Prijavi problem“ na toj stranici; tako prijava stiže brže.')}</li>
                        <li>
                            {t('Odgovor na najčešća pitanja možda već postoji:')}{' '}
                            <Link href={route('info.faq')} className="text-foreground underline underline-offset-4">
                                {t('Česta pitanja')}
                            </Link>
                            .
                        </li>
                    </ul>
                </section>
            </div>
        </MarketplaceLayout>
    );
}
