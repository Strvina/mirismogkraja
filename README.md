# Vrelina juga

Marketplace za male proizvođače sa juga Srbije: med, ajvar, sir, rakija i ostalo domaće. Platforma
**nije prodavnica**. Nema korpe ni plaćanja na sajtu. Kupac nađe proizvod i pošalje upit, a oko
količine, cene i dostave se dve strane dogovaraju direktno, u porukama na sajtu.

Platforma zarađuje od proizvođača. Postoje članarine (Basic, Premium, Pro), plaćeno isticanje
profila ili proizvoda i sezonske kampanje. Sve se plaća uplatnicom sa IPS QR kodom, a admin
potvrđuje uplatu.

## Ko šta može

| Uloga | Šta može |
| --- | --- |
| **Posetilac** | Pretraga i filteri proizvoda i proizvođača, stranice kategorija, mapa i „Najbliži meni“, profili proizvođača, na srpskom, engleskom ili ruskom |
| **Kupac** | Upit sa stranice proizvoda i dopisivanje, praćenje proizvođača, sačuvani proizvodi, „Javi mi kad stigne“, utisak o proizvođaču (tek kad mu se proizvođač javi), prijava problema |
| **Proizvođač** | Svoja stranica i proizvodi (slike, sezona, zalihe), odgovori kupcima i na utiske, statistika, QR poster za tezgu, članarina, isticanje i kampanje |
| **Admin** | Odobravanje proizvođača, moderacija utisaka, prijava i proizvoda, potvrda uplata, cene i paketi, proizvođač nedelje, log aktivnosti |

Uloge se mogu kombinovati: proizvođač je i kupac kod drugih.

## Tehnologije

- **Backend:** Laravel 12 (PHP 8.2+), MySQL 8 / MariaDB 10.4+ (SQLite za testove)
- **Frontend:** Inertia.js 2, React 19 + TypeScript, Tailwind CSS 4, Radix UI
- **Uloge:** Spatie `laravel-permission` (buyer, seller, admin)
- **Ostalo:** dompdf i endroid/qr-code (uplatnice i poster), Leaflet + OpenStreetMap (mapa), Sentry (greške)

## Kako je organizovano

- **Rute** su podeljene po oblasti u `routes/*.php`. Na primer `marketplace.php` za javne strane,
  `messages.php`, `memberships.php` i `admin.php`.
- **Kontroleri su tanki**: validacija, pa poziv servisa, pa odgovor. Poslovna logika je u `app/Services`
  (članarine, isticanje, statistika, vreme odgovora, uplatnice) i `app/Support`
  (pretraga, mediji, QR, slugovi).
- **Autorizacija** ide preko Policy klasa u `app/Policies` za proizvođače, proizvode, poruke i utiske,
  ne preko provera razbacanih po kontrolerima.
- **Slike** idu kroz `App\Support\Media` (upload, male verzije, brisanje). Mesto čuvanja bira `MEDIA_DISK`:
  lokalno ili S3/CDN.
- **Obaveštenja:** zvono na sajtu za sve, mejl za nepročitane poruke i za ono što je kupac sam tražio
  („Javi mi kad stigne“).
- **Prevodi:** srpski tekst u kodu je ključ, a `lang/en.json` i `lang/ru.json` su prevodi.
- **Dizajn:** vizuelni identitet je preuzet iz `design-reference/` (prvobitni landing page).
  Paleta i fontovi su opisani u `docs/design-tokens.md`.

Šema baze je u [docs/database.md](docs/database.md), a pokretanje na serveru i rast u
[docs/deploy.md](docs/deploy.md) i [docs/scaling.md](docs/scaling.md).

## Lokalno pokretanje

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
composer run dev
```

Sajt je na `http://127.0.0.1:8000`.

Na Windows-u u PowerShell-u koristite `npm.cmd` umesto `npm`, ili radite u Git Bash-u.

`php artisan migrate --seed` lokalno puni bazu demo sadržajem: proizvođači, proizvodi, razgovori, utisci i
uplate u svim stanjima. Demo nalozi su `admin@gmail.com` / `admin` i `marko@example.com` / `password`.
Na produkciji isti seeder pravi samo uloge, kategorije i pakete. Administrator se tamo pravi sa
`php artisan admin:create`.

## Testovi

```bash
php artisan test            # PHP: feature i unit testovi
npm run build && npm run test:e2e   # u pravom pregledaču (Playwright), prvi put i: npx playwright install chromium
vendor/bin/pint --test      # stil PHP koda
npm run lint && npx tsc --noEmit && npm run format:check
```

Testovi u pregledaču podižu svoj sajt sa sopstvenom bazom (`storage/e2e.sqlite`), pa ne diraju vašu
bazu ni `composer dev`.

CI (`.github/workflows`) na svaki pull request pokreće PHP testove na SQLite-u i na MySQL-u, testove u
pregledaču i proveru stila.
