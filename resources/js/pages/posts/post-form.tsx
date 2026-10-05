import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { shrinkImage } from '@/lib/shrink-image';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';

export interface EditablePost {
    id: number;
    type: 'story' | 'recipe';
    title: string;
    slug: string;
    body: string;
    ingredients: string | null;
    cover_image_path: string | null;
    product_id: number | null;
    status: 'draft' | 'published' | 'blocked';
}

interface PostFormData {
    type: EditablePost['type'];
    title: string;
    body: string;
    ingredients: string;
    cover_image: File | null;
    remove_cover: boolean;
    product_id: string;
    status: EditablePost['status'];
}

const TYPE_OPTIONS: { value: EditablePost['type']; label: string; hint: string }[] = [
    { value: 'story', label: tx('Priča'), hint: tx('Kako nastaje proizvod, ko ga pravi, odakle je.') },
    { value: 'recipe', label: tx('Recept'), hint: tx('Šta se sprema od onoga što pravite.') },
];

const STATUS_OPTIONS: { value: EditablePost['status']; label: string }[] = [
    { value: 'draft', label: tx('Nacrt — još nije javno') },
    { value: 'published', label: tx('Objavljeno') },
];

/** Writing a story or a recipe: used for a new one and for editing. */
export default function PostForm({
    post,
    products,
    limits,
    action,
    method,
    submitLabel,
}: {
    post?: EditablePost;
    /** The producer's published products, to link one to the post. */
    products: { id: number; name: string }[];
    limits: { bodyMin: number; bodyMax: number };
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
}) {
    const {
        data,
        setData,
        post: send,
        processing,
        errors,
        transform,
    } = useForm<PostFormData>({
        type: post?.type ?? 'story',
        title: post?.title ?? '',
        body: post?.body ?? '',
        ingredients: post?.ingredients ?? '',
        cover_image: null,
        remove_cover: false,
        product_id: post?.product_id ? String(post.product_id) : '',
        status: post?.status ?? 'published',
    });
    const [preparing, setPreparing] = useState(false);
    const blocked = post?.status === 'blocked';
    const showsCurrentCover = Boolean(post?.cover_image_path) && !data.cover_image && !data.remove_cover;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // A file travels as multipart, which PHP only reads on POST - so an
        // edit is posted with the method spoofed.
        transform((form) => ({ ...form, ...(method === 'put' ? { _method: 'put' } : {}) }));
        send(action, { forceFormData: true });
    };

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-6">
            <fieldset>
                <legend className="text-sm font-medium">{t('Šta pišete?')}</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {TYPE_OPTIONS.map((option) => (
                        <label
                            key={option.value}
                            className={cn(
                                'cursor-pointer rounded-lg border p-4 transition-colors',
                                data.type === option.value ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/50',
                            )}
                        >
                            <input
                                type="radio"
                                name="type"
                                value={option.value}
                                checked={data.type === option.value}
                                onChange={() => setData('type', option.value)}
                                className="sr-only"
                            />
                            <span className="block text-sm font-medium">{t(option.label)}</span>
                            <span className="text-muted-foreground mt-1 block text-xs leading-5">{t(option.hint)}</span>
                        </label>
                    ))}
                </div>
                <InputError message={errors.type} className="mt-2" />
            </fieldset>

            <div className="grid gap-2">
                <Label htmlFor="post-title">{t('Naslov')}</Label>
                <Input id="post-title" value={data.title} maxLength={150} required onChange={(e) => setData('title', e.target.value)} />
                <InputError message={errors.title} />
            </div>

            {data.type === 'recipe' && (
                <div className="grid gap-2">
                    <Label htmlFor="post-ingredients">{t('Sastojci')}</Label>
                    <textarea
                        id="post-ingredients"
                        value={data.ingredients}
                        maxLength={2000}
                        rows={6}
                        placeholder={t('Jedan sastojak u svakom redu')}
                        onChange={(e) => setData('ingredients', e.target.value)}
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <InputError message={errors.ingredients} />
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="post-body">{data.type === 'recipe' ? t('Priprema') : t('Tekst')}</Label>
                <textarea
                    id="post-body"
                    value={data.body}
                    maxLength={limits.bodyMax}
                    required
                    rows={14}
                    onChange={(e) => setData('body', e.target.value)}
                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm leading-6"
                />
                <p className="text-muted-foreground text-xs">
                    {t('Pišite kao što biste pričali kupcu na pijaci. Prazan red pravi novi pasus.')} {data.body.length}/{limits.bodyMax}
                </p>
                <InputError message={errors.body} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="post-cover">{t('Naslovna fotografija (nije obavezno)')}</Label>
                {showsCurrentCover && (
                    <div className="flex items-center gap-3">
                        <img src={thumbUrl(post!.cover_image_path!)} alt="" className="h-20 w-32 rounded-md object-cover" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setData('remove_cover', true)}>
                            {t('Ukloni fotografiju')}
                        </Button>
                    </div>
                )}
                <Input
                    id="post-cover"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        setPreparing(true);
                        setData('cover_image', file ? await shrinkImage(file) : null);
                        setPreparing(false);
                    }}
                />
                <InputError message={errors.cover_image} />
            </div>

            {products.length > 0 && (
                <div className="grid gap-2">
                    <Label htmlFor="post-product">
                        {data.type === 'recipe' ? t('Proizvod od kog se pravi (nije obavezno)') : t('Proizvod o kom pišete (nije obavezno)')}
                    </Label>
                    <select
                        id="post-product"
                        value={data.product_id}
                        onChange={(e) => setData('product_id', e.target.value)}
                        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="">{t('Nijedan')}</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-muted-foreground text-xs">{t('Prikazuje se ispod teksta, sa cenom i linkom do proizvoda.')}</p>
                    <InputError message={errors.product_id} />
                </div>
            )}

            {blocked ? (
                <p className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
                    {t('Administrator je sklonio ovu objavu sa sajta. Možete da je ispravite, ali samo administrator može ponovo da je objavi.')}
                </p>
            ) : (
                <div className="grid gap-2">
                    <Label htmlFor="post-status">{t('Status')}</Label>
                    <select
                        id="post-status"
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value as EditablePost['status'])}
                        className="border-input bg-background w-fit rounded-md border px-3 py-2 text-sm"
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {t(option.label)}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.status} />
                </div>
            )}

            <Button disabled={processing || preparing}>{preparing ? t('Pripremam…') : submitLabel}</Button>
        </form>
    );
}
