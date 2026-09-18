import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Producer, type Product } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

export default function ProductsIndex({ producer, products }: { producer: Producer; products: Product[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moji proizvođači', href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/izmena` },
        { title: 'Proizvodi', href: `/moji-proizvodjaci/${producer.id}/proizvodi` },
    ];

    const destroy = (product: Product) => {
        if (confirm(`Obrisati proizvod "${product.name}"?`)) {
            router.delete(route('producers.products.destroy', [producer.id, product.id]));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Proizvodi — ${producer.name}`} />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="font-serif text-xl font-semibold">Proizvodi — {producer.name}</h1>
                    <Button asChild>
                        <Link href={route('producers.products.create', producer.id)}>Novi proizvod</Link>
                    </Button>
                </div>

                {products.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nema još proizvoda.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {products.map((product) => (
                            <div key={product.id} className="rounded-xl border p-4">
                                <div className="flex items-start justify-between">
                                    <h2 className="font-serif text-lg">{product.name}</h2>
                                    <span className="bg-muted rounded-full px-2 py-1 text-xs">{product.status}</span>
                                </div>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {product.price} RSD / {product.unit} · {product.category?.name}
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('producers.products.edit', [producer.id, product.id])}>Izmeni</Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => destroy(product)}>
                                        Obriši
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
