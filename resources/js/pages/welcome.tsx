import CardSlider from '@/components/marketplace/card-slider';
import { HomeProducerCard, HomeProductCard, type HomeProducer, type HomeProduct } from '@/components/marketplace/home-cards';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Leaf, Sprout } from 'lucide-react';
import { type ReactNode } from 'react';

import heroImage from '../assets/hero-ajvar.jpg';
import cheeseImage from '../assets/producer-cheese.jpg';
import honeyImage from '../assets/producer-honey.jpg';
import productsImage from '../assets/products-table.jpg';
import storyImage from '../assets/story-hands.jpg';

// Categories have no image of their own in the database, so the tiles cycle
// through the landing page's own photography.
const categoryImages = [
    { image: heroImage, position: 'object-[70%_65%]' },
    { image: productsImage, position: 'object-[72%_55%]' },
    { image: cheeseImage, position: 'object-[65%_55%]' },
    { image: honeyImage, position: 'object-[38%_52%]' },
    { image: productsImage, position: 'object-[55%_45%]' },
    { image: productsImage, position: 'object-[88%_48%]' },
];

interface HomeCategory {
    id: number;
    name: string;
}

/**
 * A discovery section: heading, a link to the full listing, and its cards in
 * a slider. Sections with nothing to show render nothing at all - an empty
 * "most popular" row would say more about the platform than about anyone's
 * produce.
 */
function Section({
    id,
    eyebrow,
    title,
    lead,
    moreHref,
    moreLabel,
    children,
    className = '',
}: {
    id?: string;
    eyebrow: string;
    title: string;
    lead?: string;
    moreHref: string;
    moreLabel: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section id={id} className={className}>
            <div className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div className="max-w-xl">
                        <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">{eyebrow}</p>
                        <h2 className="font-serif text-4xl sm:text-5xl">{title}</h2>
                        {lead && <p className="text-muted-foreground mt-3 leading-7">{lead}</p>}
                    </div>
                    <Link href={moreHref} className="border-foreground/30 flex items-center gap-2 border-b pb-1 text-sm font-semibold">
                        {moreLabel} <ArrowRight className="size-4" />
                    </Link>
                </div>
                {children}
            </div>
        </section>
    );
}

export default function Welcome({
    newProducers,
    popularProducers,
    popularProducts,
    categories,
}: {
    newProducers: HomeProducer[];
    popularProducers: HomeProducer[];
    popularProducts: HomeProduct[];
    categories: HomeCategory[];
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Vrelina juga | Domaći proizvođači sa juga Srbije">
                <meta name="description" content="Upoznajte proizvođače, ljude i proizvode koji čuvaju tradiciju juga Srbije." />
            </Head>

            <MarketplaceLayout fullBleed>
                <section className="relative flex min-h-[620px] items-end overflow-hidden sm:min-h-[700px] lg:min-h-[min(820px,86vh)]">
                    <img
                        src={heroImage}
                        alt="Priprema domaćeg ajvara u tradicionalnoj kuhinji"
                        width={1600}
                        height={1056}
                        className="image-warm absolute inset-0 size-full object-cover object-[64%_center]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--charcoal)_92%,transparent)_0%,color-mix(in_oklab,var(--charcoal)_68%,transparent)_42%,color-mix(in_oklab,var(--charcoal)_10%,transparent)_78%),linear-gradient(0deg,color-mix(in_oklab,var(--charcoal)_60%,transparent),transparent_52%)]" />
                    <div className="text-primary-foreground relative mx-auto w-full max-w-[1380px] px-5 pt-20 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
                        <div className="reveal-up max-w-3xl">
                            <p className="text-primary-foreground/80 mb-5 flex items-center gap-3 text-xs font-semibold tracking-[0.18em] uppercase">
                                <span className="bg-gold h-px w-9" /> Iz srca juga Srbije
                            </p>
                            <h1 className="max-w-2xl font-serif text-6xl leading-[0.97] font-medium sm:text-7xl lg:text-[6.6rem]">Vrelina juga.</h1>
                            <p className="text-primary-foreground/85 mt-7 max-w-xl text-base leading-7 sm:text-lg">
                                Upoznajte proizvođače, ljude i proizvode koji čuvaju tradiciju.
                            </p>

                            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                                <Button asChild variant="cream" size="xl">
                                    <Link href={route('marketplace.producers.index')}>
                                        Pronađi domaće <ArrowRight />
                                    </Link>
                                </Button>

                                {/* Signed-out visitors get the one CTA that unlocks everything
                                    else on the site: saving producers, writing to them, and
                                    leaving an impression. */}
                                {auth.user ? (
                                    <Button asChild variant="outlineLight" size="xl">
                                        <Link href={route('producers.create')}>Predstavi svoje proizvode</Link>
                                    </Button>
                                ) : (
                                    <Button asChild variant="outlineLight" size="xl">
                                        <Link href={route('register')}>Otvori besplatan nalog</Link>
                                    </Button>
                                )}
                            </div>

                            {!auth.user && (
                                <p className="text-primary-foreground/75 mt-5 max-w-md text-sm leading-6">
                                    Nalog vam treba da sačuvate omiljene proizvođače, pišete im i ostavite utisak. Proizvođač ste?{' '}
                                    <Link href={route('register')} className="decoration-gold/70 font-semibold underline underline-offset-4">
                                        I vi počinjete odavde.
                                    </Link>
                                </p>
                            )}
                        </div>

                        <div className="text-primary-foreground/70 mt-14 flex items-center gap-4 text-xs tracking-[0.13em] uppercase">
                            <Leaf className="text-gold size-4" />
                            <span>Od ljudi koje možete da upoznate</span>
                        </div>
                    </div>
                </section>

                <section id="kategorije" className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
                    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">Istražite ukuse</p>
                            <h2 className="font-serif text-4xl sm:text-5xl">Šta tražite?</h2>
                        </div>
                        <Link
                            href={route('marketplace.products.index')}
                            className="border-foreground/30 flex items-center gap-2 border-b pb-1 text-sm font-semibold"
                        >
                            Svi proizvodi <ArrowRight className="size-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                        {categories.map((category, index) => (
                            <Link
                                key={category.id}
                                href={route('marketplace.products.index', { category_id: category.id })}
                                className="group bg-muted relative aspect-[4/5] overflow-hidden rounded-md"
                            >
                                <img
                                    src={categoryImages[index % categoryImages.length].image}
                                    alt=""
                                    width={600}
                                    height={750}
                                    loading="lazy"
                                    className={`image-warm size-full object-cover transition duration-700 group-hover:scale-105 ${categoryImages[index % categoryImages.length].position}`}
                                />
                                <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--charcoal)_75%,transparent),transparent_68%)]" />
                                <h3 className="text-primary-foreground absolute inset-x-4 bottom-4 font-serif text-lg leading-tight">
                                    {category.name}
                                </h3>
                            </Link>
                        ))}
                    </div>
                </section>

                {newProducers.length > 0 && (
                    <Section
                        id="proizvodjaci"
                        eyebrow="Tek su nam se pridružili"
                        title="Novi proizvođači"
                        lead="Domaćinstva koja su nedavno otvorila svoju stranicu — pogledajte šta nude."
                        moreHref={route('marketplace.producers.index')}
                        moreLabel="Svi proizvođači"
                        className="bg-cream-deep"
                    >
                        <CardSlider label="Novi proizvođači">
                            {newProducers.map((producer) => (
                                <HomeProducerCard key={producer.id} producer={producer} />
                            ))}
                        </CardSlider>
                    </Section>
                )}

                {popularProducers.length > 0 && (
                    <Section
                        eyebrow="Kod njih se najviše navraća"
                        title="Omiljeni proizvođači"
                        lead="Oni koje su posetioci najčešće sačuvali i o kojima su ostavili najviše utisaka."
                        moreHref={route('marketplace.producers.index')}
                        moreLabel="Svi proizvođači"
                    >
                        <CardSlider label="Omiljeni proizvođači">
                            {popularProducers.map((producer) => (
                                <HomeProducerCard key={producer.id} producer={producer} />
                            ))}
                        </CardSlider>
                    </Section>
                )}

                {popularProducts.length > 0 && (
                    <Section
                        id="proizvodi"
                        eyebrow="Odabrano za vas"
                        title="Najtraženiji proizvodi"
                        lead="Proizvodi koje posetioci najčešće čuvaju i o kojima najviše pitaju."
                        moreHref={route('marketplace.products.index')}
                        moreLabel="Svi proizvodi"
                        className="bg-cream-deep"
                    >
                        <CardSlider label="Najtraženiji proizvodi" itemClassName="w-[58vw] sm:w-[260px] lg:w-[280px]">
                            {popularProducts.map((product) => (
                                <HomeProductCard key={product.id} product={product} />
                            ))}
                        </CardSlider>
                    </Section>
                )}

                <section
                    id="o-nama"
                    className="mx-auto grid max-w-[1380px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-20 lg:px-12 lg:py-28"
                >
                    <div className="relative">
                        <div className="border-gold absolute -top-4 -left-4 hidden h-24 w-24 border-t border-l lg:block" />
                        <img
                            src={storyImage}
                            alt="Dve generacije zajedno pripremaju domaću hranu"
                            width={1200}
                            height={912}
                            loading="lazy"
                            className="image-warm aspect-[5/4] w-full rounded-md object-cover"
                        />
                        <p className="bg-background/95 absolute bottom-4 left-4 px-4 py-3 font-serif text-sm italic shadow-sm">
                            Znanje koje se prenosi rukama.
                        </p>
                    </div>
                    <div className="lg:pr-8">
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.16em] uppercase">Kako to ide</p>
                        <h2 className="font-serif text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">Iza svakog proizvoda stoje ljudi.</h2>
                        <p className="text-muted-foreground mt-7 text-lg leading-8">
                            Pronađete proizvod, otvorite stranicu proizvođača i pišete mu direktno. Oko količine, cene i dostave dogovarate se sami —
                            mi smo tu samo da vas spojimo.
                        </p>
                        <div className="bg-border my-8 h-px w-full" />
                        <div className="grid grid-cols-2 gap-6 text-sm leading-6">
                            <p>
                                <strong className="text-foreground mb-1 block font-serif text-lg">Sa juga Srbije</strong>
                                <span className="text-muted-foreground">Sastojci poznatog porekla i ukusi vezani za podneblje.</span>
                            </p>
                            <p>
                                <strong className="text-foreground mb-1 block font-serif text-lg">Svojim rukama</strong>
                                <span className="text-muted-foreground">Mala proizvodnja, zanatsko umeće i vreme kao sastojak.</span>
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    id="predstavi"
                    className="bg-primary text-primary-foreground relative overflow-hidden px-5 py-20 text-center sm:px-8 lg:py-28"
                >
                    <div className="bg-primary-foreground/10 absolute inset-y-0 left-[8%] w-px" />
                    <div className="bg-primary-foreground/10 absolute inset-y-0 right-[8%] w-px" />
                    <div className="relative mx-auto max-w-3xl">
                        <Sprout className="text-gold mx-auto mb-6 size-8" />
                        <h2 className="font-serif text-4xl sm:text-6xl">Jeste li proizvođač?</h2>
                        <p className="text-primary-foreground/78 mx-auto mt-5 max-w-xl leading-7">
                            Otvorite svoju stranicu, postavite proizvode i primajte poruke ljudi koji traže domaće.
                        </p>
                        <Button asChild variant="cream" size="xl" className="mt-8">
                            <Link href={auth.user ? route('producers.create') : route('register')}>
                                Predstavi svoje proizvode <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                </section>
            </MarketplaceLayout>
        </>
    );
}
