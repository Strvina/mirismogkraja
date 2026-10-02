import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { shrinkImages } from '@/lib/shrink-image';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import ProducerForm from './producer-form';

interface GalleryImage {
    id: number;
    path: string;
    caption: string | null;
}

export default function ProducersEdit({ producer, gallery }: { producer: Producer; gallery: GalleryImage[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/izmena` },
    ];

    const { data, setData, post, processing, errors, reset } = useForm<{ images: File[]; captions: string[] }>({
        images: [],
        captions: [],
    });
    const [preparing, setPreparing] = useState(false);
    // Per-file errors arrive as images.0, images.1, ...; the first says enough.
    const imageError = errors.images ?? Object.entries(errors).find(([key]) => key.startsWith('images.'))?.[1];

    const uploadImages: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('producers.images.store', producer.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const removeImage = async (image: GalleryImage) => {
        if (await ask({ title: t('Obrisati ovu sliku iz galerije?'), description: t('Ova radnja se ne može poništiti.'), tone: 'danger' })) {
            router.delete(route('producers.images.destroy', [producer.id, image.id]), { preserveScroll: true });
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Izmena')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Izmena proizvođača')}</h1>

            <div className="mt-8">
                <ProducerForm producer={producer} action={route('producers.update', producer.id)} method="put" submitLabel={t('Sačuvaj izmene')} />
            </div>

            <section className="mt-16 max-w-xl">
                <h2 className="font-serif text-2xl">{t('Galerija')}</h2>
                <p className="text-muted-foreground mt-2 text-sm">{t('Slike domaćinstva i proizvodnje koje se prikazuju na vašem profilu.')}</p>

                {gallery.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {gallery.map((image) => (
                            <figure key={image.id} className="group relative">
                                <img src={thumbUrl(image.path)} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(image)}
                                    aria-label={t('Obriši sliku')}
                                    className="bg-background/90 text-destructive hover:bg-background absolute top-2 right-2 grid size-8 place-items-center rounded-full shadow-sm transition-colors"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                                {image.caption && <figcaption className="text-muted-foreground mt-1.5 text-xs">{image.caption}</figcaption>}
                            </figure>
                        ))}
                    </div>
                )}

                <form onSubmit={uploadImages} className="mt-6 space-y-3">
                    <div className="grid gap-2">
                        <Label htmlFor="gallery-images">{t('Dodaj slike')}</Label>
                        <Input
                            id="gallery-images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={async (e) => {
                                const files = Array.from(e.target.files ?? []);
                                setPreparing(true);
                                setData('images', await shrinkImages(files));
                                setPreparing(false);
                            }}
                        />
                        <InputError message={imageError} />
                    </div>

                    {data.images.map((file, index) => (
                        <Input
                            key={file.name + index}
                            value={data.captions[index] ?? ''}
                            maxLength={255}
                            placeholder={t('Opis za „:name” (opciono)', { name: file.name })}
                            aria-label={t('Opis slike :number', { number: index + 1 })}
                            onChange={(e) => {
                                const captions = [...data.captions];
                                captions[index] = e.target.value;
                                setData('captions', captions);
                            }}
                        />
                    ))}

                    <Button disabled={processing || preparing || data.images.length === 0}>{preparing ? 'Pripremam…' : 'Otpremi'}</Button>
                </form>
            </section>
        </MarketplaceLayout>
    );
}
