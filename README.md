# Vrelina juga

SaaS marketplace koji povezuje mala domaćinstva i poljoprivredna gazdinstva sa juga Srbije direktno
sa kupcima. Korisnik može biti **kupac** (buyer), **prodavac** koji je registrovao svoje domaćinstvo
(seller), ili oboje istovremeno. Platforma ima i **admin panel** za odobravanje domaćinstava,
upravljanje korisnicima, proizvodima, porudžbinama i moderaciju sadržaja.

## Tehnologije

- **Backend**: Laravel 12 (PHP 8.2+), Inertia.js
- **Frontend**: React 19 + TypeScript, Tailwind CSS v4, shadcn/ui komponente
- **Autorizacija**: Spatie `laravel-permission` (role buyer/seller/admin)
- **Testovi**: Pest/PHPUnit (159 testova, feature nivo)
- **Baza**: SQLite (dev), migracije spremne za MySQL/Postgres u produkciji

Projekat je zasnovan na `laravel/react-starter-kit` template-u.

## Uloge i mogućnosti

| Uloga | Šta može |
| --- | --- |
| **Gost** | Pregleda javnu listu/pretragu domaćinstava i proizvoda, javne stranice domaćinstva i proizvoda |
| **Kupac (buyer)** | Registracija/login, korpa, checkout, praćenje sopstvenih porudžbina, ocenjivanje domaćinstva (samo posle isporučene porudžbine), omiljeni proizvođači/proizvodi |
| **Prodavac (seller)** | Sve što i kupac, plus: kreiranje/uređivanje sopstvenih domaćinstava (kreiranje domaćinstva automatski dodeljuje seller rolu), CRUD nad sopstvenim proizvodima i njihovim slikama, promena statusa porudžbina koje ispunjava |
| **Admin** | Dashboard sa statistikom (korisnici, domaćinstva, proizvodi, porudžbine, prihod), upravljanje korisnicima (role, blokiranje naloga), odobravanje/blokiranje domaćinstava, brisanje proizvoda, CRUD kategorija, pregled svih porudžbina, moderacija ocena |

## Arhitektura i konvencije

- **Rute** su podeljene po domenu u zasebne fajlove (`routes/households.php`, `routes/products.php`,
  `routes/cart.php`, `routes/orders.php`, `routes/favorites.php`, `routes/admin.php`,
  `routes/marketplace.php`) umesto svega u `web.php`.
- **Poslovna logika** živi u `app/Services/*` (npr. `HouseholdService`, `CheckoutService`,
  `OrderStatusService`), ne u kontrolerima - kontroleri ostaju tanki (validacija preko Form Request-a
  → poziv servisa → redirect).
- **Autorizacija** ide preko Laravel Policy klasa (`app/Policies/*`) za svaki model koji ima
  vlasništvo (Household, Product, Order, Review, CartItem), ne preko ručnih provera u kontroleru.
  Vidi `tests/Feature/SecurityAuthorizationAuditTest.php` za konsolidovan pregled IDOR zaštite.
- **Dizajn** je preuzet iz `design-reference/` (Lovable-generisan landing page) - `docs/design-tokens.md`
  dokumentuje paletu boja, fontove i komponente koje su prenete u ovaj projekat.
- **Struktura baze** je dokumentovana u `docs/database.md` (ER dijagram + opis svake tabele).
- **Plan projekta** (svi taskovi po fazama) je u `docs/plan.md`, praćen i kao GitHub Issues/Project
  board.

## Pokretanje projekta lokalno

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan storage:link
composer run dev
```

`composer run dev` pokreće Laravel server, queue listener i Vite dev server istovremeno.
Aplikacija je dostupna na `http://127.0.0.1:8000`.

`php artisan migrate --seed` puni bazu sa: 3 role (buyer/seller/admin), 9 osnovnih kategorija
proizvoda, i demo sadržajem (2 domaćinstva sa po 9 proizvoda, 3 kupca sa porudžbinama u različitim
statusima, jedna ocena, i jedna nedovršena korpa) - dovoljno da se sve funkcionalnosti odmah
isprobaju bez ručnog unosa podataka.

## Testiranje

```bash
php artisan test
```

159 testova pokriva: registraciju/login, dodelu rola, CRUD za domaćinstva/proizvode (sa
autorizacijom), upload slika, korpu, checkout (uključujući snapshot cene - izmena cene proizvoda ne
utiče na već napravljene porudžbine), promenu statusa porudžbine, ocene (samo kupac sa isporučenom
porudžbinom može da oceni), omiljene, kompletan admin panel, i bezbednosni audit autorizacije.

Stil koda se proverava preko Laravel Pint-a:

```bash
vendor/bin/pint --test
```

## Autor

Vladimir
