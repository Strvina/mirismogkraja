import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';
import ProducerForm from './producer-form';

interface GalleryImage {
    id: number;
    path: string;
    caption: string | null;
}

export default function ProducersEdit({ producer, gallery }: { producer: Producer; gallery: GalleryImage[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moji proizvođači', href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/izmena` },
    ];

    const { data, setData, post, processing, errors, reset } = useForm<{ images: File[]; captions: string[] }>({
        images: [],
        captions: [],
    });

    const uploadImages: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('producers.images.store', producer.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const removeImage = (image: GalleryImage) => {
        if (confirm('Obrisati ovu sliku iz galerije?')) {
            router.delete(route('producers.images.destroy', [producer.id, image.id]), { preserveScroll: true });
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`Izmena — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">Izmena proizvođača</h1>

            <div className="mt-8">
                <ProducerForm producer={producer} action={route('producers.update', producer.id)} method="put" submitLabel="Sačuvaj izmene" />
            </div>

            <section className="mt-16 max-w-xl">
                <h2 className="font-serif text-2xl">Galerija</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                    Slike domaćinstva i proizvodnje koje se prikazuju na vašem profilu.
                </p>

                {gallery.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {gallery.map((image) => (
                            <figure key={image.id} className="group relative">
                                <img src={`/storage/${image.path}`} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(image)}
                                    aria-label="Obriši sliku"
                                    className="bg-background/90 text-destructive absolute top-2 right-2 grid size-8 place-items-center rounded-full shadow-sm transition-colors hover:bg-background"
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
                        <Label htmlFor="gallery-images">Dodaj slike</Label>
                        <Input
                            id="gallery-images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => setData('images', Array.from(e.target.files ?? []))}
                        />
                        {errors.images && <p className="text-destructive text-sm">{errors.images}</p>}
                    </div>

                    {data.images.map((file, index) => (
                        <Input
                            key={file.name + index}
                            value={data.captions[index] ?? ''}
                            maxLength={255}
                            placeholder={`Opis za "${file.name}" (opciono)`}
                            aria-label={`Opis slike ${index + 1}`}
                            onChange={(e) => {
                                const captions = [...data.captions];
                                captions[index] = e.target.value;
                                setData('captions', captions);
                            }}
                        />
                    ))}

                    <Button disabled={processing || data.images.length === 0}>Otpremi</Button>
                </form>
            </section>
        </MarketplaceLayout>
    );
}
