import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { router } from '@inertiajs/react';
import { Flag } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

/**
 * "Prijavi problem" (task 21).
 *
 * The platform is not a party to the deal, so a buyer who is cheated or
 * ignored has no other way to reach anyone - and without one, their only
 * lever is a public review, which punishes before anybody has looked. The
 * reasons are a fixed list so the form is a report rather than an open
 * channel; the free text is optional and secondary.
 */
export default function ReportButton({
    type,
    id,
    reasons,
    label = 'Prijavi problem',
}: {
    /** Morph alias, not a class name: 'household' | 'product' | 'user'. */
    type: string;
    id: number;
    reasons: Record<string, string>;
    label?: string;
}) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(Object.keys(reasons)[0] ?? '');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        setSending(true);

        router.post(
            route('reports.store'),
            { reportable_type: type, reportable_id: id, reason, message },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpen(false);
                    setMessage('');
                },
                onFinish: () => setSending(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Flag className="size-4" />
                    {label}
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogTitle>Prijavi problem</DialogTitle>
                <DialogDescription>Prijava ide našem timu, a ne proizvođaču. Nećemo je javno objaviti.</DialogDescription>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-1.5">
                        <label htmlFor="report-reason" className="text-muted-foreground text-xs">
                            Šta se desilo?
                        </label>
                        <select
                            id="report-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                        >
                            {Object.entries(reasons).map(([value, text]) => (
                                <option key={value} value={value}>
                                    {text}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-1.5">
                        <label htmlFor="report-message" className="text-muted-foreground text-xs">
                            Možete dodati detalje (nije obavezno)
                        </label>
                        <textarea
                            id="report-message"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            maxLength={1000}
                            className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                            Odustani
                        </Button>
                        <Button size="sm" disabled={sending}>
                            Pošalji prijavu
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
