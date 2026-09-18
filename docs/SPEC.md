# SPEC — Marketplace domaćih proizvođača

> **Kako se koristi ovaj dokument**
> Ovo je referentni spec za ceo projekat. Ne radi sve odjednom.
> U chatu traži fazu po fazu: `Pročitaj SPEC.md i uradi FAZU 1.`
> Posle svake faze: `migrate:fresh --seed`, build, testovi, pa izveštaj šta da proverim.

---

## 0. PRVI KORAK — ANALIZA, BEZ IZMENA

Pre nego što promeniš ijednu liniju koda:

1. Prođi kroz postojeći kod: modeli, migracije, kontroleri, rute, view sloj (Blade / Livewire / Vue / Inertia), seederi, `composer.json`, `package.json`.
2. Daj mi kratak izveštaj:
   - Koji je stack (Blade? Livewire? Inertia+Vue/React? Filament?)
   - Postojeći modeli i relacije
   - Postojeće rute i stranice
   - Šta radi, šta je polomljeno, šta je još starter-kit default
   - Koji paketi su već instalirani (permission, activitylog, dompdf, media library...)
3. Daj plan po fazama sa procenom i **čekaj moju potvrdu**. Ne menjaj ništa dok ne potvrdim.

**Konvencije:** koristi postojeće konvencije projekta (imenovanje, struktura foldera, coding style). Kod dvosmislenosti izaberi rešenje najkonzistentnije sa ostatkom aplikacije i kratko napomeni odluku u komentaru ili commit poruci.

---

## GLOBALNA PRAVILA (važe za SVAKI zadatak)

### Pravilo 1 — Dizajn početne stranice je izvor istine

Svaka nova ili izmenjena stranica (moj nalog, admin panel, proizvođač, proizvod, korpa, filteri...) mora koristiti iste fontove, boje, spacing, komponente dugmadi/kartica i opšti "feel" kao početna stranica.

**Ako nešto vizuelno odstupa od početne stranice — to je bag, ne stvar ukusa.**

Konkretno, pre redizajna:

1. Pročitaj kompletan kod početne stranice + njen layout + Tailwind config + CSS varijable.
2. Izvuci dizajn tokene na jedno mesto (Tailwind theme / CSS varijable / `design-tokens` fajl): paleta, font-family i skala, border-radius, senke, spacing, stil dugmadi, stil kartica, stil sekcija, tranzicije.
3. Napravi set **deljenih komponenti** koje sve stranice MORAJU koristiti:
   `Header`, `Footer`, `PageHeader`, `Section`, `Card`, `Button`, `Badge`, `Avatar`, `Rating`, `EmptyState`, `Breadcrumbs`, `DataTable`, `Modal`, `FormField`, `Pagination`.
4. Nijedna stranica ne sme zadržati default starter-kit izgled. **Logika starter kita ostaje, menja se samo vizuelni sloj.**

### Pravilo 2 — Shared, sticky header

- Header je deo **zajedničkog layout-a** (jedan Blade layout / `@extends` / shared komponenta). Nikada se ne duplira ručno po stranicama.
- Prisutan je na svim javnim i korisničkim stranicama. Admin panel ima svoj layout (vidi Fazu 8).
- **Sticky** — fiksiran za vrh pri skrolovanju, tako da su navigacija, pretraga i ikonica korpe uvek dostupne.
- Pri navigaciji header se vizuelno ne gasi i ne "trza".
- Sadrži: logo, glavnu navigaciju (Proizvodi, Proizvođači, Kategorije), globalnu pretragu, zvonce notifikacija, ikonicu korpe sa badge-om, korisnički meni (ili Prijava/Registracija).

### Pravilo 3 — Terminologija

Svuda koristi **Proizvođač / Producer** umesto "domaćinstvo". U kodu, bazi, rutama, UI tekstovima. Uradi refaktor rano (Faza 1) da se posao ne duplira.

### Pravilo 4 — Kvalitet

- Validacija kroz Form Requests, autorizacija kroz Policies, poslovna logika u Actions/Services, kontroleri tanki.
- Migracije uvek nove — ne menjaj već pokrenute.
- Validacione i error poruke na srpskom, kroz `lang/sr/`.
- Feature test za svaku kritičnu funkcionalnost (checkout, odobravanje proizvođača, permisije, upload avatara).
- Bez `#`, `javascript:void(0)`, TODO-ova i placeholder teksta u finalnom kodu.
- Reši N+1 (eager loading), dodaj indexe na foreign key i filter kolone.

---

# FAZA 1 — TEMELJ (blokira sve ostalo)

## 1.1 Seederi — realni srpski podaci, ne placeholderi

Cilj: posle `php artisan migrate:fresh --seed` sajt izgleda popunjeno i funkcionalno. Seederi moraju biti idempotentni i `DatabaseSeeder` ih pokreće u ispravnom redosledu.

- `RoleAndPermissionSeeder` — role `admin`, `producer`, `customer` + permisije
- `UserSeeder` — 1 admin, 4–6 proizvođač-naloga, 15+ kupaca, svi sa avatarima
- `CategorySeeder` — realne kategorije: Med i pčelinji proizvodi, Mlečni proizvodi (sir, kajmak), Suhomesnato, Voće i povrće, Zimnica i ajvar, Rakija i vina, Pekarski proizvodi, Začini i čajevi, Domaći sokovi, Jaja
- `ProducerSeeder` — realna imena, lokacije (Šumadija, Vojvodina, Zlatibor, Homolje, Fruška gora, Stara planina...), tagline, "o nama" tekst, priča o proizvodnji, kontakt, način dostave, avatar, cover
- `ProductSeeder` — realni proizvodi, cene u RSD, jedinice mere (kg, l, kom, tegla 720ml), zalihe, sezonalnost, veza na proizvođača i kategoriju
- `OrderSeeder` + `InvoiceSeeder` — porudžbine u različitim statusima, svaka sa fakturom
- `ReviewSeeder` — utisci sa ocenama, poneki sa slikom
- `FavoriteSeeder`, `MessageSeeder`, `NotificationSeeder`, `ActivityLogSeeder`

Postojeće placeholder **slike** zadrži za sada — samo ih mapiraj na realne entitete. Tekstualni placeholderi se brišu.

## 1.2 Bug fix — upload avatara

Kada korisnik menja samo profilnu sliku, validacija greškom traži `name` i `email`.

- Napravi **odvojen endpoint i formu samo za avatar** (`UpdateAvatarRequest`, validira samo `avatar`), odvojeno od forme za osnovne podatke.
- Za profil koristi parcijalni update (PATCH semantika): polja koja nisu poslata nisu required (`sometimes`), ili fallback `$request->name ?? $user->name`.
- Dodaj: preview pre uploada, resize/crop, validacija mime + max 5MB, brisanje stare slike, fallback inicijali kao avatar.
- Feature testovi za oba slučaja (samo avatar, samo podaci).

## 1.3 Refaktor terminologije

"domaćinstvo" → "proizvođač" kroz modele, tabele, rute, UI. Uradi sada, pre redizajna.

## 1.4 Permisije (spatie/laravel-permission ili postojeći paket)

Role: `admin`, `producer`, `customer`.

**Proizvođač sme sam da menja:**
- cenu proizvoda
- opis i slike proizvoda
- stanje na lageru / dostupnost
- status proizvoda (aktivan / neaktivan)
- tagline, "o nama", galeriju, priču o proizvodnji
- način i uslove dostave, radno vreme

**Zahteva odobrenje admina:**
- registracija novog proizvođača
- promena imena proizvođača i pravnih podataka (PIB, matični broj)
- brisanje proizvođača naloga
- promena procenta provizije
- dodavanje nove kategorije

Zaštiti sve kroz Policies (`ProductPolicy`, `ProducerPolicy`, `OrderPolicy`) + middleware. Skrivanje dugmadi u UI nije autorizacija.

## 1.5 Tok posle prijave

- Kupac i proizvođač → **početna stranica** (ne starter-kit dashboard)
- Admin → `/admin`
- Sa početne mora postojati jasna navigacija ka Proizvodima, Proizvođačima, Kategorijama, Korpi, Mom nalogu

---

# FAZA 2 — VIZUELNA KONZISTENTNOST

## 2.1 Shared layout + sticky header

Vidi Globalno pravilo 2. Izvedi ovo pre pojedinačnih stranica.

## 2.2 Stranica "Moj nalog"

- **Zadrži postojeću logiku starter kita** (settings, izmena lozinke, appearance, 2FA, brisanje naloga). Ne reimplementiraj.
- Preradi **isključivo vizuelni sloj**: layout, tipografija, boje, komponente — u stilu početne stranice.
- Sekcije: Profil, Bezbednost, Moje porudžbine, Moji favoriti (proizvodi + proizvođači), Moje poruke, Notifikacije, Moj proizvođački nalog (ili CTA "Postani proizvođač").

## 2.3 Custom error stranice

404 / 403 / 500 u dizajnu sajta, ne default Laravel.

---

# FAZA 3 — POČETNA STRANICA SA REALNIM PODACIMA

| Sekcija | Šta se menja |
|---|---|
| **Domaćinstva sa pričom** | Realni proizvođači iz baze umesto placeholder teksta. Slike mogu ostati placeholder. Klik → profil proizvođača. |
| **Ukusi koji se prate** | Realni proizvodi iz baze, sortirani po oceni / popularnosti. Slike mogu ostati placeholder. |
| **Šta tražite** | Realne kategorije iz baze. Klik → `/proizvodi?kategorija=med` sa već primenjenim filterom, prikazuje i proizvode i proizvođače koji ih imaju. |
| **Pronađi domaće** (dugme) | → `/proizvodjaci`, listing svih proizvođača. |

---

# FAZA 4 — PROIZVOĐAČI

## 4.1 Kartica proizvođača (grid)

- Cover / background slika
- Avatar preklopljen preko cover-a
- Ime + "verifikovan" badge
- Kratak attention-grabber tagline koji sam proizvođač piše (~120 karaktera)
- Prosečna ocena (zvezdice) + broj recenzija
- Lokacija sa pin ikonicom
- Način dostave kao badge-ovi: lično / kurirska služba / preuzimanje
- Broj proizvoda, top kategorije
- Favorit (srce) direktno na kartici
- Hover: blagi lift + scale slike + jača senka, `transition-all duration-300`

Listing filteri: lokacija, kategorija, ocena, način dostave, verifikovani, pretraga po imenu. Sortiranje: najbolje ocenjeni, najnoviji, najviše proizvoda.

## 4.2 Profil proizvođača `/proizvodjaci/{slug}`

1. **Hero** — cover, avatar, ime, lokacija, ocena; dugmad: Favorit, Pošalji poruku, Kontakt
2. **O nama** — tekst koji proizvođač piše
3. **Priča o nastanku i tok proizvodnje** — "behind the scenes" timeline, tekst + slike, korak po korak
4. **Galerija** — domaćinstvo i proizvodnja, lightbox
5. **Proizvodi** — grid sa cenama, favorit, dodaj u korpu
6. **Dostava i uslovi** — način dostave, oblasti, radno vreme
7. **Kontakt** + lokacija
8. **Utisci** — vidi 4.3

## 4.3 Utisci / recenzije

- Avatar korisnika, ime, ocena, tekst komentara, datum
- **Opcioni upload slike** ("kako mi je proizvod stigao") — nije obavezno, ali mogućnost postoji; prikaz u lightbox-u
- Odgovor proizvođača na recenziju
- Korisno / nije korisno
- Recenziju ostavlja samo ulogovan korisnik; rate limiting protiv spama

## 4.4 Privatne poruke

- `Conversation` + `Message` modeli; thread po proizvođaču
- Poruku vidi **samo taj proizvođač** i autor — niko treći
- Inbox u "Moj nalog" → Poruke, unread badge, notifikacija na novu poruku, opcioni attachment
- Rate limiting

## 4.5 Favoriti

- Polimorfna tabela `favorites` (`user_id`, `favoritable_type`, `favoritable_id`)
- Proizvođač i pojedinačni proizvod favorituju se **nezavisno**
- Toggle preko AJAX-a bez reload-a, optimistic UI, animacija srca
- Stranica "Moji favoriti" sa tabovima Proizvodi / Proizvođači

---

# FAZA 5 — PROIZVODI: GRID, FILTERI, PAGINACIJA

## 5.1 Kartica proizvoda (redizajn)

- Kvadratna slika, `object-cover`, lazy load, skeleton
- Ime proizvoda jasno istaknuto (max 2 reda, ellipsis)
- **Favorit ikonica u gornjem desnom uglu** preko slike
- Proizvođač kao link (mali avatar + ime)
- **Cena**: velika, bold, u RSD, sa jedinicom mere (`1.200 RSD / kg`); ako ima popust — precrtana stara cena + badge `-20%`
- Ocena + broj recenzija
- Badge-ovi: Novo, Sezonsko, Organsko, Rasprodato
- Dugme "Dodaj u korpu" + quick view
- **Hover**: kartica `scale-[1.02]`, slika `scale-110` unutar `overflow-hidden`, jača senka, dugmad fade-in — sve sa `transition-all duration-300 ease-out`
- Poštuj `prefers-reduced-motion`

## 5.2 Filteri (trenutno ružno → redizajn)

- Sticky sidebar na desktopu, bottom-sheet drawer na mobilnom
- Filteri: kategorija (checkbox + broj rezultata), **cenovni rang (min-max / dual slider)**, proizvođač, lokacija/regija, ocena (4+ zvezdice), dostupnost na stanju, način dostave, sezonsko, organsko, novo
- Sortiranje: relevantnost, cena ↑/↓, najbolje ocenjeni, najnoviji, najpopularniji
- Aktivni filteri kao uklonjivi chip-ovi iznad grida + "Obriši sve"
- Stanje filtera u URL query stringu (shareable i bookmarkable), debounce 300ms, bez punog reload-a
- Font i komponente strogo po početnoj stranici

## 5.3 Paginacija

- Ako projekat već koristi paket za paginaciju iz `composer.json` — koristi njega. U suprotnom `LengthAwarePaginator` + custom Blade/komponenta u dizajnu sajta.
- **Default 20 po strani**, dropdown za izbor: 10 / 20 / 50 / 100
- Izbor se pamti u URL-u i localStorage
- Backend: `->paginate($perPage)->withQueryString()`, `perPage` validiraj protiv whitelist-e
- Prikaz: "Prikazano 1–20 od 137 proizvoda"

---

# FAZA 6 — KORPA

## 6.1 Indikator i mikro-animacija

- Badge sa brojem stavki na ikonici korpe u headeru, uvek vidljiv
- Pri dodavanju: badge "pop" (scale 1 → 1.3 → 1) + count-up
- Suptilna mikro-animacija: mala slika proizvoda "leti" ka korpi (fly-to-cart), ili slide-in toast sa thumbnailom i dugmetom "Idi u korpu"
- Elegantno, ne agresivno; poštuj `prefers-reduced-motion`
- Korpa perzistentna: baza za ulogovane, session/localStorage za goste, merge pri loginu

## 6.2 Stranica korpe (redizajn)

Trenutno prikazuje samo ime proizvođača, ime proizvoda i cenu — nedovoljno.

- **Grupisanje po proizvođaču** (dostava ide po proizvođaču) — header grupe sa avatarom, imenom, načinom i cenom dostave
- Po stavci: slika, naziv (link), jedinica/varijanta, cena po komadu, quantity stepper (+/−), ukupno po stavci, ukloni, "sačuvaj za kasnije"
- Sticky sažetak: međuzbir, dostava po proizvođaču, ukupno, promo kod
- Upozorenja za nedostupne artikle / nedovoljnu zalihu
- Lep empty state sa CTA
- Predlozi "Možda vam se svidi"

---

# FAZA 7 — PORUDŽBINE, FAKTURE, PLAĆANJE, PROVIZIJA

## 7.1 Plaćanje (validno za Srbiju)

- **Pouzeće (plaćanje kuriru pri preuzimanju)** — osnovna opcija, najčešća u Srbiji
- **Uplatnica / opšti nalog za prenos** — generiši PDF sa pozivom na broj i **IPS QR kodom** (NBS IPS Show standard)
- Kartično plaćanje — napravi interfejs `PaymentGateway` kao extension point, implementacija kasnije (feature flag). Ako želiš da se radi odmah, potvrdi obim sa mnom pre implementacije.

## 7.2 Modeli i statusi

`Order`, `OrderItem`, `Shipment`, `Invoice`, `Commission`, `Payout`.

- Status porudžbine: `na_cekanju` → `potvrdjena` → `u_pripremi` → `poslata` → `isporucena` → `zavrsena`; plus `otkazana`, `reklamacija`, `vracena`
- Status plaćanja: `neplaceno`, `placeno`, `delimicno`, `refundirano`
- Pošiljka: poslata (da/ne + datum + kurir + tracking broj), primljena (da/ne + datum)

## 7.3 Faktura

- Kreira se **automatski, odmah** pri kreiranju porudžbine (observer/event `OrderCreated` → `GenerateInvoice`)
- Broj: `FAK-2026-000123` — sekvencijalno po godini, bez rupa
- Status fakture prati status porudžbine
- Sadrži: prodavca (proizvođač), kupca, stavke, količine, jedinične cene, PDV ako postoji, dostavu, **ukupan iznos jasno istaknut / podvučen**, način plaćanja, rok, IPS QR
- Dostupna direktno iz pregleda porudžbine: dugme "Pogledaj fakturu" (modal + `/fakture/{broj}`) i "Preuzmi PDF" (`barryvdh/laravel-dompdf`), šalje se i mejlom
- Više proizvođača u korpi → jedna porudžbina, zasebne fakture po proizvođaču

## 7.4 Provizija platforme

Ne hardkoduj procenat.

- Globalna stopa u admin podešavanjima (`commission_percentage`), sa override-om po proizvođaču i po kategoriji
- Snapshot stope na samoj porudžbini u trenutku kreiranja (da kasnija promena ne menja istoriju)
- **Predlog: 8–12% po prodaji, bez mesečne pretplate na početku**
- Tabela `commissions` po porudžbini: bruto, stopa, provizija, neto za proizvođača, status isplate
- Tabela `payouts`: obračun po proizvođaču za period, status (na čekanju / isplaćeno), datum, referenca
- Opciono (feature flag, kasnije): istaknuti/promovisani listinzi, "Verifikovani proizvođač" značka uz godišnju naknadu, plaćena pozicija na početnoj
- Admin dashboard kartica: **ukupan prihod platforme od provizija**

---

# FAZA 8 — ADMIN PANEL (trenutno haos → redizajn + proširenje)

## 8.1 Layout

- Vizuelno usklađen sa početnom stranicom (ista paleta, font, kartice, dugmad). Bez Filament default izgleda i starter-kit ostataka.
- **Fiksni levi sidebar** kao deo jednog zajedničkog admin layout-a — ne duplira se po stranicama
- Sadržaj se menja u glavnom delu, sidebar ostaje i **jasno highlight-uje aktivnu sekciju**
- Topbar: pretraga, notifikacije, profil. Responsivno (sidebar → drawer na mobilnom).
- Admin se posle logina automatski preusmerava na admin panel.

## 8.2 Stavke menija

**1. Dashboard**
KPI kartice (promet, provizija, broj porudžbina, novi korisnici, konverzija), grafikoni, poslednje aktivnosti, stvari koje čekaju akciju.

**2. Proizvodi**
Lista sa pretragom, filterima i sortiranjem po kolonama. Add, edit, delete, duplicate, inline edit cene i zalihe. **Bulk select** → bulk delete, bulk aktiviraj/deaktiviraj, bulk promena kategorije, bulk promena cene (%), bulk export CSV/Excel. Import CSV. Drag & drop upravljanje slikama. Soft delete + restore.

**3. Proizvođači**
- Lista, detalj, edit svega (admin može da izmeni bilo koji podatak pre ili posle odobrenja, i na zahtev korisnika)
- Aktivacija/deaktivacija, verifikacija, podešavanje provizije po proizvođaču

**4. Zahtevi** — ključni tok
- Korisnik koji želi da prodaje popunjava **kompletnu formu**: naziv proizvođača, opis, priča, lokacija, kontakt, PIB/matični broj, avatar, cover, galerija domaćinstva, šta prodaje, kategorije, početni proizvodi sa slikama i cenama, način dostave
- Multi-step forma sa čuvanjem draft-a i validacijom po koraku
- Status: `poslat` → `u_obradi` → `odobren` / `odbijen` / `potrebne_izmene`
- Admin vidi ceo zahtev, može: odobriti, odbiti **uz razlog**, tražiti dopunu, ili sam ispraviti podatke pre odobrenja
- Na odobrenje: automatski se kreira Producer, korisniku se dodeljuje rola `producer`, šalje se notifikacija
- Isti tok i za naknadne zahteve postojećih proizvođača (promena imena, pravnih podataka, brisanje)

**5. Porudžbine**
Lista, filteri po statusu/datumu/proizvođaču, detalj, promena statusa, fakture, refundacije, tracking.

**6. Prodaja / Evidencija prodaje**
Status pošiljke (na čekanju / poslato / primljeno), koji proizvođač je prodao šta kome, iznos, **procenat i iznos provizije po transakciji**. Izveštaji: po proizvođaču, po kategoriji, po mesecu. Isplate proizvođačima. Export.

**7. Evidencija**
Postojeća statistika (broj korisnika, proizvođača, proizvoda, porudžbina) postaje **stavka u meniju** umesto razbacanih brojeva, sa detaljnim prikazom i drill-down-om.

**8. Logovi (audit trail)**
- `spatie/laravel-activitylog` ili model events → log tabela; automatsko beleženje kroz observer/middleware
- Beleži: ko, šta (created/updated/deleted/approved/rejected/login/logout/status change), nad čim (model + ID), stare i nove vrednosti (diff), kada, IP, user agent
- Kritične akcije (brisanje, promena cene, odobravanje) posebno obeležene i izdvojene
- UI: tabela sa filterima (korisnik, tip akcije, model, datum raspon), pretraga, detalj sa before/after diff, export
- Retencija: auto-brisanje starijih od 12 meseci (konfigurabilno)

**9. Korisnici** — lista, role, blokiranje, impersonate
**10. Recenzije** — moderacija, prijave, brisanje neprimerenih
**11. Kategorije** — CRUD, redosled, ikonice
**12. Podešavanja** — stopa provizije, načini plaćanja, dostava, tekstovi, SEO, održavanje

---

# FAZA 9 — NOTIFIKACIJE

Laravel Notifications, `database` + `mail` kanal, `broadcast` pripremljen.

**UI:** zvonce u headeru sa brojem nepročitanih, dropdown sa poslednjih 10, stranica "Sve notifikacije", mark as read / mark all, filtriranje po tipu, podešavanja po kanalu. Svaka notifikacija ima ikonicu, tekst, vreme i **klikabilan link na relevantnu stranicu**.

**Okidači:**

- *Korisnik:* zahtev odobren ("Admin je odobrio vaš zahtev za X"), odbijen (sa razlogom ako je unet), traži dopunu; nova poruka; porudžbina potvrđena/poslata/isporučena; faktura kreirana; promena cene omiljenog proizvoda; omiljeni proizvod ponovo na stanju; novi proizvod omiljenog proizvođača; odgovor na recenziju
- *Proizvođač:* nova porudžbina; nova poruka od kupca; novi komentar/ocena; niska zaliha; isplata obrađena; admin odobrio/odbio izmenu
- *Admin:* nov zahtev za proizvođača; prijavljena recenzija; neuspelo plaćanje; porudžbina velike vrednosti

---

# FAZA 10 — FINALNA PROVERA

1. **Svi linkovi i dugmad** — proći ceo sajt, nijedno dugme ne vodi na `#`, `javascript:void(0)` ili nepostojeću rutu. Napravi checklist svih CTA-ova i potvrdi svaki.
2. **Vizuelna regresija** — stranica po stranicu: da li izgleda kao deo iste aplikacije kao početna? Ako ne, popravi.
3. **Sticky header** — proveri na svim stranicama i na mobilnom.
4. **Permisije** — testiraj kao kupac, proizvođač i admin; probaj direktan pristup URL-ovima koje ne smeš da vidiš.
5. **Testovi** — pokreni sve; dodaj za checkout, odobravanje proizvođača, permisije, avatar upload.
6. **Pristupačnost** — semantički HTML, focus stanja, alt tekstovi, kontrast, keyboard navigacija.
7. **Performanse** — N+1, indexi, cache za kategorije i statistiku, WebP + responsive `srcset`.

---

# OPCIONO — PREDLOZI ZA DALJE

Implementirati samo posle potvrde, po prioritetu:

1. Globalna pretraga u headeru (proizvodi + proizvođači + kategorije) sa autocomplete-om
2. **Sezonski kalendar** — "šta je sada u sezoni"; idealno za ovakav marketplace
3. **Mapa proizvođača** — pronađi proizvođače blizu sebe
4. **Pretplata na isporuku** — med / jaja / sir svakog meseca (recurring order)
5. Nedavno pregledano + "Poruči ponovo" iz istorije
6. Dark mode u istoj paleti
7. SEO: slug rute na srpskom (`/proizvodi`, `/proizvodjaci/{slug}`), meta + Open Graph, `sitemap.xml`, JSON-LD (Product, LocalBusiness, Review)
8. i18n kroz `lang/sr/` (već pripremljeno Pravilom 4)

---

# REDOSLED RADA

| # | Faza | Zašto tu |
|---|---|---|
| 1 | Analiza + plan (Faza 0) | Bez razumevanja koda sve ostalo je nagađanje |
| 2 | Faza 1 — seederi, avatar bug, refaktor naziva, permisije, redirekcije | Bez podataka se ništa ne testira; refaktor rano da se posao ne duplira |
| 3 | Faza 2 — shared sticky header, dizajn tokeni, deljene komponente, Moj nalog | Temelj za sav redizajn |
| 4 | Faza 3 + 5 + 4.1 — realni podaci, grid proizvoda, filteri, paginacija, grid proizvođača | Vizuelna konzistentnost tamo gde korisnik najviše gleda |
| 5 | Faza 4.2–4.5 + 6 — profil proizvođača, poruke, favoriti, korpa | Glavna funkcionalnost |
| 6 | Faza 7 — porudžbine, fakture, plaćanje, provizija | Monetizacija |
| 7 | Faza 8 + 9 — admin panel, logovi, notifikacije | Operativa |
| 8 | Faza 10 — finalna provera | Regresija |

Posle svake faze: `php artisan migrate:fresh --seed`, build, testovi, pa izveštaj šta je urađeno i šta da proverim.
