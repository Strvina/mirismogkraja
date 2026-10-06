import Head from '@/components/head';
import InputError from '@/components/input-error';
import { type QuickReply } from '@/components/messages/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Producer } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

/** The answers a producer keeps ready for the message box. */
export default function QuickReplies({
    producer,
    replies,
    limit,
    bodyMax,
}: {
    producer: Pick<Producer, 'id' | 'name'>;
    replies: QuickReply[];
    limit: number;
    bodyMax: number;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/brzi-odgovori` },
    ];

    // The one form adds an answer or, after "Izmeni", rewrites one.
    const [editing, setEditing] = useState<QuickReply | null>(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({ title: '', body: '' });
    const full = replies.length >= limit && !editing;

    const startEditing = (reply: QuickReply) => {
        clearErrors();
        setEditing(reply);
        setData({ title: reply.title, body: reply.body });
    };

    const stopEditing = () => {
        clearErrors();
        setEditing(null);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: stopEditing };

        if (editing) {
            put(route('producers.quick-replies.update', [producer.id, editing.id]), options);
        } else {
            post(route('producers.quick-replies.store', producer.id), options);
        }
    };

    const destroy = async (reply: QuickReply) => {
        if (await ask({ title: t('Obrisati odgovor „:name”?', { name: reply.title }), tone: 'danger' })) {
            router.delete(route('producers.quick-replies.destroy', [producer.id, reply.id]), {
                preserveScroll: true,
                onSuccess: () => editing?.id === reply.id && stopEditing(),
            });
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Brzi odgovori')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Brzi odgovori')}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                {t('Odgovori koje često šaljete kupcima. U razgovoru ih ubacujete dugmetom pored polja za poruku, pa ih pre slanja možete doterati.')}
            </p>

            {replies.length === 0 ? (
                <div className="border-border/70 mt-8 max-w-xl rounded-lg border border-dashed p-5">
                    <p className="text-sm">{t('Još nemate sačuvanih odgovora.')}</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => router.post(route('producers.quick-replies.starters', producer.id), {}, { preserveScroll: true })}
                    >
                        {t('Počni od naših predloga')}
                    </Button>
                </div>
            ) : (
                <ul className="mt-8 max-w-2xl space-y-3">
                    {replies.map((reply) => (
                        <li key={reply.id} className={cn('rounded-xl border p-4', editing?.id === reply.id && 'border-primary/60')}>
                            <p className="text-sm font-medium break-words">{reply.title}</p>
                            <p className="text-muted-foreground mt-1 text-sm break-words whitespace-pre-line">{reply.body}</p>
                            <div className="mt-3 flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => startEditing(reply)}>
                                    <Pencil className="size-4" />
                                    {t('Izmeni')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => destroy(reply)}>
                                    <Trash2 className="size-4" />
                                    {t('Obriši')}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {full ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {t('Sačuvali ste najveći broj odgovora (:max). Obrišite neki da biste dodali novi.', { max: limit })}
                </p>
            ) : (
                <form onSubmit={submit} className="mt-10 max-w-xl space-y-5">
                    <h2 className="font-serif text-2xl">{editing ? t('Izmena odgovora') : t('Novi odgovor')}</h2>

                    <div className="grid gap-2">
                        <Label htmlFor="reply-title">{t('Naziv (vidite ga samo vi)')}</Label>
                        <Input
                            id="reply-title"
                            value={data.title}
                            maxLength={60}
                            required
                            placeholder={t('npr. Dostava')}
                            onChange={(e) => setData('title', e.target.value)}
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reply-body">{t('Tekst odgovora')}</Label>
                        <textarea
                            id="reply-body"
                            value={data.body}
                            maxLength={bodyMax}
                            required
                            rows={5}
                            onChange={(e) => setData('body', e.target.value)}
                            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                        <p className="text-muted-foreground text-xs">
                            {t('Napišite {ime} tamo gde treba da stoji ime kupca.')} {data.body.length}/{bodyMax}
                        </p>
                        <InputError message={errors.body} />
                    </div>

                    <div className="flex gap-2">
                        <Button disabled={processing}>{editing ? t('Sačuvaj izmene') : t('Sačuvaj odgovor')}</Button>
                        {editing && (
                            <Button type="button" variant="outline" onClick={stopEditing}>
                                {t('Odustani')}
                            </Button>
                        )}
                    </div>
                </form>
            )}
        </MarketplaceLayout>
    );
}
