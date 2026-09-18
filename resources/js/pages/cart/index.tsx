import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type CartItem, type Producer } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

type Group = { producer: Producer; items: CartItem[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Korpa', href: '/korpa' }];

export default function CartIndex({ groups }: { groups: Group[] }) {
    const updateQuantity = (item: CartItem, quantity: number) => {
        if (quantity < 1) return;
        router.patch(route('cart.update', item.id), { quantity }, { preserveScroll: true });
    };

    const remove = (item: CartItem) => {
        router.delete(route('cart.destroy', item.id), { preserveScroll: true });
    };

    const total = groups.flatMap((g) => g.items).reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Korpa" />

            <div className="flex flex-col gap-6">
                <h1 className="font-serif text-4xl sm:text-5xl">Korpa</h1>

                {groups.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Korpa je prazna.</p>
                ) : (
                    <>
                        {groups.map((group) => (
                            <div key={group.producer.id} className="rounded-xl border p-4">
                                <h2 className="font-serif text-lg">{group.producer.name}</h2>
                                <div className="mt-4 space-y-3">
                                    {group.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium">{item.product.name}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {item.product.price} RSD / {item.product.unit}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item, Number(e.target.value))}
                                                    className="border-input bg-background w-16 rounded-md border px-2 py-1 text-sm"
                                                />
                                                <Button variant="destructive" size="sm" onClick={() => remove(item)}>
                                                    Ukloni
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold">Ukupno: {total.toFixed(2)} RSD</p>
                            <Button asChild>
                                <Link href={route('checkout.create')}>Nastavi na naplatu</Link>
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </MarketplaceLayout>
    );
}
