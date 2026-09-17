import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type CartItem, type Household } from '@/types';
import { Head, router } from '@inertiajs/react';

type Group = { household: Household; items: CartItem[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Korpa', href: '/korpa' }];

export default function CartIndex({ groups }: { groups: Group[] }) {
    const updateQuantity = (item: CartItem, quantity: number) => {
        if (quantity < 1) return;
        router.patch(route('cart.update', item.id), { quantity }, { preserveScroll: true });
    };

    const remove = (item: CartItem) => {
        router.delete(route('cart.destroy', item.id), { preserveScroll: true });
    };

    const total = groups
        .flatMap((g) => g.items)
        .reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Korpa" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <h1 className="text-xl font-semibold">Korpa</h1>

                {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Korpa je prazna.</p>
                ) : (
                    <>
                        {groups.map((group) => (
                            <div key={group.household.id} className="rounded-xl border p-4">
                                <h2 className="font-serif text-lg">{group.household.name}</h2>
                                <div className="mt-4 space-y-3">
                                    {group.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium">{item.product.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.product.price} RSD / {item.product.unit}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item, Number(e.target.value))}
                                                    className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
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

                        <p className="text-right text-lg font-semibold">Ukupno: {total.toFixed(2)} RSD</p>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
