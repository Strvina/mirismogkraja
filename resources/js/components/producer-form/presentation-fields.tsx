import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { shrinkImage } from '@/lib/shrink-image';
import { useEffect, useMemo } from 'react';
import { type ProducerFormFields } from './types';

function ImageField({
    id,
    label,
    preview,
    onChange,
    error,
}: {
    id: string;
    label: string;
    preview: string | null;
    onChange: (file: File | null) => void;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center gap-4">
                {preview && <img src={preview} alt="" className="size-16 rounded-md object-cover" />}
                <Input
                    id={id}
                    type="file"
                    accept="image/*"
                    className="w-full max-w-xs"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        onChange(file ? await shrinkImage(file) : null);
                    }}
                />
            </div>
            <InputError message={error} />
        </div>
    );
}

/** The picture to show: a newly chosen file, else the one already saved. */
function usePreview(file: File | null, savedPath?: string | null): string | null {
    const local = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

    // A preview URL holds the file in memory until it is released.
    useEffect(() => () => (local ? URL.revokeObjectURL(local) : undefined), [local]);

    return local ?? (savedPath ? thumbUrl(savedPath) : null);
}

/** How the producer presents themselves: cover, logo, description and story. */
export default function PresentationFields({
    data,
    setData,
    errors,
    coverPath,
    logoPath,
}: ProducerFormFields & { coverPath?: string | null; logoPath?: string | null }) {
    // Drawn from the form's own value, so a chosen picture is still shown
    // after stepping back and forth through the wizard.
    const coverPreview = usePreview(data.cover_image, coverPath);
    const logoPreview = usePreview(data.logo, logoPath);

    return (
        <>
            <ImageField
                id="cover_image"
                label={t('Naslovna slika')}
                preview={coverPreview}
                error={errors.cover_image}
                onChange={(file) => setData('cover_image', file)}
            />

            <ImageField id="logo" label={t('Logo')} preview={logoPreview} error={errors.logo} onChange={(file) => setData('logo', file)} />

            <div className="grid gap-2">
                <Label htmlFor="description">{t('Opis')}</Label>
                <textarea
                    id="description"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="story">{t('Priča o nastanku proizvoda')}</Label>
                <p className="text-muted-foreground -mt-1 text-xs">{t('Kako nastaje ono što prodajete — tok proizvodnje, tradicija, sezona.')}</p>
                <textarea
                    id="story"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.story}
                    onChange={(e) => setData('story', e.target.value)}
                />
                <InputError message={errors.story} />
            </div>
        </>
    );
}
