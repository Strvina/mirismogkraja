import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';

export interface PaymentSlip {
    recipient: string;
    recipient_address: string;
    account: string;
    purpose: string;
    payment_code: string;
    model: string;
    reference: string;
    amount: string;
    payer: string;
    /** The NBS IPS QR code - what a banking app reads - as an image, drawn on the server. */
    qr_url: string;
}

/**
 * The payment slip, laid out the way the paper one is.
 *
 * The QR code is the point of it: every banking application in Serbia reads
 * the NBS IPS format, and scanning it fills in the account, amount and
 * reference, which is exactly where a hand-copied slip goes wrong. The
 * payload is built on the server from the same values printed here, so the
 * scanned and the written slip can never disagree.
 *
 * The PDF itself is built on the server, in the layout of the paper form,
 * and arrives as a download. It is not the browser's print dialog: that
 * offers printing as the first option when what a producer wants is a file,
 * and the fonts a browser-side PDF library ships with have no č, ć, š, ž or
 * đ - a producer called Nićić would come out mangled.
 */
export default function PaymentSlipDialog({
    slip,
    downloadUrl,
    open,
    onOpenChange,
}: {
    slip: PaymentSlip;
    downloadUrl: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (value: string) => {
        navigator.clipboard
            .writeText(value)
            .then(() => {
                setCopied(value);
                setTimeout(() => setCopied(null), 2000);
            })
            .catch(() => {});
    };

    const rows: { label: string; value: string; copyable?: boolean }[] = [
        { label: t('Platilac'), value: slip.payer },
        { label: t('Svrha uplate'), value: slip.purpose },
        { label: t('Primalac'), value: [slip.recipient, slip.recipient_address].filter(Boolean).join(', ') },
        { label: t('Šifra plaćanja'), value: slip.payment_code },
        { label: t('Valuta'), value: 'RSD' },
        { label: t('Iznos'), value: slip.amount, copyable: true },
        { label: t('Račun primaoca'), value: slip.account, copyable: true },
        { label: t('Model'), value: slip.model },
        { label: t('Poziv na broj'), value: slip.reference, copyable: true },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>{t('Nalog za uplatu')}</DialogTitle>
                <DialogDescription>
                    {t('Skenirajte QR kod aplikacijom svoje banke i sva polja se popunjavaju sama. Članarinu aktiviramo čim vidimo uplatu.')}
                </DialogDescription>

                <div id="payment-slip" className="border-border/70 mt-2 rounded-lg border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                        <dl className="min-w-0 flex-1 space-y-2.5">
                            {rows.map((row) => (
                                <div key={row.label} className="grid grid-cols-[9rem_1fr] items-start gap-3 text-sm">
                                    <dt className="text-muted-foreground">{row.label}</dt>
                                    <dd className="flex items-start gap-2 font-medium break-words">
                                        {row.value}
                                        {row.copyable && (
                                            <button
                                                type="button"
                                                onClick={() => copy(row.value)}
                                                aria-label={`Kopiraj: ${row.label}`}
                                                className="text-muted-foreground hover:text-foreground print:hidden"
                                            >
                                                {copied === row.value ? <Check className="text-olive size-3.5" /> : <Copy className="size-3.5" />}
                                            </button>
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <figure className="shrink-0 text-center">
                            {/* Fetched only now, when the slip is open. */}
                            <img src={slip.qr_url} alt={t('IPS QR kod za plaćanje')} width={160} height={160} className="bg-muted size-40" />
                            <figcaption className="text-muted-foreground mt-1 text-[0.65rem]">
                                {t('IPS QR — skenirajte u aplikaciji banke')}
                            </figcaption>
                        </figure>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        {t('Zatvori')}
                    </Button>
                    {/* A plain link, so the browser downloads the file the
                        server built rather than rendering the page again. */}
                    <Button asChild size="sm">
                        <a href={downloadUrl} download>
                            <Download className="size-4" />
                            {t('Preuzmi uplatnicu (PDF)')}
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
