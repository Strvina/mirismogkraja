import { type Household } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

export default function HouseholdShow({ household }: { household: Household }) {
    return (
        <>
            <Head title={household.name} />

            <main className="min-h-screen bg-background paper-grain">
                <div className="mx-auto max-w-[1380px] px-5 py-12 sm:px-8 lg:px-12">
                    <Link href="/" className="text-sm font-semibold text-primary">
                        ← Vrelina juga
                    </Link>

                    {household.cover_image_path && (
                        <img
                            src={`/storage/${household.cover_image_path}`}
                            alt={household.name}
                            className="image-warm mt-6 aspect-[16/6] w-full rounded-md object-cover"
                        />
                    )}

                    <div className="mt-6 flex items-center gap-4">
                        {household.logo_path && (
                            <img
                                src={`/storage/${household.logo_path}`}
                                alt=""
                                className="size-16 rounded-full border object-cover"
                            />
                        )}
                        <div>
                            <h1 className="font-serif text-4xl">{household.name}</h1>
                            {household.city && (
                                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <MapPin className="size-4" />
                                    {household.city}
                                </p>
                            )}
                        </div>
                    </div>

                    {household.description && (
                        <p className="mt-6 max-w-2xl leading-7 text-muted-foreground">{household.description}</p>
                    )}

                    <section className="mt-12">
                        <h2 className="font-serif text-2xl">Proizvodi</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Ovo domaćinstvo još nema objavljene proizvode.</p>
                    </section>

                    <section className="mt-12">
                        <h2 className="font-serif text-2xl">Ocene</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Ovo domaćinstvo još nema ocena.</p>
                    </section>
                </div>
            </main>
        </>
    );
}
