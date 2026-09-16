import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Instagram, Leaf, MapPin, Menu, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-ajvar.jpg";
import familyImage from "@/assets/producer-family.jpg";
import cheeseImage from "@/assets/producer-cheese.jpg";
import honeyImage from "@/assets/producer-honey.jpg";
import storyImage from "@/assets/story-hands.jpg";
import productsImage from "@/assets/products-table.jpg";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ukusi našeg kraja | Domaći proizvođači Srbije" },
      { name: "description", content: "Upoznajte domaćinstva, ljude i proizvode koji čuvaju tradiciju širom Srbije." },
      { property: "og:title", content: "Ukusi našeg kraja | Domaći proizvođači Srbije" },
      { property: "og:description", content: "Upoznajte domaćinstva, ljude i proizvode koji čuvaju tradiciju širom Srbije." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const categories = [
  { name: "Ajvar i zimnica", image: heroImage, position: "object-[70%_65%]" },
  { name: "Suhomesnato", image: productsImage, position: "object-[72%_55%]" },
  { name: "Mlečni proizvodi", image: cheeseImage, position: "object-[65%_55%]" },
  { name: "Med", image: honeyImage, position: "object-[38%_52%]" },
  { name: "Slatko i džemovi", image: productsImage, position: "object-[55%_45%]" },
  { name: "Domaća pića", image: productsImage, position: "object-[88%_48%]" },
];

const producers = [
  { name: "Domaćinstvo Nićić", location: "Leskovac, Srbija", description: "Tri generacije, jedna receptura i paprika iz sopstvene bašte.", tags: ["Ajvar", "Zimnica"], image: familyImage },
  { name: "Mlekara Zapis", location: "Zlatibor, Srbija", description: "Planinski sirevi koji sazrevaju polako, baš kao nekada.", tags: ["Sir", "Kajmak"], image: cheeseImage },
  { name: "Pčelarstvo Jovanović", location: "Tara, Srbija", description: "Med sa livada daleko od puteva, prikupljen s pažnjom.", tags: ["Med", "Propolis"], image: honeyImage },
];

const products = [
  { name: "Domaći ajvar", place: "Leskovac", position: "object-[20%_58%]" },
  { name: "Zlatni med", place: "Tara", position: "object-[42%_28%]" },
  { name: "Šljiva slatko", place: "Šumadija", position: "object-[60%_35%]" },
  { name: "Čvarci", place: "Srem", position: "object-[72%_58%]" },
];

function Brand() {
  return <a href="#top" className="group inline-flex items-center gap-3" aria-label="Ukusi našeg kraja — početna">
    <span className="grid size-9 place-items-center rounded-full border border-primary/30 bg-primary text-primary-foreground"><Sprout className="size-4" /></span>
    <span className="font-serif text-[1.08rem] font-semibold leading-[1.05] text-foreground">Ukusi<br/><span className="text-primary">našeg kraja</span></span>
  </a>;
}

function Index() {
  return (
    <main id="top" className="overflow-hidden bg-background paper-grain">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-primary-foreground/15 text-primary-foreground">
        <div className="mx-auto flex h-20 max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm font-medium lg:flex" aria-label="Glavna navigacija">
            <a href="#top" className="transition-opacity hover:opacity-70">Početna</a>
            <a href="#proizvodjaci" className="transition-opacity hover:opacity-70">Proizvođači</a>
            <a href="#proizvodi" className="transition-opacity hover:opacity-70">Proizvodi</a>
            <a href="#o-nama" className="transition-opacity hover:opacity-70">O nama</a>
          </nav>
          <Button asChild variant="outlineLight" className="hidden sm:inline-flex"><a href="#predstavi">Predstavi svoje domaćinstvo</a></Button>
          <Button variant="outlineLight" size="icon" className="sm:hidden" aria-label="Otvori meni"><Menu /></Button>
        </div>
      </header>

      <section className="relative flex min-h-[720px] items-end overflow-hidden sm:min-h-[790px] lg:min-h-[min(900px,94vh)]">
        <img src={heroImage} alt="Priprema domaćeg ajvara u tradicionalnoj kuhinji" width={1600} height={1056} className="absolute inset-0 size-full object-cover object-[64%_center] image-warm" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--charcoal)_92%,transparent)_0%,color-mix(in_oklab,var(--charcoal)_68%,transparent)_42%,color-mix(in_oklab,var(--charcoal)_10%,transparent)_78%),linear-gradient(0deg,color-mix(in_oklab,var(--charcoal)_60%,transparent),transparent_52%)]" />
        <div className="relative mx-auto w-full max-w-[1380px] px-5 pb-16 pt-32 text-primary-foreground sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
          <div className="max-w-3xl reveal-up">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80"><span className="h-px w-9 bg-gold" /> Iz srca Srbije</p>
            <h1 className="max-w-2xl font-serif text-6xl font-medium leading-[0.97] sm:text-7xl lg:text-[6.6rem]">Ukusi našeg kraja.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-primary-foreground/85 sm:text-lg">Upoznajte domaćinstva, ljude i proizvode koji čuvaju tradiciju.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="cream" size="xl"><a href="#kategorije">Pronađi domaće <ArrowRight /></a></Button>
              <Button asChild variant="outlineLight" size="xl"><a href="#predstavi">Predstavi svoje domaćinstvo</a></Button>
            </div>
          </div>
          <div className="mt-14 flex items-center gap-4 text-xs uppercase tracking-[0.13em] text-primary-foreground/70"><Leaf className="size-4 text-gold"/><span>Od ljudi koje možete da upoznate</span></div>
        </div>
      </section>

      <section id="kategorije" className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Istražite ukuse</p><h2 className="font-serif text-4xl sm:text-5xl">Šta tražite?</h2></div>
          <a href="#proizvodi" className="hidden items-center gap-2 border-b border-foreground/30 pb-1 text-sm font-semibold md:flex">Pogledaj sve <ArrowRight className="size-4" /></a>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => <a key={category.name} href="#proizvodi" className="group relative aspect-[4/5] overflow-hidden rounded-md bg-muted">
            <img src={category.image} alt="" width={600} height={750} loading="lazy" className={`size-full object-cover image-warm transition duration-700 group-hover:scale-105 ${category.position}`} />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--charcoal)_75%,transparent),transparent_68%)]" />
            <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full border border-primary-foreground/35 text-[0.65rem] text-primary-foreground">0{index + 1}</span>
            <h3 className="absolute inset-x-4 bottom-4 font-serif text-lg leading-tight text-primary-foreground">{category.name}</h3>
          </a>)}
        </div>
      </section>

      <section id="proizvodjaci" className="bg-cream-deep py-20 lg:py-28">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
          <div className="mb-12 max-w-2xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ljudi i mesta</p><h2 className="font-serif text-4xl sm:text-5xl">Domaćinstva sa pričom.</h2><p className="mt-4 max-w-lg leading-7 text-muted-foreground">Ne samo imena na etiketi, već porodice, krajevi i recepti koji traju.</p></div>
          <div className="grid gap-8 md:grid-cols-3">
            {producers.map((producer) => <article key={producer.name} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted"><img src={producer.image} alt={producer.name} width={1200} height={912} loading="lazy" className="size-full object-cover image-warm transition duration-700 group-hover:scale-[1.025]" /></div>
              <div className="border-b border-border px-1 py-6">
                <div className="mb-3 flex flex-wrap gap-2">{producer.tags.map(tag => <span key={tag} className="rounded-full bg-olive-soft px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-olive">{tag}</span>)}</div>
                <h3 className="font-serif text-2xl">{producer.name}</h3>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-primary"><MapPin className="size-3.5" />{producer.location}</p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{producer.description}</p>
                <a href="#predstavi" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Pogledaj domaćinstvo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></a>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="o-nama" className="mx-auto grid max-w-[1380px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-20 lg:px-12 lg:py-32">
        <div className="relative"><div className="absolute -left-4 -top-4 hidden h-24 w-24 border-l border-t border-gold lg:block"/><img src={storyImage} alt="Dve generacije zajedno pripremaju domaću hranu" width={1200} height={912} loading="lazy" className="aspect-[5/4] w-full rounded-md object-cover image-warm"/><p className="absolute bottom-4 left-4 bg-background/95 px-4 py-3 font-serif text-sm italic shadow-sm">Znanje koje se prenosi rukama.</p></div>
        <div className="lg:pr-8"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Više od proizvoda</p><h2 className="font-serif text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">Iza svakog proizvoda stoje ljudi.</h2><p className="mt-7 text-lg leading-8 text-muted-foreground">Ovo je mesto za priče koje počinju u voćnjaku, pčelinjaku ili porodičnoj kuhinji — i nastavljaju se za vašim stolom.</p><div className="my-8 h-px w-full bg-border"/><div className="grid grid-cols-2 gap-6 text-sm leading-6"><p><strong className="mb-1 block font-serif text-lg text-foreground">Iz svog kraja</strong><span className="text-muted-foreground">Sastojci poznatog porekla i ukusi vezani za podneblje.</span></p><p><strong className="mb-1 block font-serif text-lg text-foreground">Svojim rukama</strong><span className="text-muted-foreground">Mala proizvodnja, zanatsko umeće i vreme kao sastojak.</span></p></div></div>
      </section>

      <section id="proizvodi" className="bg-charcoal py-20 text-primary-foreground lg:py-28">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
          <div className="mb-12 flex items-end justify-between"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold">Odabrano za vas</p><h2 className="font-serif text-4xl sm:text-5xl">Ukusi koji se pamte.</h2></div><p className="hidden max-w-sm text-sm leading-6 text-primary-foreground/60 md:block">Mali izbor proizvoda koji nose miris sezone i potpis svog domaćina.</p></div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4 lg:gap-6">
            {products.map(product => <article key={product.name} className="group"><div className="aspect-[4/5] overflow-hidden rounded-md bg-muted"><img src={productsImage} alt={product.name} width={750} height={945} loading="lazy" className={`size-full scale-[1.55] object-cover image-warm transition duration-700 group-hover:scale-[1.6] ${product.position}`} /></div><div className="pt-4"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold">{product.place}</p><h3 className="mt-1 font-serif text-xl sm:text-2xl">{product.name}</h3><p className="mt-2 text-xs text-primary-foreground/55">Iz domaćinstva, u malim serijama</p></div></article>)}
          </div>
        </div>
      </section>

      <section id="predstavi" className="relative overflow-hidden bg-primary px-5 py-20 text-center text-primary-foreground sm:px-8 lg:py-28">
        <div className="absolute inset-y-0 left-[8%] w-px bg-primary-foreground/10"/><div className="absolute inset-y-0 right-[8%] w-px bg-primary-foreground/10"/>
        <div className="relative mx-auto max-w-3xl"><Sprout className="mx-auto mb-6 size-8 text-gold"/><h2 className="font-serif text-4xl sm:text-6xl">Imate svoje domaćinstvo?</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-primary-foreground/78">Predstavite svoje proizvode i priču ljudima koji traže domaće.</p><Button asChild variant="cream" size="xl" className="mt-8"><a href="mailto:zdravo@ukusinasegkraja.rs">Predstavi svoje domaćinstvo <ArrowRight /></a></Button></div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto max-w-[1380px] px-5 py-14 sm:px-8 lg:px-12"><div className="grid gap-10 border-b border-border pb-12 md:grid-cols-[1.4fr_1fr_1fr]"><div><Brand/><p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">Mesto gde upoznajete ljude, domaćinstva i ukuse našeg kraja.</p></div><div><p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Istražite</p><nav className="grid gap-3 text-sm"><a href="#proizvodjaci">Proizvođači</a><a href="#proizvodi">Proizvodi</a><a href="#o-nama">O nama</a></nav></div><div><p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Budimo u kontaktu</p><a className="text-sm" href="mailto:zdravo@ukusinasegkraja.rs">zdravo@ukusinasegkraja.rs</a><div className="mt-5 flex items-center gap-4"><a href="#top" aria-label="Instagram"><Instagram className="size-5" /></a><a href="#top" aria-label="Facebook" className="font-serif text-lg font-bold">f</a></div></div></div><div className="flex flex-col gap-2 pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between"><p>© 2026 Ukusi našeg kraja</p><p>Pažljivo birano. Od srca predstavljeno.</p></div></div>
      </footer>
    </main>
  );
}
