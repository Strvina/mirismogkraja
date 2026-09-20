import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/format';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type CartItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Info } from 'lucide-react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Korpa', href: '/korpa' },
    { title: 'Slanje upita', href: '/naplata' },
];

export default function CheckoutCreate({
    cartItems,
    contact,
}: {
    cartItems: CartItem[];
    contact: { name: string; email: string; phone: string | null };
}) {
    const { data, setData, post, processing, errors } = useForm({ shipping_address: '', note: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('checkout.store'));
    };

    const total = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Slanje upita" />

            <h1 className="font-serif text-4xl sm:text-5xl">Slanje upita</h1>
            <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                Upit ide direktno proizvođaču sa vašim kontakt podacima. Dogovor o plaćanju i preuzimanju vodite međusobno.
            </p>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
                <form onSubmit={submit} className="max-w-xl space-y-5">
                    <div className="grid gap-2">
                        <Label htmlFor="shipping_address">Adresa / mesto preuzimanja</Label>
                        <Input
                            id="shipping_address"
                            value={data.shipping_address}
                            onChange={(e) => setData('shipping_address', e.target.value)}
                            required
                        />
                        {errors.shipping_address && <p className="text-destructive text-sm">{errors.shipping_address}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="note">Napomena za proizvođača (opciono)</Label>
                        <textarea
                            id="note"
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                            maxLength={1000}
                            placeholder="Npr. kada vam odgovara preuzimanje, način pakovanja..."
                            className="border-input bg-background min-h-28 rounded-md border px-3 py-2 text-sm"
                        />
                        {errors.note && <p className="text-destructive text-sm">{errors.note}</p>}
                    </div>

                    <div className="border-border/70 rounded-lg border p-4 text-sm">
                        <p className="font-medium">Vaši kontakt podaci koje proizvođač dobija</p>
                        <p className="text-muted-foreground mt-2">
                            {contact.name} · {contact.email}
                            {contact.phone ? ` · ${contact.phone}` : ''}
                        </p>
                        {!contact.phone && (
                            <p className="text-muted-foreground mt-2 text-xs">
                                Nemate unet telefon — možete ga dodati u „Moj nalog" da vas proizvođač lakše kontaktira.
                            </p>
                        )}
                    </div>

                    <Button disabled={processing || cartItems.length === 0}>Pošalji upit proizvođaču</Button>
                </form>

                <aside className="border-border/70 rounded-lg border p-5">
                    <h2 className="font-serif text-xl">Pregled upita</h2>

                    <div className="mt-4 space-y-2">
                        {cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">
                                    {item.product.name} × {item.quantity}
                                </span>
                                <span className="whitespace-nowrap">{formatPrice(Number(item.product.price) * item.quantity)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-border/70 mt-4 flex items-baseline justify-between border-t pt-4">
                        <span className="text-muted-foreground text-sm">Orijentaciono</span>
                        <span className="font-serif text-2xl">{formatPrice(total)}</span>
                    </div>

                    <p className="text-muted-foreground mt-4 flex gap-2 text-xs leading-5">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        Iznos je po cenovniku proizvođača i nije račun — platforma ne naplaćuje niti šalje robu.
                    </p>
                </aside>
            </div>
        </MarketplaceLayout>
    );
}
