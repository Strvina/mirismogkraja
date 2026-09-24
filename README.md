# Vrelina juga

SaaS marketplace koji povezuje mala domaćinstva i poljoprivredna gazdinstva sa juga Srbije direktno
sa kupcima. Platforma **nije prodavnica**: nema korpe ni naplate - kupac pošalje upit sa stranice
proizvoda, a oko količine, cene i dostave se dve strane dogovaraju direktno. Korisnik može biti
**kupac** (buyer), **proizvođač** koji je otvorio svoju stranicu (seller), ili oboje istovremeno.
Platforma ima i **admin panel** za odobravanje proizvođača, upravljanje korisnicima i proizvodima,
i moderaciju utisaka.

## Tehnologije

- **Backend**: Laravel 12 (PHP 8.2+), Inertia.js
- **Frontend**: React 19 + TypeScript, Tailwind CSS v4, shadcn/ui komponente
- **Autorizacija**: Spatie `laravel-permission` (role buyer/seller/admin)
- **Testovi**: Pest/PHPUnit (185 testova, feature nivo)
- **Baza**: SQLite (dev), migracije spremne za MySQL/Postgres u produkciji

Projekat je zasnovan na `laravel/react-starter-kit` template-u.

## Uloge i mogućnosti

| Uloga | Šta može |
| --- | --- |
| **Gost** | Pregleda javnu listu/pretragu domaćinstava i proizvoda, javne stranice domaćinstva i proizvoda |
| **Kupac (buyer)** | Registracija/login, slanje upita sa stranice proizvoda i dopisivanje sa proizvođačem, utisak o proizvođaču (tek pošto mu se proizvođač javi, i pošto admin odobri utisak), omiljeni proizvođači/proizvodi |
| **Proizvođač (seller)** | Sve što i kupac, plus: kreiranje/uređivanje sopstvenih stranica proizvođača (kreiranje automatski dodeljuje seller rolu), CRUD nad sopstvenim proizvodima i njihovim slikama, galerija, i odgovaranje na upite kupaca |
| **Admin** | Evidencija (korisnici, proizvođači, proizvodi, razgovori, poruke), upravljanje korisnicima (role, blokiranje naloga), odobravanje/blokiranje proizvođača, brisanje proizvoda, CRUD kategorija, moderacija utisaka (odobri/odbij/obriši) i log aktivnosti |

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
proizvoda, i demo sadržajem (proizvođači sa proizvodima i slikama, razgovori u različitim stanjima,
objavljeni utisci i jedan koji čeka odobrenje) - dovoljno da se sve funkcionalnosti, uključujući
moderaciju, odmah isprobaju bez ručnog unosa podataka.

## Testiranje

```bash
php artisan test
```

185 testova pokriva: registraciju/login, dodelu rola, CRUD za proizvođače/proizvode (sa
autorizacijom), upload slika, upite i dopisivanje, utiske (može ih ostaviti samo prijavljeni
korisnik kome se proizvođač javio, i vidljivi su tek posle odobrenja), omiljene, rangiranje na
početnoj strani, kompletan admin panel, i bezbednosni audit autorizacije.

Stil koda se proverava preko Laravel Pint-a:

```bash
vendor/bin/pint --test
```

## Autor

Vladimir
