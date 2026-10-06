# Vrelina juga — kontekst projekta

Sažeto stanje projekta, da se ne oslanjamo na istoriju razgovora. Pravila rada su u `CLAUDE.md`;
ovde je **šta postoji, kako radi i šta je odlučeno**.

Održavanje: posle svake značajne izmene (baza, dozvole, poslovna pravila, arhitektura, nova
funkcionalnost) ispravi odgovarajući odeljak. Zastarelo zameni, ne dopisuj. Bez koda i bez spiskova
fajlova koji se vide iz repoa. Ako pređe ~250 redova, sažmi.

Poslednja izmena: 2026-10-06 (posle zadatka 120).

## 1. Šta je ovo

Sajt koji povezuje male proizvođače hrane sa juga Srbije i kupce. **Nije prodavnica**: nema korpe,
porudžbina ni plaćanja kupaca. Kupac pošalje upit, dogovor ide u porukama ili telefonom.

Zarada dolazi samo od proizvođača: članarine (Basic 2.990, Premium 5.990, Pro 9.990 RSD godišnje),
isticanje profila ili proizvoda (1.000 / 800 RSD za 7 dana) i sezonske kampanje. Sve se plaća
**uplatnicom** (IPS QR), a admin ručno potvrđuje uplatu. Nema platnog provajdera.

Jezici: srpski (izvor), engleski, ruski.

## 2. Stek

- Laravel 12, PHP 8.2+, MySQL/MariaDB (SQLite u testovima)
- Inertia v2 + React 19 + TypeScript, Tailwind v4, bez SSR-a
- Spatie permission (uloge `buyer`, `seller`, `admin`), Ziggy, Socialite (Google), Sentry
- PHPUnit (`tests/`), Playwright (`e2e/`), pint + prettier + eslint + tsc
- CI: `.github/workflows/tests.yml` (sqlite, mysql, browser) i `lint.yml`, na `master`

## 3. Gde šta živi

| Mesto | Šta |
|---|---|
| `app/Http/Controllers` | Vlasnikove stranice (proizvođač, proizvodi, poruke, plaćeno) |
| `…/Marketplace` | Javne stranice (lista i profil proizvođača, proizvodi, katalog, priče) |
| `…/Admin` | Admin panel |
| `app/Services` | Poslovna logika (članarine, isticanje, osnivači, preporuke, statistika, Google) |
| `app/Support` | Pomoćne klase bez stanja (`Media`, `Search`, `PageMeta`, `UniqueSlug`, `Qr`) |
| `app/Notifications/SiteNotification` | Sva obaveštenja, jedna klasa sa imenovanim konstruktorima |
| `routes/*.php` | Po oblasti; `web.php` ih samo učitava |
| `resources/js/pages` | Inertia stranice, mala slova (`config/inertia.php`) |
| `resources/js/components` | `marketplace/`, `producer-page/`, `messages/`, `producer-form/`, `admin/`, `ui/` |
| `lang/` | `en.json`, `ru.json` (ključ je srpska rečenica), `{sr,en,ru}/notifications.php` |
| `docs/` | `database.md` (šema), `deploy.md`, `scaling.md`, `design-tokens.md` |

## 4. Modeli

Puna šema je u `docs/database.md`. Ukratko:

- **User** — može imati više proizvođača. Meko brisanje uz anonimizaciju. `google_id`; `password`
  je prazan kod naloga otvorenog preko Google-a.
- **Producer** (`status`: pending → active | blocked; meko brisanje) ima: `products`, `images`,
  `reviews`, `messages`, `subscriptions`, `followers`, `markets`, `quickReplies`, `certificates`,
  `posts`, `productAlerts` (kroz proizvode).
- **Product** (`status`: draft, active, archived, blocked) — `images`, `alerts`, `inquiries`;
  sezona `season_from/season_to`, `stock_quantity`.
- **ProducerMessage** — razgovor je par (proizvođač, kupac); nema posebne tabele razgovora.
- **Review** (pending/approved/rejected), **Report**, **ProducerChangeRequest** (promena naziva).
- Plaćeno: **SubscriptionPlan**, **ProducerSubscription**, **Boost**, **Campaign**,
  **CampaignParticipant** (interfejs `Payable`).
- Novije: **ProducerMarket**, **QuickReply**, **ProducerCertificate**, **Post**, **Referral**,
  **ProductAlert**, **SlugRedirect**, **WeeklyPick**, **InquiryOutcome**, **ActivityLog**.

Morph alijasi (`AppServiceProvider`): `producer`, `product`, `post`, `user`.

## 5. Funkcionalnosti

**Posetilac:** pretraga i filteri, stranice kategorija, mapa i „Najbliži meni", profil proizvođača
(pijace, sertifikati, priče, utisci), katalog sa cenama `/katalog/{slug}`, priče i recepti `/price`.

**Kupac:** nalog e-mailom ili Google-om, upit sa stranice proizvoda, poruke, praćenje proizvođača,
omiljeni, „Javi mi kad stigne", utisak, prijava problema.

**Proizvođač:** stranica i proizvodi, galerija, odgovori na poruke i utiske, brzi odgovori,
statistika (Premium/Pro), „čeka vas X kupaca", pijace, sertifikati, priče i recepti, katalog za
deljenje, preporuke, QR poster, članarina, isticanje, kampanje.

**Admin:** odobravanje proizvođača, provera sertifikata, moderacija utisaka / prijava / proizvoda /
priča, potvrda uplata, cene i paketi, proizvođač nedelje, preporuke, „Šta kupci traže", log aktivnosti.

Zakazano (`routes/console.php`): isticanje članarina i isticanja (dnevno), backup baze (02:30),
mejl o nepročitanim porukama (5 min), „Javi mi kad stigne" (na sat), čišćenje logova i obaveštenja.

## 6. Poslovna pravila

- Javno je samo ono što je `active` **i** čiji je proizvođač `active`. Svaki javni upit kreće od
  `Producer::published()` / `Product::published()` / `Post::published()`.
- Novog proizvođača odobrava admin. Promena naziva odobrenog proizvođača čeka admina.
- **Utisak** može da ostavi samo kupac kome je proizvođač odgovorio; jedan po proizvođaču; objavljuje
  se posle moderacije.
- **Osnivači:** prvih N odobrenih (podešavanje, podrazumevano 50) dobijaju trajan broj i godinu
  Premium-a besplatno. Broj se dodeljuje pri odobrenju.
- **Članarina** koja istekne ne skida profil sa sajta; proizvođač samo gubi pogodnosti. Obnova se
  nadovezuje na kraj tekuće.
- Plaćeno isticanje je uvek u posebnom, označenom redu; redovna lista ostaje po abecedi.
- **Telefon** proizvođača nije u HTML-u stranice; dohvata se tek na „Prikaži broj".
- **Sertifikat** je javan tek kad ga admin potvrdi i dok mu ne istekne rok. Javno je samo naziv,
  nikad dokument. Odobreni sertifikat vlasnik ne može da menja, samo da obriše.
- **Priča/recept** ide odmah na sajt (kao proizvod); admin je obavešten i može da je skloni.
  Blokiranu objavu ili proizvod može da vrati samo admin.
- **Preporuka:** važi samo za nov nalog, jednom; obe strane dobijaju 30 dana Premium-a kad admin
  odobri prvog proizvođača tog naloga. Bez nagrade ako: isti telefon/e-mail, više od 12 nagrada
  godišnje, prošlo 90 dana, preporučilac nije aktivan. Razlog se čuva u `referrals.status`.
- **Pretrage bez rezultata** (`SearchMisses`, tabela `search_misses`): beleži se pojam koji u katalogu
  nije našao ni proizvod ni proizvođača, i to samo kad nijedan drugi filter nije uključen. Dnevni
  brojači po pojmu: posetilac jednom dnevno, bez robota, bez mejlova i telefona. Admin vidi sve;
  proizvođač sa statistikom (Premium/Pro) vidi samo pojmove koje je tražilo bar dvoje ljudi.
- **„Čeka vas X kupaca":** proizvođač dobija obaveštenje za prvog kupca, pa na 3, 5, 10, 25, 50, 100.
- Ograničenja: 500 proizvoda, 20 slika u galeriji, 8 pijaca, 12 brzih odgovora, 10 sertifikata,
  100 objava po proizvođaču; 20 novih razgovora dnevno po kupcu.

## 7. Autorizacija

- Rute: `auth` + `verified` za sve što piše; `role:admin` za `/admin`.
- Nalog dobija `buyer` pri registraciji, `seller` kad napravi prvog proizvođača.
- Policy klase: `ProducerPolicy`, `ProductPolicy`, `ProducerMessagePolicy`, `ReviewPolicy`.
- Sve što pripada proizvođaču (pijace, brzi odgovori, sertifikati, objave, slike) proverava
  `authorize('update', $producer)` **i** da red pripada baš tom proizvođaču (inače 404).
- Blokiran nalog se ne prijavljuje (`EnsureUserIsNotBlocked`).
- Admin rute nisu u Ziggy listi za ne-admine; zato prijava/odjava admina radi pun reload strane.

## 8. Odluke i razlozi

- **Jedna klasa obaveštenja**, čuva tip i činjenice, a rečenica se sastavlja pri čitanju, na jeziku
  čitaoca. Mejlom idu samo: reset lozinke, potvrda adrese, nepročitane poruke, „stiglo je".
- **Bez queue workera:** sporedni poslovi idu posle odgovora (`afterResponse`, `defer`), da sajt
  radi na najjeftinijem serveru.
- **Slike** kroz `App\Support\Media` (disk `MEDIA_DISK`, umanjene kopije u `thumbs/`, EXIF rotacija).
  Dokumenti sertifikata su na privatnom disku `local` i šalju se samo kroz rutu koja proverava ko pita.
- **Pretraga:** MySQL FULLTEXT, LIKE na SQLite-u i za kratke reči (`App\Support\Search`).
- **Statistika** su dnevni brojači, bez podataka o posetiocu; botovi i vlasnik se ne broje.
- **Ograničenje broja zahteva** (`throttle:N,1`) broji po ruti (`ThrottlePerRoute`, alias `throttle`).
  Laravelov podrazumevani brojač je jedan po korisniku za sve rute, pa je pet poruka u minutu blokiralo
  i utisak i registraciju proizvođača. U testovima se gasi sa `withoutMiddleware(ThrottlePerRoute::class)`.
- **CSP** sa nonce-om po zahtevu; samo-izveštavanje dok radi Vite dev server.
- **Meta i JSON-LD** piše server u prvi HTML (`PageMeta`), jer nema SSR-a.
- **Slug** se pri preimenovanju čuva u `slug_redirects` (301 sa stare adrese).
- **Google prijava:** prihvata se samo adresa koju je Google potvrdio; provera `state` i PKCE. Pri
  vezivanju na nalog sa nepotvrđenom adresom brišu se lozinka i sesije tog naloga.
- **Poklonjena članarina** (osnivači, preporuke) je običan red od 0 RSD, bez posebnih slučajeva.
- Izbačeno i ne vraćati bez dogovora: korpa/porudžbine, povraćaj novca, push obaveštenja i PWA.

## 9. Konvencije

- Kod, komentari, commit poruke i opisi PR-ova na engleskom; razgovor sa vlasnikom na srpskom.
- Komentar objašnjava **zašto**, ne šta. Bez brojeva zadataka u komentarima.
- Tekst u interfejsu: `t('srpska rečenica')` u React-u, `__('…')` u PHP-u; svaki ključ mora da
  postoji u `lang/en.json` i `lang/ru.json` (`LocalizationTest`).
- Poruke o greškama validacije su bez naziva polja („Ovo polje je obavezno.").
- Kontroler ostaje tanak; logika u servisu. Provera vlasništva pre svake izmene.
- Liste se uvek paginiraju; brojevi preko `withCount`, veze preko `with` (bez N+1).
- Javnoj strani se šalju samo kolone koje prikazuje (`only([...])`), nikad ceo model.
- Dizajn: boje, fontovi i razmaci iz `docs/design-tokens.md`; nove strane liče na postojeće.
- Sporedne akcije proizvođača idu u meni „Više" (`producer-more-menu.tsx`), ne kao nova dugmad.
- Fajl za preuzimanje je običan `<a>`, ne Inertia `Link`.

## 10. Trenutno stanje

- Urađeni su svi zadaci do 120. Poslednji talas (109–117): pijace, katalog, brzi odgovori, „čeka vas
  X kupaca", sertifikati, priče i recepti, preporuke, Google prijava, demo podaci i testovi.
- Testovi: 503 PHP (3 preskočena bez GD-a) i 16 u pregledaču; CI zelen na MySQL-u i SQLite-u.
- Testovi u pregledaču prolaze cele lance kroz tri uloge: `full-cycle.spec.ts` (registracija → potvrda
  adrese → proizvođač → admin odobri → proizvod → upit → odgovor → utisak → admin objavi) i
  `producer-chains.spec.ts` (članarina do potvrde uplate, sertifikat, link preporuke, recept).
  Test sajt piše mejlove u `storage/logs/mail.log` (log kanal `mail`), odakle test čita link.
- **Sajt nikad nije pušten u rad.** Nema servera, domena ni stvarnih korisnika.

## 11. Poznata ograničenja

- Google prijava je testirana samo sa lažnim odgovorom; pravi ključevi još ne postoje.
- Katalog nije u mapi sajta; priče nemaju dugme „Prijavi".
- Lokalni PHP nema GD (bez umanjenih kopija slika) ni zip.
- **Otvoreno pitanje za vlasnika (članarine):** članarina plaćena ili poklonjena dok druga još traje
  dobija početak tek kad tekuća istekne, ali se računa kao aktivna odmah (`scopeActive` gleda samo
  kraj). Zato prelazak sa Basic na Premium daje Premium pogodnosti od danas do kraja oba perioda, a
  `planFor` može da prikaže plan sa najdaljim krajem umesto onog koji trenutno teče. Ne menjati bez
  odluke: da li viši paket počinje odmah, a samo obnova istog čeka na kraj tekućeg.
- Uslovi korišćenja i politika privatnosti nisu pravno pregledani.

## 12. TODO

- Puštanje u rad po `docs/deploy.md` (samo uz vlasnika): server, domen, mejl, Turnstile, Sentry,
  backup, Google ključevi.
- Upisati prave podatke za uplatnicu i cene; naći prvih 10–20 proizvođača.
- Kad zatreba (vidi `docs/scaling.md`): tabela razgovora, Redis, Meilisearch, SSR.

## 13. Ne dirati bez dogovora

- Auth scaffolding iz starter kita (samo proširivati).
- Nazive tabela i kolona iz `docs/database.md`.
- Bazu vlasnika: bez `migrate:fresh` i drugih destruktivnih komandi nad njom.
- `design-reference/` ostaje u repou.
- Spajanje PR-ova radi vlasnik; Claude samo otvara PR prema `master`.

## 14. Provera pre PR-a

`vendor/bin/pint --test`, `npx prettier --check resources/`, `npx eslint .`, `npx tsc --noEmit`,
`npx vite build` (pre testova koji otvaraju novu stranicu), `php artisan test`, `npx playwright test`.
