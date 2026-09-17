# Dizajn tokeni (izvučeno iz `design-reference/`)

Izvor: `design-reference/src/styles.css`, `src/components/ui/*`, `src/routes/index.tsx`.
Ovo je referenca za sve nove stranice/komponente (vidi CLAUDE.md - `/design-reference` je jedini
izvor istine za vizuelni identitet).

**Napomena o stack neslaganju**: `design-reference` je TanStack Router + Vite SPA/SSR projekat, dok
je naš projekat Laravel + Inertia + React. Ne možemo direktno kopirati `routes/`, `router.tsx`,
`server.ts` itd. - te fajlove ignorišemo. Ono što JESTE prenosivo: Tailwind theme (`styles.css`),
`components/ui/*` (shadcn komponente, framework-agnostic React), `lib/utils.ts` (cn helper),
ikonice (lucide-react), i vizuelni obrasci (spacing, tipografija, layout sekcija) opisani ispod.

**Napomena o imenu brenda**: landing page je brendiran kao "Ukusi našeg kraja" (naslovi, meta tagovi,
email `zdravo@ukusinasegkraja.rs`), dok je naš projekat nazvan "Miris mog kraja" (CLAUDE.md). Treba
odlučiti finalno ime pre nego što kopiramo copy tekstove doslovno - vizuelni stil ostaje isti,
menja se samo tekst/brend.

## Fontovi

- `--font-sans: "Manrope", sans-serif` - telo teksta, UI elementi, dugmad, navigacija
- `--font-serif: "Lora", serif` - naslovi (h1-h3), "eyebrow" akcenti u citatima

**Bitno**: `design-reference` ne učitava ova dva fonta ni preko `<link>` ni preko npm paketa (nema
`@fontsource/*` u `package.json`) - vizuelno se oslanja na fallback ako fontovi nisu instalirani na
mašini. U našem projektu moramo eksplicitno dodati Google Fonts (`Manrope` + `Lora`, sa italic i
nekoliko weight-ova, npr. 400/500/600/700) - preko `<link>` u `resources/views/app.blade.php` ili
`@import` u `resources/css/app.css`.

## Boje (Tailwind v4 `@theme inline`, oklch format)

Semantičke (menjaju se light/dark preko `:root` / `.dark`):

| Token | Light (oklch) | Namena |
| --- | --- | --- |
| `background` | `0.972 0.017 80` | pozadina stranice (toplo krem) |
| `foreground` | `0.245 0.025 48` | osnovni tekst |
| `card` | `0.992 0.009 80` | pozadina kartica |
| `primary` | `0.48 0.17 29` | glavna boja brenda (zagasita cigla/terakota-crvena) |
| `primary-foreground` | `0.985 0.012 83` | tekst na primary pozadini |
| `secondary` | `0.88 0.035 76` | sekundarna, topla bež |
| `muted` / `muted-foreground` | `0.935 0.022 80` / `0.47 0.03 54` | prigušene pozadine/tekst |
| `accent` | `0.61 0.06 92` | akcent, blaga senf/maslinasta |
| `destructive` | `0.577 0.245 27.325` | greške/opasne akcije |
| `border` / `input` | `0.86 0.027 74` | linije, okviri inputa |
| `ring` | `0.48 0.17 29` (= primary) | focus ring |

Dodatne "brand" boje (nisu light/dark zavisne, fiksne):

| Token | oklch | Namena |
| --- | --- | --- |
| `cream-deep` | `0.925 0.033 78` | pozadina sekcija (npr. "Domaćinstva sa pričom") |
| `olive` / `olive-soft` | `0.42 0.055 116` / `0.9 0.035 112` | tag/badge boje (npr. kategorije proizvoda) |
| `terracotta` | `0.6 0.115 42` | akcentna, toplija varijanta primary-ja |
| `gold` | `0.7 0.09 83` | sitni akcenti (linije, ikonice, "eyebrow" tekst na tamnoj pozadini) |
| `charcoal` | `0.21 0.022 50` | tamna pozadina (npr. sekcija sa proizvodima), tamni overlay preko slika |

Sve boje su definisane u `oklch()` formatu - to pravilo prenosimo i u naš `tailwind.config`/`app.css`,
ne mešati sa hex/rgb.

## Radius

Baza: `--radius: 0.45rem`, derivati: `sm = radius - 4px`, `md = radius - 2px`, `lg = radius`,
`xl = radius + 4px`, `2xl = +8px`, `3xl = +12px`, `4xl = +16px`. U praksi se najviše koristi
`rounded-md` (dugmad, slike/kartice) i `rounded-xl` (Card komponenta) i `rounded-full` (badge/tag,
brand ikonica).

## Layout / spacing konvencije

- Kontejner: `mx-auto max-w-[1380px]`
- Horizontalni padding kontejnera: `px-5 sm:px-8 lg:px-12`
- Vertikalni padding sekcije: `py-20 lg:py-28` (veće hero/CTA sekcije idu do `lg:py-32`)
- Razmak grid/flex elemenata: `gap-3` do `gap-8` u zavisnosti od gustine sadržaja
- "Eyebrow" labela iznad naslova: `text-xs font-semibold uppercase tracking-[0.16em] text-primary`
- Naslovi sekcija: `font-serif text-4xl sm:text-5xl` (hero H1 ide do `text-7xl`/`text-[6.6rem]`)
- Telo teksta: `text-sm`/`text-base` sa `leading-6`/`leading-7`/`leading-8` (generozan line-height)

## Button (`components/ui/button.tsx`)

Bazna klasa: `inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors`.

Varijante: `default`, `warm` (= primary, koristi se na tamnim pozadinama), `cream` (svetlo dugme na
tamnoj/primary pozadini), `outlineLight` (providno dugme sa svetlim okvirom, za hero/header na slici),
`destructive`, `outline`, `secondary`, `ghost`, `link`.

Veličine: `default` (h-9), `sm` (h-8), `lg` (h-10), `xl` (h-12, uppercase, širi tracking - koristi se
za glavne CTA dugmad), `icon` (kvadratno, h-9 w-9).

## Card (`components/ui/card.tsx`)

`Card` = `rounded-xl border bg-card text-card-foreground shadow`. Sastavni delovi: `CardHeader`
(`p-6`, `space-y-1.5`), `CardTitle` (`font-semibold tracking-tight`), `CardDescription`
(`text-sm text-muted-foreground`), `CardContent` (`p-6 pt-0`), `CardFooter` (`flex p-6 pt-0`).

U landing page-u se "kartice" proizvoda/proizvođača često ne koriste kroz `Card` komponentu direktno
nego kao custom `<article>` sa istim vizuelnim jezikom (`rounded-md`, `bg-muted`, `aspect-[4/5]` ili
`aspect-[4/3]` slika, hover `scale-105` na slici) - taj obrazac treba pratiti za liste proizvoda i
domaćinstava.

## Ostale komponente dostupne u `components/ui/`

Kompletan shadcn/ui "new-york" stil (Radix primitives + `class-variance-authority`): accordion,
alert(-dialog), avatar, badge, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command,
context-menu, dialog, drawer, dropdown-menu, form, hover-card, input(-otp), label, menubar,
navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select,
separator, sheet, sidebar, skeleton, slider, sonner (toast), switch, table, tabs, textarea,
toggle(-group), tooltip. Ikonice: `lucide-react`. Sve ovo prenosimo direktno u naš projekat (task 0.6),
uz zamenu import alias-a ako se razlikuju.

## Navbar (iz `routes/index.tsx`)

Fiksiran preko hero slike (`absolute inset-x-0 top-0`), providna pozadina sa `text-primary-foreground`
dok je preko hero slike. Sadrži: brend logo (kružna ikonica + serif naziv u dva reda), horizontalnu
navigaciju (`gap-8 text-sm font-medium`, samo na `lg:flex`), CTA dugme (`outlineLight`), i hamburger
(`Menu` ikonica, `sm:hidden`) za mobilni prikaz. Visina `h-20`.

## Footer

`bg-background`, kontejner istih dimenzija kao ostatak sajta. Grid od 3 kolone
(`md:grid-cols-[1.4fr_1fr_1fr]`): brend + kratak opis, lista linkova ("Istražite"), kontakt +
društvene mreže. Ispod, `border-t`-odvojen red sa copyright tekstom i sloganom, `text-xs
text-muted-foreground`, `flex-col` na mobilnom / `flex-row justify-between` na desktopu.

## Efekti / utility klase specifične za ovaj dizajn

- `.paper-grain` - suptilna teksturna pozadina (radial-gradient tačkice), koristi se na `<main>`
- `.image-warm` - `filter: saturate(0.88) sepia(0.05) contrast(1.02)` - "topli" filter na svim
  fotografijama proizvoda/domaćinstava, daje utisak tradicionalne/analogne fotografije
- `.reveal-up` - fade+slide-up animacija pri učitavanju hero sadržaja (poštuje
  `prefers-reduced-motion`)

Sve tri vredi preneti u naš `app.css` i koristiti dosledno (npr. `image-warm` na svim slikama
proizvoda/domaćinstava, `paper-grain` na `<main>` wrapperu javnih stranica).
