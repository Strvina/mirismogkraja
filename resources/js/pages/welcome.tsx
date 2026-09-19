import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Leaf, MapPin, Sprout } from 'lucide-react';

import heroImage from '../assets/hero-ajvar.jpg';
import cheeseImage from '../assets/producer-cheese.jpg';
import familyImage from '../assets/producer-family.jpg';
import honeyImage from '../assets/producer-honey.jpg';
import productsImage from '../assets/products-table.jpg';
import storyImage from '../assets/story-hands.jpg';

// Real content comes from the database (tasks 5-7); only the imagery is
// still placeholder, cycled over whatever rows come back.
const categoryImages = [
    { image: heroImage, position: 'object-[70%_65%]' },
    { image: productsImage, position: 'object-[72%_55%]' },
    { image: cheeseImage, position: 'object-[65%_55%]' },
    { image: honeyImage, position: 'object-[38%_52%]' },
    { image: productsImage, position: 'object-[55%_45%]' },
    { image: productsImage, position: 'object-[88%_48%]' },
];

const producerImages = [familyImage, cheeseImage, honeyImage];

const productPositions = ['object-[20%_58%]', 'object-[42%_28%]', 'object-[60%_35%]', 'object-[72%_58%]'];

interface HomeProducer {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    description: string | null;
    tags: string[];
}

interface HomeProduct {
    id: number;
    name: string;
    slug: string;
    city: string | null;
}

interface HomeCategory {
    id: number;
    name: string;
}

export default function Welcome({
    producers,
    products,
    categories,
}: {
    producers: HomeProducer[];
    products: HomeProduct[];
    categories: HomeCategory[];
}) {
    const { auth } = usePage<SharedData>().props;
    const becomeSellerHref = auth.user ? route('producers.create') : route('register');

    return (
        <>
            <Head title="Vrelina juga | Domaći proizvođači sa juga Srbije">
                <meta
                    name="description"
                    content="Upoznajte proizvođače, ljude i proizvode koji čuvaju tradiciju juga Srbije."
                />
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
                    <div className="relative mx-auto w-full max-w-[1380px] px-5 pt-20 pb-16 text-primary-foreground sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
                        <div className="reveal-up max-w-3xl">
                            <p className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-primary-foreground/80 uppercase">
                                <span className="h-px w-9 bg-gold" /> Iz srca juga Srbije
                            </p>
                            <h1 className="max-w-2xl font-serif text-6xl leading-[0.97] font-medium sm:text-7xl lg:text-[6.6rem]">
                                Vrelina juga.
                            </h1>
                            <p className="mt-7 max-w-xl text-base leading-7 text-primary-foreground/85 sm:text-lg">
                                Upoznajte proizvođače, ljude i proizvode koji čuvaju tradiciju.
                            </p>
                            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                                <Button asChild variant="cream" size="xl">
                                    <Link href={route('marketplace.producers.index')}>
                                        Pronađi domaće <ArrowRight />
                                    </Link>
                                </Button>
                                <Button asChild variant="outlineLight" size="xl">
                                    <Link href={becomeSellerHref}>Predstavi svog proizvođača</Link>
                                </Button>
                            </div>
                        </div>
                        <div className="mt-14 flex items-center gap-4 text-xs tracking-[0.13em] text-primary-foreground/70 uppercase">
                            <Leaf className="size-4 text-gold" />
                            <span>Od ljudi koje možete da upoznate</span>
                        </div>
                    </div>
                </section>

                <section id="kategorije" className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
                    <div className="mb-10 flex items-end justify-between gap-6">
                        <div>
                            <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase">Istražite ukuse</p>
                            <h2 className="font-serif text-4xl sm:text-5xl">Šta tražite?</h2>
                        </div>
                        <Link
                            href={route('marketplace.products.index')}
                            className="hidden items-center gap-2 border-b border-foreground/30 pb-1 text-sm font-semibold md:flex"
                        >
                            Pogledaj sve <ArrowRight className="size-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                        {categories.map((category, index) => (
                            <Link
                                key={category.id}
                                href={route('marketplace.products.index', { category_id: category.id })}
                                className="group relative aspect-[4/5] overflow-hidden rounded-md bg-muted"
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
                                <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full border border-primary-foreground/35 text-[0.65rem] text-primary-foreground">
                                    0{index + 1}
                                </span>
                                <h3 className="absolute inset-x-4 bottom-4 font-serif text-lg leading-tight text-primary-foreground">
                                    {category.name}
                                </h3>
                            </Link>
                        ))}
                    </div>
                </section>

                <section id="proizvodjaci" className="bg-cream-deep py-20 lg:py-28">
                    <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
                        <div className="mb-12 max-w-2xl">
                            <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase">Ljudi i mesta</p>
                            <h2 className="font-serif text-4xl sm:text-5xl">Proizvođači sa pričom.</h2>
                            <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
                                Ne samo imena na etiketi, već porodice, krajevi i recepti koji traju.
                            </p>
                        </div>
                        <div className="grid gap-8 md:grid-cols-3">
                            {producers.map((producer, index) => (
                                <article key={producer.id} className="group">
                                    <Link href={route('marketplace.producers.show', producer.slug)}>
                                        <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted">
                                            <img
                                                src={producerImages[index % producerImages.length]}
                                                alt={producer.name}
                                                width={1200}
                                                height={912}
                                                loading="lazy"
                                                className="image-warm size-full object-cover transition duration-700 group-hover:scale-[1.025]"
                                            />
                                        </div>
                                    </Link>
                                    <div className="border-b border-border px-1 py-6">
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {producer.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-full bg-olive-soft px-3 py-1 text-[0.68rem] font-semibold tracking-[0.08em] text-olive uppercase"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <h3 className="font-serif text-2xl">
                                            <Link href={route('marketplace.producers.show', producer.slug)}>{producer.name}</Link>
                                        </h3>
                                        {producer.city && (
                                            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] text-primary uppercase">
                                                <MapPin className="size-3.5" />
                                                {producer.city}
                                            </p>
                                        )}
                                        <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{producer.description}</p>
                                        <Link
                                            href={route('marketplace.producers.show', producer.slug)}
                                            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
                                        >
                                            Pogledaj proizvođača{' '}
                                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    id="o-nama"
                    className="mx-auto grid max-w-[1380px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-20 lg:px-12 lg:py-32"
                >
                    <div className="relative">
                        <div className="absolute -top-4 -left-4 hidden h-24 w-24 border-t border-l border-gold lg:block" />
                        <img
                            src={storyImage}
                            alt="Dve generacije zajedno pripremaju domaću hranu"
                            width={1200}
                            height={912}
                            loading="lazy"
                            className="image-warm aspect-[5/4] w-full rounded-md object-cover"
                        />
                        <p className="absolute bottom-4 left-4 bg-background/95 px-4 py-3 font-serif text-sm italic shadow-sm">
                            Znanje koje se prenosi rukama.
                        </p>
                    </div>
                    <div className="lg:pr-8">
                        <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-primary uppercase">Više od proizvoda</p>
                        <h2 className="font-serif text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">Iza svakog proizvoda stoje ljudi.</h2>
                        <p className="mt-7 text-lg leading-8 text-muted-foreground">
                            Ovo je mesto za priče koje počinju u voćnjaku, pčelinjaku ili porodičnoj kuhinji — i nastavljaju se za vašim
                            stolom.
                        </p>
                        <div className="my-8 h-px w-full bg-border" />
                        <div className="grid grid-cols-2 gap-6 text-sm leading-6">
                            <p>
                                <strong className="mb-1 block font-serif text-lg text-foreground">Sa juga Srbije</strong>
                                <span className="text-muted-foreground">Sastojci poznatog porekla i ukusi vezani za podneblje.</span>
                            </p>
                            <p>
                                <strong className="mb-1 block font-serif text-lg text-foreground">Svojim rukama</strong>
                                <span className="text-muted-foreground">Mala proizvodnja, zanatsko umeće i vreme kao sastojak.</span>
                            </p>
                        </div>
                    </div>
                </section>

                <section id="proizvodi" className="bg-charcoal py-20 text-primary-foreground lg:py-28">
                    <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
                        <div className="mb-12 flex items-end justify-between">
                            <div>
                                <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-gold uppercase">Odabrano za vas</p>
                                <h2 className="font-serif text-4xl sm:text-5xl">Ukusi koji se pamte.</h2>
                            </div>
                            <p className="hidden max-w-sm text-sm leading-6 text-primary-foreground/60 md:block">
                                Mali izbor proizvoda koji nose miris sezone i potpis svog domaćina.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4 lg:gap-6">
                            {products.map((product, index) => (
                                <Link
                                    key={product.id}
                                    href={route('marketplace.products.show', product.slug)}
                                    className="group"
                                >
                                    <div className="aspect-[4/5] overflow-hidden rounded-md bg-muted">
                                        <img
                                            src={productsImage}
                                            alt={product.name}
                                            width={750}
                                            height={945}
                                            loading="lazy"
                                            className={`image-warm size-full scale-[1.55] object-cover transition duration-700 group-hover:scale-[1.6] ${productPositions[index % productPositions.length]}`}
                                        />
                                    </div>
                                    <div className="pt-4">
                                        {product.city && (
                                            <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-gold uppercase">
                                                {product.city}
                                            </p>
                                        )}
                                        <h3 className="mt-1 font-serif text-xl sm:text-2xl">{product.name}</h3>
                                        <p className="mt-2 text-xs text-primary-foreground/55">Od proizvođača, u malim serijama</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    id="predstavi"
                    className="relative overflow-hidden bg-primary px-5 py-20 text-center text-primary-foreground sm:px-8 lg:py-28"
                >
                    <div className="absolute inset-y-0 left-[8%] w-px bg-primary-foreground/10" />
                    <div className="absolute inset-y-0 right-[8%] w-px bg-primary-foreground/10" />
                    <div className="relative mx-auto max-w-3xl">
                        <Sprout className="mx-auto mb-6 size-8 text-gold" />
                        <h2 className="font-serif text-4xl sm:text-6xl">Jeste li proizvođač?</h2>
                        <p className="mx-auto mt-5 max-w-xl leading-7 text-primary-foreground/78">
                            Predstavite svoje proizvode i priču ljudima koji traže domaće.
                        </p>
                        <Button asChild variant="cream" size="xl" className="mt-8">
                            <Link href={becomeSellerHref}>
                                Predstavi svog proizvođača <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                </section>

            </MarketplaceLayout>
        </>
    );
}
