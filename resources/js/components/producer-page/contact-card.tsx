import { t } from '@/lib/i18n';
import { mobileNumberForApps, trackContact } from '@/lib/statistics';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { type PublicProducer } from './types';

/**
 * Phone, e-mail and address. The number is fetched only on "Prikaži broj"
 * (a partial reload), so it is never in the page's HTML for a scraper, and
 * each reveal or click is counted in the producer's statistics.
 */
export default function ContactCard({
    producer,
    phone,
}: {
    producer: Pick<PublicProducer, 'id' | 'has_phone' | 'contact_email' | 'address'>;
    phone?: string | null;
}) {
    const [loading, setLoading] = useState(false);
    // Viber and WhatsApp open a chat with a mobile number, so they are only
    // offered when the number is one.
    const mobile = phone ? mobileNumberForApps(phone) : null;

    if (!producer.has_phone && !producer.contact_email && !producer.address) {
        return null;
    }

    const reveal = () => {
        trackContact(producer.id, 'phone_reveal');
        router.reload({ only: ['phone'], onStart: () => setLoading(true), onFinish: () => setLoading(false) });
    };

    return (
        <div className="border-border/70 mt-6 grid gap-4 rounded-lg border p-5 text-sm sm:grid-cols-3">
            {producer.has_phone && (
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">{t('Telefon')}</p>
                    {phone ? (
                        <>
                            <a href={`tel:${phone}`} className="font-medium break-words">
                                {phone}
                            </a>
                            {mobile && (
                                <span className="mt-1 flex gap-3 text-xs">
                                    <a
                                        href={`viber://chat?number=%2B${mobile}`}
                                        onClick={() => trackContact(producer.id, 'viber_click')}
                                        className="text-primary font-semibold underline"
                                    >
                                        Viber
                                    </a>
                                    <a
                                        href={`https://wa.me/${mobile}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => trackContact(producer.id, 'whatsapp_click')}
                                        className="text-primary font-semibold underline"
                                    >
                                        WhatsApp
                                    </a>
                                </span>
                            )}
                        </>
                    ) : (
                        <button type="button" onClick={reveal} disabled={loading} className="text-primary font-medium underline disabled:opacity-60">
                            {loading ? t('Učitavanje…') : t('Prikaži broj')}
                        </button>
                    )}
                </div>
            )}
            {producer.contact_email && (
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">{t('Email')}</p>
                    <a
                        href={`mailto:${producer.contact_email}`}
                        onClick={() => trackContact(producer.id, 'email_click')}
                        className="font-medium break-all"
                    >
                        {producer.contact_email}
                    </a>
                </div>
            )}
            {producer.address && (
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">{t('Adresa')}</p>
                    <p className="font-medium break-words">{producer.address}</p>
                </div>
            )}
        </div>
    );
}
