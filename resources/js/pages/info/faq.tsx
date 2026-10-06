import Head from '@/components/head';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

interface FaqGroup {
    title: string;
    items: { question: string; answer: string }[];
}

/**
 * Questions and answers, already in the reader's language: the server sends
 * them because it also writes them into the page as FAQPage data.
 *
 * Native <details>, so every answer is in the HTML and opens without any
 * script.
 */
export default function Faq({ groups }: { groups: FaqGroup[] }) {
    return (
        <MarketplaceLayout>
            <Head title={t('Česta pitanja | Vrelina juga')} />

            <div className="max-w-2xl">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Česta pitanja')}</h1>

                {groups.map((group) => (
                    <section key={group.title} className="mt-10">
                        <h2 className="font-serif text-2xl">{group.title}</h2>
                        <div className="border-border/70 mt-4 border-t">
                            {group.items.map((item) => (
                                <details key={item.question} className="group border-border/70 border-b">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                                        {item.question}
                                        <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <p className="text-muted-foreground pb-5 leading-7">{item.answer}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                ))}

                <p className="text-muted-foreground mt-10 text-sm leading-6">
                    {t('Niste našli odgovor?')}{' '}
                    <Link href={route('info.contact')} className="text-foreground underline underline-offset-4">
                        {t('Pišite nam')}
                    </Link>
                    .
                </p>
            </div>
        </MarketplaceLayout>
    );
}
