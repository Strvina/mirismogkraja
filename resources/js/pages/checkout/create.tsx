import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type CartItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Korpa', href: '/korpa' },
    { title: 'Naplata', href: '/naplata' },
];

export default function CheckoutCreate({ cartItems }: { cartItems: CartItem[] }) {
    const { data, setData, post, processing, errors } = useForm({ shipping_address: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('checkout.store'));
    };

    const total = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Naplata" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <h1 className="font-serif text-xl font-semibold">Naplata</h1>

                <div className="max-w-xl space-y-2">
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                            <span>
                                {item.product.name} × {item.quantity}
                            </span>
                            <span>{(Number(item.product.price) * item.quantity).toFixed(2)} RSD</span>
                        </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Ukupno</span>
                        <span>{total.toFixed(2)} RSD</span>
                    </div>
                </div>

                <form onSubmit={submit} className="max-w-xl space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="shipping_address">Adresa za dostavu</Label>
                        <Input
                            id="shipping_address"
                            value={data.shipping_address}
                            onChange={(e) => setData('shipping_address', e.target.value)}
                            required
                        />
                        {errors.shipping_address && <p className="text-destructive text-sm">{errors.shipping_address}</p>}
                    </div>
                    <Button disabled={processing || cartItems.length === 0}>Potvrdi porudžbinu</Button>
                </form>
            </div>
        </AppLayout>
    );
}
