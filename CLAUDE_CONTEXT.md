# Vrelina juga — kontekst projekta

Sažeto stanje projekta, da se ne oslanjamo na istoriju razgovora. Pravila rada su u `CLAUDE.md`;
ovde je **šta postoji, kako radi i šta je odlučeno**.

Održavanje: posle svake značajne izmene (baza, dozvole, poslovna pravila, arhitektura, nova
funkcionalnost) ispravi odgovarajući odeljak. Zastarelo zameni, ne dopisuj. Bez koda i bez spiskova
fajlova koji se vide iz repoa. Ako pređe ~250 redova, sažmi.

Poslednja izmena: 2026-10-06 (posle zadatka 140).

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
- **WantedAd** (`status`: open, closed, blocked; ističe posle 30 dana) i **WantedAdResponse** — oglasi „Tražim".
- **Review** (pending/approved/rejected), **Report**, **ProducerChangeRequest** (promena naziva).
- Plaćeno: **SubscriptionPlan**, **ProducerSubscription**, **Boost**, **Campaign**,
  **CampaignParticipant** (interfejs `Payable`).
- Novije: **ProducerMarket**, **QuickReply**, **ProducerCertificate**, **Post**, **Referral**,
  **ProductAlert**, **SlugRedirect**, **WeeklyPick**, **InquiryOutcome**, **ActivityLog**.

Morph alijasi (`AppServiceProvider`): `producer`, `product`, `post`, `user`.

## 5. Funkcionalnosti

**Posetilac:** pretraga i filteri, stranice kategorija i mesta, „U sezoni" po mesecima (`/sezona/{mesec}`), mapa i „Najbliži meni", profil proizvođača
(pijace, sertifikati, priče, utisci), katalog sa cenama `/katalog/{slug}`, priče i recepti `/price`,
stranice o sajtu (`/kako-radi`, `/za-proizvodjace` sa cenama iz baze, `/cesta-pitanja`, `/o-nama`, `/kontakt`).

**Kupac:** nalog e-mailom ili Google-om, upit sa stranice proizvoda, poruke, praćenje proizvođača,
omiljeni, „Javi mi kad stigne", utisak, prijava problema, oglas „Tražim" (`/trazim`).

**Proizvođač:** stranica i proizvodi, galerija, odgovori na poruke i utiske, brzi odgovori,
statistika i izvoz upita u CSV (Premium/Pro), pauza, „čeka vas X kupaca", pijace, sertifikati, priče i recepti, katalog za
deljenje, preporuke, QR poster, članarina, isticanje, kampanje.

**Admin:** odobravanje proizvođača, provera sertifikata, moderacija utisaka / prijava (proizvođač, proizvod, objava, korisnik) / proizvoda /
priča / oglasa „Tražim", potvrda uplata, cene i paketi, proizvođač nedelje, preporuke, „Šta kupci traže", log aktivnosti.

Zakazano (`routes/console.php`): isticanje članarina i isticanja (dnevno), backup baze (02:30),
mejl o nepročitanim porukama (5 min), „Javi mi kad stigne" (na sat), kraj pauza sa datumom (06:00), nedeljni pregled pratiocima (čet–sub 09:00), podsetnik za nepotpun profil (10:00), čišćenje logova i obaveštenja.

## 6. Poslovna pravila

- Javno je samo ono što je `active` **i** čiji je proizvođač `active`. Svaki javni upit kreće od
  `Producer::published()` / `Product::published()` / `Post::published()`.
- Novog proizvođača odobrava admin. Promena naziva odobrenog proizvođača čeka admina.
- **Oglasi „Tražim"** (odluke vlasnika, 2026-10-05): oglas ide odmah na sajt, admin je obavešten i može da
  ga skloni; odgovara svaki aktivan proizvođač, jednom po oglasu. Odgovor je obična poruka u razgovoru
  proizvođač–kupac (`producer_messages.wanted_ad_id`), pa ovde proizvođač piše prvi. Obaveštenje dobijaju
  proizvođači koji prodaju u kategoriji oglasa, njenim potkategorijama ili kategoriji iznad nje. Javno
  se vidi samo ime autora, ne i prezime.
- **Utisak** može da ostavi samo kupac koji je pisao proizvođaču i kome je proizvođač odgovorio (oba smera); jedan po proizvođaču; objavljuje
  se posle moderacije.
- **Osnivači:** prvih N odobrenih (podešavanje, podrazumevano 50) dobijaju trajan broj i godinu
  Premium-a besplatno. Broj se dodeljuje pri odobrenju.
- **Članarina** koja istekne ne skida profil sa sajta; proizvođač samo gubi pogodnosti.
- **Redosled članarina** (odluka vlasnika, 2026-10-05): isti ili niži paket čeka kraj tekućeg (obnova
  se nadovezuje); **viši paket počinje odmah**, a ostatak nižeg se pomera iza njega, bez gubitka dana.
  Pogodnosti daje samo članarina koja trenutno teče (`running`), ne ona koja čeka red (`active` = plaćena
  i nije istekla). Kad admin otkaže članarinu pre kraja, one iza nje se pomeraju unapred za neiskorišćeno vreme.
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
- **Pauza** (`producers.paused_at/paused_until/pause_note`, servis `ProducerPause`): stranica i proizvodi
  ostaju javni, ali se ne može započeti **nov** razgovor; postojeći teku dalje. Sa datumom povratka pauza
  prestaje sama (i pre noćnog posla). Kad prestane, obaveštavaju se pratioci („Javi mi kad se vrati" je
  praćenje proizvođača).
- **Nedeljni pregled** (`digest:send-weekly`, četvrtak–subota u 09:00): ide samo onome ko prati proizvođača
  koji je te nedelje objavio proizvod, priču ili recept; nikad prazan, najviše jedan nedeljno i samo ono
  što je novo od prethodnog. Jedno pokretanje šalje najviše `DIGEST_MAX_PER_RUN` (150) mejlova, da ne
  potroši dnevnu kvotu jeftinog mejl paketa; ostali dobijaju sutradan. Podrazumevano uključen
  (`users.notify_weekly_digest`), gasi se u profilu ili potpisanim linkom iz mejla. Nazivi koje pišu
  proizvođači se u mejlu eskejpuju (mejl se renderuje iz Markdown-a).
- **Kategorije su u dva nivoa** („Zimnica" → „Ajvar"; dublje ne može, to čuva validacija). Proizvod ima
  jednu kategoriju, opštu ili potkategoriju; stranica i filter kategorije uključuju i potkategorije
  (`Product::inCategory`). `search_name` je naziv kako ga ljudi kucaju („Domaći ajvar") i ide u naslov
  stranice, `intro` je uvodni pasus i opis; oba uređuje admin. Adresa kategorije se ne menja pri
  preimenovanju. Prazna stranica kategorije je `noindex` i nije u sitemap-u. Liste za izbor dolaze kao
  stablo iz `Category::options()`. Potkategorije se zovu po vrsti, nikad po zaštićenom imenu porekla.
- **Stranice mesta** (`/mesto/{slug}`, `/mesto/{slug}/{kategorija}`, servis `Places`): nema tabele mesta.
  Mesto su svi načini pisanja grada koji daju isti slug („Niš" i „Nis"), i postoji samo dok se iz njega
  prodaje bar jedan objavljen proizvod; kombinacija mesto+kategorija bez proizvoda je 404. Proizvod iz
  potkategorije se broji i za kategoriju iznad nje. Keš 10 min.
- **„Čeka vas X kupaca":** proizvođač dobija obaveštenje za prvog kupca, pa na 3, 5, 10, 25, 50, 100.
- Ograničenja: 500 proizvoda, 20 slika u galeriji, 8 pijaca, 12 brzih odgovora, 10 sertifikata,
  100 objava po proizvođaču; 20 novih razgovora dnevno po kupcu; 3 otvorena oglasa „Tražim" po kupcu,
  20 odgovora na oglase dnevno po proizvođaču.

## 7. Autorizacija

- Rute: `auth` + `verified` za sve što piše; `role:admin` za `/admin`.
- Nalog dobija `buyer` pri registraciji, `seller` kad napravi prvog proizvođača.
- Policy klase: `ProducerPolicy`, `ProductPolicy`, `ProducerMessagePolicy`, `ReviewPolicy`, `WantedAdPolicy`.
- Sve što pripada proizvođaču (pijace, brzi odgovori, sertifikati, objave, slike) proverava
  `authorize('update', $producer)` **i** da red pripada baš tom proizvođaču (inače 404).
- Blokiran nalog se ne prijavljuje (`EnsureUserIsNotBlocked`).
- **Dvostruka potvrda prijave** (TOTP, `pragmarx/google2fa`, servis `TwoFactor`): neobavezna, uključuje se u
  „Moj nalog" u dva koraka (tajna važi tek kad je potvrdi prvi kod). Dok kod nije unet, sesija ne postoji -
  ni posle lozinke ni posle Google prijave. Kod važi jednom; 8 rezervnih kodova; isključivanje traži lozinku.
  Admin panel podseća admina koji je nema.
- Admin rute nisu u Ziggy listi za ne-admine; zato prijava/odjava admina radi pun reload strane.

## 8. Odluke i razlozi

- **Jedna klasa obaveštenja**, čuva tip i činjenice, a rečenica se sastavlja pri čitanju, na jeziku
  čitaoca. Mejlom idu samo: reset lozinke, potvrda adrese, nepročitane poruke, „stiglo je", nedeljni pregled, a
  proizvođaču i: članarina ili isticanje uskoro ističe, profil je posle nedelju dana ispod 70%.
- **Bez queue workera:** sporedni poslovi idu posle odgovora (`afterResponse`, `defer`), da sajt
  radi na najjeftinijem serveru.
- **Slike** kroz `App\Support\Media` (disk `MEDIA_DISK`, umanjene kopije u `thumbs/`, EXIF rotacija).
  Fotografije dizajna u `resources/js/assets` su WebP (originali su u `design-reference/`). Glavnu sliku
  stranice proizvoda i proizvođača server najavljuje u `<head>` (`meta.preload`, ista adresa kao `<img>`).
- **Pristupačnost:** dugme sa vidljivim tekstom ima `aria-label` koji sadrži taj tekst; link koji drži samo
  sliku ima naziv; `text-gold` nije za tekst na svetloj pozadini (premali kontrast).
  Dokumenti sertifikata su na privatnom disku `local` i šalju se samo kroz rutu koja proverava ko pita.
- **Pretraga:** MySQL FULLTEXT, LIKE na SQLite-u i za kratke reči (`App\Support\Search`).
- **Statistika** su dnevni brojači, bez podataka o posetiocu; botovi i vlasnik se ne broje.
- **Ograničenje broja zahteva** (`throttle:N,1`) broji po ruti (`ThrottlePerRoute`, alias `throttle`).
  Laravelov podrazumevani brojač je jedan po korisniku za sve rute, pa je pet poruka u minutu blokiralo
  i utisak i registraciju proizvođača. U testovima se gasi sa `withoutMiddleware(ThrottlePerRoute::class)`.
- **CSP** sa nonce-om po zahtevu; samo-izveštavanje dok radi Vite dev server.
- **Naslov stranice** je onaj koji je napisao server (`meta.title`): stranice koriste `Head` iz
  `@/components/head`, nikad Inertia `Head` (ESLint to brani), pa se stranica ne preimenuje kad se učita.
  Stranica bez `meta` dobija svoj naslov i ime sajta. React u `<head>` ne dodaje ništa osim naslova.
- **Meta i JSON-LD** piše server u prvi HTML (`PageMeta`), jer nema SSR-a. Početna nosi `WebSite` sa
  pretragom i `Organization`; proizvod, kategorija i mesto nose `BreadcrumbList`. `meta.robots` (npr.
  `noindex, follow` na pojedinačnom oglasu „Tražim") ispisuje se samo kad je zadat.
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
- Paginirana lista uvek ima i `id` kao poslednji kriterijum redosleda, da se redovi sa istim vremenom ili
  cenom ne premeštaju između stranica.
- Liste se uvek paginiraju; brojevi preko `withCount`, veze preko `with` (bez N+1). `QueryBudgetTest` pada
  ako javna lista sa deset redova izvrši više upita nego sa dva.
- `Cache::remember` ne pamti `null`: kad je „nema podataka" čest ishod, kešira se `false` (vidi `ResponseTime`).
- Deljeni propovi koji se traže sami (`unreadMessages`, `unreadNotifications`, `recentNotifications`) stižu iz
  `HandleInertiaRequests` bez pokretanja kontrolera stranice; nov takav prop dodati u `STANDALONE`.
- Javnoj strani se šalju samo kolone koje prikazuje (`only([...])`), nikad ceo model.
- Dizajn: boje, fontovi i razmaci iz `docs/design-tokens.md`; nove strane liče na postojeće.
- Sporedne akcije proizvođača idu u meni „Više" (`producer-more-menu.tsx`), ne kao nova dugmad.
- Fajl za preuzimanje je običan `<a>`, ne Inertia `Link`.

## 10. Trenutno stanje

- Urađeni su svi zadaci do 132. Talas 121–131 (PR-ovi #215–#225, nadovezani jedan na drugi): stranice o
  sajtu, stranice mesta, „U sezoni", prijava priča i katalog u mapi sajta, redosled članarina, pauza,
  nedeljni pregled, oglasi „Tražim", mejlovi proizvođaču, izvoz upita, dvostruka potvrda prijave.
- Testovi: 574 PHP (3 preskočena bez GD-a) i 21 u pregledaču; CI zelen na MySQL-u i SQLite-u.
- Testovi u pregledaču prolaze cele lance kroz tri uloge: `full-cycle.spec.ts` (registracija → potvrda
  adrese → proizvođač → admin odobri → proizvod → upit → odgovor → utisak → admin objavi) i
  `producer-chains.spec.ts` (članarina do potvrde uplate, sertifikat, link preporuke, recept);
  `wanted-pause-places.spec.ts` (stranice o sajtu, mesto i sezona, oglas „Tražim" kroz tri uloge, pauza,
  dvostruka potvrda sa pravim TOTP kodom).
  Test sajt piše mejlove u `storage/logs/mail.log` (log kanal `mail`), odakle test čita link.
- **Sajt nikad nije pušten u rad.** Nema servera, domena ni stvarnih korisnika.

## 11. Poznata ograničenja

- Google prijava je testirana samo sa lažnim odgovorom; pravi ključevi još ne postoje.
- Lokalni PHP nema GD (bez umanjenih kopija slika) ni zip.
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
