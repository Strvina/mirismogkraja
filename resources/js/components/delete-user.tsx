import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

// Components...
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import HeadingSmall from '@/components/heading-small';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';

/**
 * Deleting the account, confirmed with the password - or, for an account
 * opened with Google that has none, by typing the account's e-mail address.
 * Either way the answer travels in the same field.
 */
export default function DeleteUser({ hasPassword = true }: { hasPassword?: boolean }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        clearErrors();
        reset();
    };

    return (
        <div className="space-y-6">
            <HeadingSmall title={t('Brisanje naloga')} description={t('Trajno obrišite svoj nalog i sve podatke vezane za njega')} />
            <div className="border-destructive/20 bg-destructive/5 space-y-4 rounded-lg border p-4">
                <div className="text-destructive relative space-y-0.5">
                    <p className="font-medium">{t('Upozorenje')}</p>
                    <p className="text-sm">{t('Budite oprezni — ova radnja se ne može poništiti.')}</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">{t('Obriši nalog')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>{t('Da li ste sigurni da želite da obrišete nalog?')}</DialogTitle>
                        <DialogDescription>
                            {hasPassword
                                ? t(
                                      'Kada obrišete nalog, svi podaci vezani za njega biće trajno uklonjeni. Unesite lozinku da potvrdite da želite trajno da obrišete nalog.',
                                  )
                                : t(
                                      'Kada obrišete nalog, svi podaci vezani za njega biće trajno uklonjeni. Upišite e-mail adresu naloga da potvrdite da želite trajno da ga obrišete.',
                                  )}
                        </DialogDescription>
                        <form className="space-y-6" onSubmit={deleteUser}>
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="sr-only">
                                    {hasPassword ? t('Lozinka') : t('Email adresa')}
                                </Label>

                                <Input
                                    id="password"
                                    type={hasPassword ? 'password' : 'email'}
                                    name="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder={hasPassword ? t('Lozinka') : t('Email adresa')}
                                    autoComplete={hasPassword ? 'current-password' : 'off'}
                                />

                                <InputError message={errors.password} />
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="secondary" onClick={closeModal}>
                                        {t('Otkaži')}
                                    </Button>
                                </DialogClose>

                                <Button variant="destructive" disabled={processing} asChild>
                                    <button type="submit">{t('Obriši nalog')}</button>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
