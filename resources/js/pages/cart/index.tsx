import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type CartItem, type Producer } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react';

type Group = { producer: Producer; items: CartItem[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Korpa', href: '/korpa' }];

const lineTotal = (item: CartItem) => Number(item.product.price) * item.quantity;

export default function CartIndex({ groups }: { groups: Group[] }) {
    const setQuantity = (item: CartItem, quantity: number) => {
        if (quantity < 1) {
            return;
        }

        router.patch(route('cart.update', item.id), { quantity }, { preserveScroll: true });
    };

    const remove = (item: CartItem) => {
        router.delete(route('cart.destroy', item.id), { preserveScroll: true });
    };

    const total = groups.flatMap((group) => group.items).reduce((sum, item) => sum + lineTotal(item), 0);

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Korpa" />

            <h1 className="font-serif text-4xl sm:text-5xl">Korpa</h1>

            {groups.length === 0 ? (
                <div className="py-16 text-center">
                    <p className="text-muted-foreground text-sm">Korpa je prazna.</p>
                    <Button asChild variant="outline" className="mt-4">
                        <Link href={route('marketplace.products.index')}>Pogledaj proizvode</Link>
                    </Button>
                </div>
            ) : (
                <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
                    <div className="space-y-6">
                        {groups.map((group) => {
                            const groupTotal = group.items.reduce((sum, item) => sum + lineTotal(item), 0);

                            return (
                                <section key={group.producer.id} className="border-border/70 rounded-lg border">
                                    <header className="border-border/70 flex items-center justify-between gap-3 border-b px-5 py-4">
                                        <Link href={route('marketplace.producers.show', group.producer.slug)} className="font-serif text-lg">
                                            {group.producer.name}
                                        </Link>
                                        {group.producer.city && (
                                            <span className="text-muted-foreground text-xs">{group.producer.city}</span>
                                        )}
                                    </header>

                                    <div className="divide-border/70 divide-y">
                                        {group.items.map((item) => (
                                            <div key={item.id} className="flex flex-wrap items-center gap-4 p-5">
                                                <div className="bg-muted size-20 shrink-0 overflow-hidden rounded-md">
                                                    {item.product.images?.[0] ? (
                                                        <img
                                                            src={`/storage/${item.product.images[0].path}`}
                                                            alt={item.product.name}
                                                            className="image-warm size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-muted-foreground/40 grid size-full place-items-center">
                                                            <ImageOff className="size-5" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-40 flex-1">
                                                    <Link
                                                        href={route('marketplace.products.show', item.product.slug)}
                                                        className="font-medium"
                                                    >
                                                        {item.product.name}
                                                    </Link>
                                                    <p className="text-muted-foreground mt-1 text-sm">
                                                        {formatPrice(item.product.price)} / {item.product.unit}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label="Smanji količinu"
                                                        disabled={item.quantity <= 1}
                                                        onClick={() => setQuantity(item, item.quantity - 1)}
                                                    >
                                                        <Minus className="size-4" />
                                                    </Button>
                                                    <span className="w-10 text-center text-sm tabular-nums">{item.quantity}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label="Povećaj količinu"
                                                        onClick={() => setQuantity(item, item.quantity + 1)}
                                                    >
                                                        <Plus className="size-4" />
                                                    </Button>
                                                </div>

                                                <p className="w-28 text-right font-serif text-lg">{formatPrice(lineTotal(item))}</p>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Ukloni ${item.product.name}`}
                                                    onClick={() => remove(item)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <footer className="text-muted-foreground border-border/70 flex justify-between border-t px-5 py-3 text-sm">
                                        <span>Ukupno za ovog proizvođača</span>
                                        <span className="text-foreground font-medium">{formatPrice(groupTotal)}</span>
                                    </footer>
                                </section>
                            );
                        })}
                    </div>

                    <aside className="border-border/70 rounded-lg border p-5 lg:sticky lg:top-28">
                        <h2 className="font-serif text-xl">Pregled</h2>

                        <div className="mt-4 flex items-baseline justify-between">
                            <span className="text-muted-foreground text-sm">Orijentaciono ukupno</span>
                            <span className="font-serif text-2xl">{formatPrice(total)}</span>
                        </div>

                        <p className="text-muted-foreground mt-3 text-xs leading-5">
                            Iznos je po cenovniku proizvođača. Plaćanje i dostava se dogovaraju direktno sa proizvođačem — platforma
                            ne naplaćuje i ne šalje robu.
                        </p>

                        <Button asChild className="mt-5 w-full">
                            <Link href={route('checkout.create')}>Pošalji upit proizvođaču</Link>
                        </Button>
                    </aside>
                </div>
            )}
        </MarketplaceLayout>
    );
}
