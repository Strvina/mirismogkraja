import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Household } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type HouseholdFormData = {
    name: string;
    description: string;
    address: string;
    city: string;
};

export default function HouseholdForm({
    household,
    action,
    method,
    submitLabel,
}: {
    household?: Household;
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
}) {
    const { data, setData, post, put, processing, errors } = useForm<HouseholdFormData>({
        name: household?.name ?? '',
        description: household?.description ?? '',
        address: household?.address ?? '',
        city: household?.city ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const submitFn = method === 'post' ? post : put;
        submitFn(action);
    };

    return (
        <form onSubmit={submit} className="max-w-xl space-y-6">
            <div className="grid gap-2">
                <Label htmlFor="name">Naziv domaćinstva</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Opis</Label>
                <textarea
                    id="description"
                    className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Adresa</Label>
                <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                <InputError message={errors.address} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="city">Grad</Label>
                <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} />
                <InputError message={errors.city} />
            </div>

            <Button disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
