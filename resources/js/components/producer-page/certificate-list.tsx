import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { ShieldCheck } from 'lucide-react';

export interface PublicCertificate {
    id: number;
    type: string;
    /** The kind of document, already in the reader's language. */
    type_label: string;
    title: string;
    issuer: string | null;
    expires_on: string | null;
}

/**
 * What the producer can show a document for. Each line is here because an
 * admin opened that document; the document itself stays private.
 */
export default function CertificateList({ certificates }: { certificates: PublicCertificate[] }) {
    if (certificates.length === 0) {
        return null;
    }

    return (
        <section className="mt-12 max-w-2xl">
            <h2 className="font-serif text-2xl">{t('Sertifikati i priznanja')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('Za svaki smo videli dokument koji ga potvrđuje.')}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {certificates.map((certificate) => (
                    <li key={certificate.id} className="border-border/70 flex gap-3 rounded-lg border p-4 text-sm">
                        <ShieldCheck className="text-olive mt-0.5 size-5 shrink-0" aria-hidden />
                        <div className="min-w-0">
                            <p className="font-medium break-words">{certificate.title}</p>
                            <p className="text-muted-foreground mt-0.5 text-xs">{certificate.type_label}</p>
                            {certificate.issuer && (
                                <p className="text-muted-foreground mt-1 text-xs break-words">
                                    {t('Izdao: :issuer', { issuer: certificate.issuer })}
                                </p>
                            )}
                            {certificate.expires_on && (
                                <p className="text-muted-foreground mt-0.5 text-xs">
                                    {t('Važi do :date', {
                                        date: formatDate(certificate.expires_on, { day: 'numeric', month: 'long', year: 'numeric' }),
                                    })}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
