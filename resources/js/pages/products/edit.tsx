import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category, type Household, type Product } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import ProductForm from './product-form';

function ImagesManager({ household, product }: { household: Household; product: Product }) {
    const { data, setData, post, processing, reset } = useForm<{ images: File[] }>({ images: [] });

    const upload: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('households.products.images.store', [household.id, product.id]), {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    const images = [...(product.images ?? [])].sort((a, b) => a.order - b.order);

    return (
        <div className="max-w-xl space-y-4 border-t pt-6">
            <h2 className="font-semibold">Slike proizvoda</h2>

            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {images.map((image) => (
                        <div key={image.id} className="relative">
                            <img src={`/storage/${image.path}`} alt="" className="aspect-square w-full rounded-md object-cover" />
                            {image.order === 0 ? (
                                <span className="bg-primary text-primary-foreground absolute top-1 left-1 rounded px-1.5 py-0.5 text-[0.65rem]">
                                    Glavna
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className="bg-background/90 absolute top-1 left-1 rounded px-1.5 py-0.5 text-[0.65rem]"
                                    onClick={() => router.patch(route('households.products.images.primary', [household.id, product.id, image.id]))}
                                >
                                    Postavi kao glavnu
                                </button>
                            )}
                            <button
                                type="button"
                                className="bg-destructive text-destructive-foreground absolute top-1 right-1 rounded px-1.5 py-0.5 text-[0.65rem]"
                                onClick={() => router.delete(route('households.products.images.destroy', [household.id, product.id, image.id]))}
                            >
                                Ukloni
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={upload} className="flex items-center gap-3">
                <Input type="file" accept="image/*" multiple onChange={(e) => setData('images', Array.from(e.target.files ?? []))} />
                <Button disabled={processing || data.images.length === 0}>Dodaj slike</Button>
            </form>
        </div>
    );
}

export default function ProductsEdit({ household, product, categories }: { household: Household; product: Product; categories: Category[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moja domaćinstva', href: '/moja-domacinstva' },
        { title: household.name, href: `/moja-domacinstva/${household.id}/izmena` },
        { title: 'Proizvodi', href: route('households.products.index', household.id) },
        { title: product.name, href: route('households.products.edit', [household.id, product.id]) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Izmena — ${product.name}`} />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Izmena proizvoda</h1>
                <ProductForm
                    product={product}
                    categories={categories}
                    action={route('households.products.update', [household.id, product.id])}
                    method="put"
                    submitLabel="Sačuvaj izmene"
                />
                <ImagesManager household={household} product={product} />
            </div>
        </AppLayout>
    );
}
