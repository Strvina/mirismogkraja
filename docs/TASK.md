# Zadatak: Doterivanje i dogradnja marketplace platforme za domaće proizvođače

## Pre nego što počneš
Prođi kroz postojeći kod (modeli, migracije, kontroleri, rute, Blade/Livewire/Vue komponente, seederi) da razumeš trenutnu arhitekturu pre nego što bilo šta menjaš. Gde god je moguće, koristi postojeće konvencije projekta (imenovanje, struktura foldera, coding style). Ako naiđeš na dvosmislenost, izaberi rešenje koje je najkonzistentnije sa ostatkom aplikacije i kratko napomeni tu odluku u komentaru/commit poruci.

## Progress tracker (ažuriraj posle svake sesije/faze)
- [x] 1. Seederi
- [x] 2. Bug: avatar upload (uzrok: ruta je bila PATCH, a PHP parsira multipart telo samo za POST)
- [x] 3. Stranica "Moj nalog"
- [x] 4. Tok posle prijave (ostaje samo: podstranice vizuelno da prate početnu — ide uz 3/11/12/13/18)
- [x] 5. Sekcija "Domaćinstva sa pričom"
- [x] 6. Sekcija "Ukusi koji se prate"
- [x] 7. Sekcija "Šta tražite"
- [x] 8. "Pronađi domaće" + profil proizvođača
- [~] 9. Korpa — indikator i animacija (OTKAZANO: korpa je uklonjena, vidi "Model platforme" ispod)
- [x] 10. Paginacija
- [x] 11. Redizajn grida proizvoda
- [x] 12. Filtriranje proizvoda
- [x] 13. Redizajn kartice proizvođača + preimenovanje termina
- [x] 14. Admin panel — redizajn i sidebar
- [x] 15. Permisije (proizvođač sam menja svoje podatke; naziv objavljenog proizvođača ide na odobrenje)
- [x] 16. Notifikacioni sistem (database kanal, zvonce u headeru, stranica obaveštenja)
- [x] 17. Upiti za kupovinu (bez plaćanja na platformi) — sada direktan upit sa stranice proizvoda
- [~] 18. Redizajn korpe (OTKAZANO: korpa je uklonjena, vidi "Model platforme" ispod)
- [x] 19. Provera linkova/dugmadi (uklonjeni placeholder social linkovi, footer prebačen na Inertia navigaciju)
- [~] 20. Monetizacija — urađeni delovi bez novca: 20.4 (Prvih 100) i 20.5 (praćenje + notifikacija). Ostaju 20.1/20.2/20.3/20.6/20.7/20.8/20.9 (planovi, isticanja, kampanje, statistika, admin sekcija) — traže odluke o cenama i toku naplate.
- [~] 21. Dodatne preporuke — već urađeno: broj telefona na klik, utisak samo posle odgovora proizvođača, slug URL-ovi, rate limiting na porukama. Ostaje: „Prijavi problem“, verifikovan bedž, deljenje na mreže, mapa, sitemap, onboarding wizard.
- [ ] 22. Google prijava

## Model platforme (odluka vlasnika, nadjačava zadatke 9, 17 i 18)
Platforma **nije prodavnica** — ona samo spaja kupca i proizvođača, a dogovor o količini,
ceni, plaćanju i dostavi ide direktno između njih. Zbog toga su korpa, naplata i
porudžbine u potpunosti uklonjeni iz koda i baze (`cart_items`, `orders`, `order_items`,
pripadajući kontroleri, servisi, rute i stranice).

Umesto toga, kupac sa stranice proizvoda šalje **upit** koji otvara razgovor sa
proizvođačem; prva poruka pamti o kom je proizvodu reč. Sve dalje ide kroz poruke.
Ocenu proizvođača može da ostavi samo kupac kome je taj proizvođač **odgovorio** —
to je najbliže "verifikovanoj kupovini" što platforma uopšte vidi.

## GLOBALNO PRAVILO (važi za SVAKI zadatak ispod)
**Dizajn početne stranice je izvor istine za ceo sajt.** Svaka nova ili izmenjena stranica (moj nalog, admin panel, stranica proizvođača, stranica proizvoda, korpa, filteri, itd.) mora da koristi iste fontove, boje, spacing, komponente dugmadi/kartica i opšti "feel" kao početna stranica. Nijedna stranica ne sme da izgleda kao default Laravel starter kit template. Ako nešto vizuelno odstupa od početne stranice, to se smatra bagom.

**Header mora biti isti i uvek prisutan na svim stranicama sajta (osim eventualno admin panela ako ima svoj poseban layout — precizirati).** Kad korisnik navigira sa stranice na stranicu (proizvodi, proizvođači, moj nalog, korpa, itd.), header se ne gasi niti se ponovo učitava vizuelno — treba da bude deo zajedničkog layout-a (npr. jedan Blade layout/`@extends` ili shared komponenta) koji se ne duplira ručno po stranicama. Header takođe treba da bude **sticky** (fiksiran za vrh ekrana prilikom skrolovanja stranice na dole), tako da je navigacija, pretraga i ikonica korpe uvek dostupne bez obzira koliko korisnik skrola nadole.

---

## 1. Seederi
Napravi/dopuni seedere tako da cela aplikacija ima realne test podatke za rad:
- Korisnici (različite role: kupac, proizvođač, admin)
- Proizvođači/domaćinstva (sa opisima, lokacijom, avatarom, cover slikom)
- Kategorije proizvoda
- Proizvodi (povezani sa proizvođačima i kategorijama, sa cenama i slikama)
- Porudžbine i fakture (u različitim statusima)
- Komentari/utisci kupaca (sa ocenama, i poneki sa slikom)
- Notifikacije (par primera)

Cilj: posle `php artisan migrate:fresh --seed` sajt izgleda popunjeno i funkcionalno, ne prazno.

## 2. Bug: upload avatara na profilu
Kada korisnik menja samo profilnu sliku, validacija greškom zahteva i `name` i `email` polje ("name field is required", "email field is required"), iako ih korisnik nije menjao. Ispraviti validaciju tako da:
- Ako se šalje samo slika, ostala polja se ne validiraju kao required, ili se preuzimaju iz postojećih vrednosti korisnika (`$request->name ?? $user->name` pattern, ili odvojeni request/ruta samo za avatar).
- Poželjno: napraviti posebnu formu/endpoint samo za upload avatara, odvojeno od forme za osnovne podatke, da se ovakvi konflikti ne ponavljaju.

## 3. Stranica "Moj nalog"
- Zadržati postojeću funkcionalnu logiku iz Laravel starter kita (settings, izmena lozinke, itd.) — ne treba je reimplementirati od nule.
- Preraditi **isključivo vizuelni sloj** (layout, tipografija, boje, komponente) da prati dizajn početne stranice.

## 4. Tok posle prijave
- Posle logina, korisnik ide na **početnu stranicu** (ne na dashboard iz starter kita).
- Sa početne stranice mora postojati jasna navigacija ka: proizvođačima, proizvodima, kategorijama i ostalim glavnim funkcionalnostima.
- Sve te podstranice moraju vizuelno pratiti dizajn početne (font, boje, spacing, komponente).

## 5. Sekcija "Domaćinstva sa pričom"
- Ukloniti placeholder tekstualne podatke, zadržati postojeće placeholder **slike** za sada.
- Povezati sekciju sa realnim proizvođačima iz baze (seedovani podaci iz zadatka 1).
- Klik na domaćinstvo vodi na njegovu profilnu stranicu (vidi zadatak 7).

## 6. Sekcija "Ukusi koji se prate"
- Isto kao gore — realni proizvodi iz baze umesto placeholder podataka, slike za sada mogu ostati placeholder.

## 7. Sekcija "Šta tražite" (kategorije)
- Prikazati realne kategorije iz baze.
- Klik na kategoriju vodi na stranicu sa proizvodima/domaćinstvima filtriranim po toj kategoriji (query param ili ruta tipa `/proizvodi?kategorija=...`).

## 8. Dugme "Pronađi domaće" → stranica sa listom proizvođača
Vodi na stranicu koja prikazuje sve proizvođače (grid, videti zadatak 12 za izgled kartice). Klik na proizvođača otvara **profilnu stranicu proizvođača** koja sadrži:
- Opis/priču o proizvođaču ("o nama" tekst)
- Kontakt informacije
- Sistem privatnih poruka: kupac šalje poruku koju vidi samo taj proizvođač, i mogu da komuniciraju (jednostavan thread/chat po proizvođaču)
- Listu proizvoda koje nudi, sa cenama
- Galeriju slika (domaćinstvo, proizvodnja)
- Priču o nastanku proizvoda / tok proizvodnje (tekst + slike, "behind the scenes" sekcija)
- Mogućnost da korisnik doda proizvođača u omiljene (favorite)
- Mogućnost da korisnik doda pojedinačni proizvod u omiljene (favorite), nezavisno od favoritovanja proizvođača

## 9. Korpa — indikator i animacija
- Kad korisnik doda proizvod u korpu, na ikonici korpe se pojavljuje broj (badge) sa trenutnim brojem stavki.
- Dodati suptilnu mikro-animaciju prilikom dodavanja u korpu (npr. "leti" mala ikonica proizvoda ka korpi, ili badge pulsira/skoči). Treba da bude elegantno i u skladu sa opštim dizajnom, ne agresivno.

## 10. Paginacija
- Koristiti odgovarajući Laravel paginacija paket/komponentu (npr. standardni `LengthAwarePaginator` + custom Blade view, ili paket koji tim već koristi ako postoji u `composer.json`).
- Podrazumevano 20 proizvoda po strani.
- Korisnik može da promeni broj po strani (npr. dropdown: 10 / 20 / 50 / 100).
- Vizuelno usklađeno sa dizajnom početne stranice.

## 11. Redizajn grida proizvoda
Svaka kartica proizvoda treba da sadrži:
- Ime proizvoda (jasno istaknuto)
- Dugme/ikonicu za favorite u uglu kartice
- Lepo formatiranu cenu (npr. jasna tipografija, valuta, eventualno stara/nova cena ako ima popusta)
- Hover efekat: blagi zoom/scale na sliku i/ili senku, tranziciju (transition), da deluje dinamično i interaktivno
- Konzistentan font sa početnom stranicom

## 12. Filtriranje proizvoda
- Redizajnirati postojeći filter UI (trenutno ružno izgleda).
- Dodati dodatne filtere gde ima smisla — npr: cenovni rang (slider/min-max), kategorija, proizvođač, lokacija/regija proizvođača, ocena proizvoda, dostupnost (na stanju).
- Font i komponente filtera moraju pratiti dizajn početne stranice.

## 13. Redizajn kartice proizvođača (grid proizvođača)
Napomena: koristiti termin **"proizvođač"** dosledno u celoj aplikaciji (kodu, UI tekstovima) umesto "domaćinstvo", jer je univerzalniji naziv.

Kartica proizvođača treba da sadrži:
- Cover/background sliku
- Avatar proizvođača
- Kratak "attention grabber" opis koji sam proizvođač piše (tagline/bio, kratko)
- Prosečnu ocenu (rating)
- Lokaciju proizvođača
- Način dostave (npr. lična dostava, kurirska služba, preuzimanje)
- Sekciju utisaka/komentara na dnu:
  - Avatar korisnika koji je ostavio komentar
  - Ime korisnika
  - Tekst komentara + ocena
  - Opciono: korisnik može da priloži sliku proizvoda koji je dobio (nije obavezno)

## 14. Admin panel — redizajn i proširenje
- Vizuelno uskladiti sa dizajnom početne stranice (trenutno je "haos").
- Kada se admin uloguje, automatski se preusmerava na admin panel.
- Admin panel treba da ima **sajd meni (levi sidebar)** koji je fiksni deo layout-a admin panela (isto kao header — jedan zajednički layout, ne duplirati po stranicama). Kroz sidebar admin bira sekciju (Proizvodi, Proizvođači, Evidencija, Logovi, Prodaja, itd.) i sadržaj se menja u glavnom delu ekrana, dok sidebar ostaje prisutan i jasno pokazuje koja je sekcija trenutno aktivna (highlight/active state na stavci menija).
- Admin meni (stavke sidebar-a) treba da sadrži:
  1. **Proizvodi** — lista, edit, add, delete, bulk select + bulk delete (razmisliti i o bulk izmeni statusa/kategorije/cene kao dodatnoj opciji)
  2. **Proizvođači** — tok odobravanja:
     - Korisnik koji želi da postane proizvođač popunjava kompletnu formu (slike, ime proizvođača, šta prodaje, slike proizvoda, opis, kontakt, itd.)
     - Zahtev ide adminu na odobrenje (status: na čekanju / odobreno / odbijeno)
     - Admin može da izmeni bilo koje podatke iz zahteva pre ili posle odobrenja
  3. **Evidencija** — postojeći pregled statistika (broj korisnika, broj proizvođača, itd.) postaje stavka u meniju umesto da bude razbacano.
  4. **Logovi** — audit trail: ko je šta uradio na sajtu (dodao/izmenio/obrisao), sa vremenskim žigom, korisnikom, akcijom i entitetom nad kojim je izvršena. Implementirati kroz middleware/observer pattern (npr. Laravel model events → log tabela) da se automatski beleže kritične akcije (kreiranje/brisanje/izmena proizvoda, proizvođača, porudžbina).
  5. **Evidencija upita/prodaje** — **VAŽNA NAPOMENA:** platforma nema nikakav kontakt sa plaćanjem ni slanjem — to ide direktno između kupca i proizvođača (dogovor preko poruka/telefona/Vibera). Platforma je isključivo posrednik koji ih spaja, ne procesuje pare i ne garantuje transakciju. Zato ova evidencija **ne može biti pouzdana/verifikovana** — to je samovoljno (self-reported) prijavljivanje od strane proizvođača, korisno samo za orijentacionu statistiku i uvid, ne za obračun i ne za bilo kakvu finansijsku obavezu. Konkretno: proizvođač ima opciju da na svom upitu/porudžbenici klikne status (npr. "kontaktiran kupac" / "realizovano" / "otkazano") isključivo za svoju evidenciju; admin panel prikazuje agregatni pregled tih samoprijavljenih statusa (npr. "najprodavaniji proizvod ovog meseca po prijavama proizvođača") uz jasnu napomenu u UI da su podaci neprovereni/orijentacioni. Nema `commission_percentage`, nema obračuna provizije — zarada platforme dolazi isključivo iz modela opisanog u zadatku 20 (članarine/isticanja/kampanje).

## 15. Permisije (uloge i ovlašćenja)
- Ako ne postoji, uvesti permission sistem (npr. Spatie Laravel Permission, ili postojeći ako je već u projektu).
- Vlasnik proizvoda/proizvođača (proizvođač-korisnik) može samostalno da menja:
  - Cenu proizvoda
  - Opis, slike proizvoda
  - Dostupnost/stanje na lageru
- Za "osetljivije" izmene (npr. brisanje proizvođača naloga, promena osnovnih podataka firme, promena procenta provizije) — korisnik šalje zahtev adminu na odobrenje umesto direktne izmene.
- Jasno definisati listu polja koja spadaju u "zahteva odobrenje" vs. "sme sam da menja" (predloži razumnu podelu ako specifikacija ne pokriva neki slučaj).

## 16. Notifikacioni sistem
- Uvesti notifikacije u sajtu (npr. Laravel Notifications, database channel + zvončić u headeru).
- Primeri okidača:
  - Admin odobri zahtev proizvođača → korisnik dobija notifikaciju "Admin je odobrio vaš zahtev za [X]"
  - Admin odbije zahtev → notifikacija sa razlogom ako je unet
  - Proizvođač promeni status upita (kontaktiran, realizovano) → notifikacija kupcu
  - Nova poruka od kupca → notifikacija proizvođaču
  - Novi komentar/ocena na proizvod proizvođača → notifikacija proizvođaču
- UI: dropdown/zvonce sa brojem nepročitanih, lista notifikacija, klik vodi na relevantnu stranicu.

## 17. Upiti za kupovinu (posrednički model — bez plaćanja i slanja na platformi)
**Ključna napomena koja menja pristup ovom delu:** platforma **ne** procesuje plaćanje i **ne** organizuje slanje/dostavu — to ide isključivo direktno između kupca i proizvođača (dogovor preko internih poruka iz zadatka 8, telefona, Vibera, WhatsApp-a). Platforma je posrednik/konektor: spaja stranu koja traži proizvod sa stranom koja ga nudi, i tu se njena uloga završava. Ovo znači:
- Kada korisnik "naruči" iz korpe, to **ne pokreće plaćanje na platformi** — generiše se **upit za kupovinu** (interno se može zvati "porudžbina" u kodu/bazi radi jednostavnosti, ali funkcionalno je upit, ne transakcija).
- Upit sadrži: koje proizvode i količine kupac želi, od kog/kojih proizvođača, i kupčeve kontakt podatke — i **automatski se šalje proizvođaču** (notifikacija + poruka kroz sistem poruka iz zadatka 8).
- Proizvođač i kupac se dalje sami dogovaraju o načinu plaćanja (npr. pouzeće, direktna uplata, plaćanje pri ličnom preuzimanju) i dostavi/preuzimanju — platforma tu ne posreduje, ne garantuje i ne prati.
- Umesto formalne "fakture" (što bi impliciralo da platforma učestvuje u transakciji, a to pravno/poresko nije slučaj), generisati **potvrdu upita / porudžbenicu** — pregledan dokument/stranicu sa spiskom proizvoda, količinama, cenama po proizvođačevom cenovniku i ukupnim iznosom, koja služi kupcu i proizvođaču kao podsetnik tokom njihovog direktnog dogovora, ne kao zvanični fiskalni dokument platforme. *(Napomena: ovo je moj predlog terminologije da se izbegne pravna zabuna — nisam pravnik niti finansijski savetnik, preporučujem da se sa knjigovođom/pravnikom potvrdi da li ovakav model uopšte povlači obavezu izdavanja fiskalnog računa od strane platforme ili proizvođača, i kako se to razlikuje od formalne fakture.)*
- Status upita (na čekanju / proizvođač kontaktiran / realizovano / otkazano) je **samoprijavljen od strane proizvođača** radi njegove sopstvene organizacije (i orijentacione statistike iz zadatka 14, tačka 5) — platforma ga ne verifikuje.
- Potvrda upita mora biti dostupna/otvoriva direktno iz pregleda upita (link/dugme "Pogledaj potvrdu"), sa jasno istaknutim ukupnim iznosom po proizvođačevom cenovniku.

## 18. Redizajn korpe
- Trenutno prikazuje samo ime proizvođača, ime proizvoda i cenu — nedovoljno pregledno.
- Redizajnirati da bude jasno grupisano, npr:
  - Grupisanje stavki po proizvođaču (ako korpa sadrži proizvode od više proizvođača)
  - Slika proizvoda, naziv, cena po komadu, količina (sa +/- kontrolama), ukupno po stavki
  - Ukupan zbir (orijentacioni, po cenovniku proizvođača), dugme "Pošalji upit proizvođaču" umesto klasičnog "Plati" (pošto se plaćanje ne odvija na platformi — vidi zadatak 17)
  - Prati dizajn početne stranice.

## 19. Provera svih linkova/dugmadi
- Proći kroz ceo sajt i osigurati da nijedno dugme ne vodi na prazno (`#`, `javascript:void(0)`, nepostojeću rutu).
- Svako dugme/link mora voditi na smislenu, funkcionalnu destinaciju.

---

## 20. Monetizacija — članstva, isticanja i launch program

Poslovni model: platforma ne uzima procenat od same prodaje proizvoda (proizvođač zadržava ceo iznos prodaje), već zarađuje kroz članarine, plaćeno isticanje i sezonske kampanje. Ovo **zamenjuje** ranije pominjanu ideju o procentu provizije po transakciji (zadatak 14, tačka 5) — umesto provizije po prodaji, implementirati model ispod. Ako se kasnije odluči da se ipak uvede i mala provizija (npr. za online plaćanje karticom), ostaviti to kao lako proširiv deo, ne hardkodirati da provizija ne postoji.

### 20.1 Nivoi članstva (godišnja pretplata proizvođača)
Napraviti `subscription_plans` (planovi) i `producer_subscriptions` (aktivna pretplata proizvođača — plan, datum početka/isteka, status: aktivan/istekao/na čekanju plaćanja) tabele. Planovi (cene su orijentacione, admin treba da može da ih menja iz panela, ne hardkodirati u kodu):

- **Basic (~2.990 RSD/god)** — profil proizvođača, fotografije, proizvodi, cenovnik, kontakt, lokacija, način dostave/preuzimanja, pojavljivanje u pretrazi. (Ovo je minimum da bi proizvođač uopšte bio vidljiv na sajtu.)
- **Premium (~5.990 RSD/god)** — sve iz Basic + premium oznaka na profilu, bolja pozicija u pretrazi (ranking boost), pojavljivanje u sekciji "Istaknuti proizvođači", istaknuti proizvodi, veći limit fotografija, statistika profila (pregledi profila, pregledi proizvoda, klikovi na telefon/Viber/WhatsApp, najgledaniji proizvod).
- **Pro (~9.990–14.990 RSD/god)** — sve iz Premium + top pozicija u kategoriji, pojavljivanje na početnoj strani, mogućnost izbora za "Proizvođač nedelje", promocija na društvenim mrežama (interna napomena adminu da to uradi, ne mora biti automatizovano), SEO/profesionalno sređivanje profila (napomena adminu), posebne ponude, napredna statistika.

Implementacija: feature-gating kroz policy/middleware koji provera aktivan plan proizvođača i uključuje/isključuje UI elemente i ranking ponder u pretrazi/listing upitima. Kad pretplata istekne, proizvođač automatski pada na najniži nivo (ili se profil skriva iz pretrage — definisati ponašanje, predlog: profil ostaje vidljiv ali gubi sve benefite iznad Basic-a, uz notifikaciju proizvođaču "Vaša pretplata je istekla").

### 20.2 Plaćeno isticanje (jednokratno, bez godišnje pretplate)
- **Istakni proizvod (~500–1.500 RSD / 7 dana)** — proizvod dobija flag "istaknut" sa datumom isteka, prikazuje se u sekciji istaknutih proizvoda, bolja pozicija u kategoriji, opciono na početnoj strani.
- **Istakni profil (~1.000 RSD / 7 dana)** — proizvođač dobija flag "preporučen" sa datumom isteka, veća vidljivost u kategoriji i na odabranim pozicijama.
- Napraviti `boosts` tabelu (polymorphic: `boostable_type`/`boostable_id` — može biti proizvod ili proizvođač, tip isticanja, datum početka/isteka, iznos plaćen, status). Cron/scheduled job koji svakodnevno deaktivira istekla isticanja.
- **Bitno za poverenje korisnika:** ako više proizvođača plati isticanje istovremeno, top pozicije treba da rotiraju (npr. round-robin ili random weighted po posetama stranice) umesto da jedan plaćeni oglas trajno "blokira" vrh — inače aktivni platioci obeshrabruju nove.

### 20.3 Sezonske kampanje
- Admin iz panela kreira sezonsku kampanju (naziv, npr. "Ajvar sezona", "Zimnica", "Slava", "Uskrs"; period trajanja; cena za proizvođača da se pridruži: ~1.990–3.990 RSD).
- Proizvođač se prijavljuje/plaća za kampanju, njegovi relevantni proizvodi/profil se ističu na posebnoj "kampanja" stranici i/ili baneru na početnoj tokom trajanja kampanje.
- `seasonal_campaigns` i `campaign_participants` tabele.

### 20.4 Launch strategija — "Prvih 100 proizvođača"
- Poseban brojač na sajtu (npr. na stranici za registraciju proizvođača i/ili na početnoj): "73 / 100 mesta zauzeto" — live broj iz baze (`COUNT` proizvođača sa `is_founding_producer = true`).
- Prvih 100 odobrenih proizvođača automatski dobijaju besplatno članstvo (najviši nivo ili Basic — definisati) na godinu dana, i **trajno** obeležje:
  - `is_founding_producer` (bool), `founding_number` (redni broj, npr. #27), `joined_at` (datum pridruživanja).
  - Ovaj status i redni broj se prikazuju na profilu proizvođača **zauvek**, i ne gube se kada kasnije počne da plaća regularnu članarinu.
- Napraviti javnu stranicu/sekciju **"Prvih 100 proizvođača"** (npr. "Prvi koji su verovali u domaću proizvodnju") koja lista svih osnivačkih proizvođača po rednom broju (#01, #02, ...), sa linkom na njihov profil. Ovo je i marketing/brend element, ne samo administrativni podatak.

### 20.5 Praćenje proizvođača (follow) + notifikacije
- Dugme "Prati [Naziv proizvođača]" na profilu proizvođača (vezano za ulogovanog korisnika, `producer_follows` tabela).
- Kada praćeni proizvođač doda novi proizvod ili novu ponudu, svi njegovi pratioci dobijaju notifikaciju (koristi notification sistem iz zadatka 16).

### 20.6 Statistika za Premium/Pro proizvođače
- Pratiti evente: pregled profila, pregled proizvoda, klik na telefon, klik na Viber, klik na WhatsApp (jednostavna `events`/`profile_analytics` tabela sa tipom eventa, entitetom, timestamp-om).
- Dashboard u nalogu proizvođača (vidljiv samo Premium/Pro korisnicima) koji prikazuje agregate: broj pregleda profila, broj pregleda proizvoda, broj klikova po kanalu, i "najgledaniji proizvod".
- Ispod Premium/Pro nivoa, ovaj dashboard prikazuje "zaključan"/blurovan preview sa CTA "Nadogradi na Premium da vidiš statistiku" — dobar prodajni argument unutar samog proizvoda.

### 20.7 "Proizvođač nedelje" / "Proizvod nedelje"
- Admin panel: sekcija gde admin bira (ili se automatski predlaže iz Pro pretplatnika/kupljenih isticanja) proizvođača i proizvod koji se prikazuju u posebnom istaknutom slotu na početnoj stranici tokom nedelje. Čuvati istoriju (da se ne ponavlja isti prečesto).

### 20.8 Lokalno/regionalno isticanje
- Proizvođač može platiti veću vidljivost specifično u svom regionu (npr. sekcija "Najbolji proizvođači iz Niša" / "Domaći proizvodi sa juga Srbije"). Vezati za postojeće polje lokacije proizvođača + isti `boosts` mehanizam iz 20.2, samo sa `region` kontekstom.

### 20.9 Administracija monetizacije
Dodati u admin panel (sidebar iz zadatka 14) sekciju **"Monetizacija"** ili proširiti "Evidencija" sa:
- Pregled/izmena planova i cena (20.1)
- Pregled aktivnih i isteklih pretplata po proizvođaču
- Pregled i ručno odobravanje/aktiviranje plaćenih isticanja i sezonskih kampanja (dok se ne uvede automatizovano online plaćanje — proizvođač uplati, admin potvrdi i aktivira)
- Brojač i lista "Prvih 100" sa mogućnošću ručne korekcije ako zatreba
- Ukupan prihod platforme po kategoriji (članarine / isticanja / kampanje) — jednostavan izveštaj

## 21. Dodatne preporuke (nisu izričito tražene, ali vredi razmotriti)
- **Otkrivanje broja telefona na klik, ne odmah prikazano.** Umesto da broj proizvođača stoji otvoren na profilu, dodati dugme "Prikaži broj" — ovo je i bolje za privatnost i savršeno se poklapa sa statistikom klikova iz zadatka 20.6 (već planiraš da pratiš klik na telefon/Viber/WhatsApp).
- **"Prijavi problem"** dugme na profilu proizvođača ili proizvodu — pošto platforma ne učestvuje u transakciji, ipak treba mehanizam da kupci prijave prevaru/lošu robu/neodgovaranje, da admin može da suspenduje sumnjive proizvođače i zaštiti reputaciju sajta.
- **Verifikovan profil** (bedž) — admin ručno oznaci proizvođača kao "verifikovan" nakon provere (npr. lične karte, registracije poljoprivrednog domaćinstva). Povećava poverenje kupaca, i može biti prirodni deo Premium/Pro paketa.
- **Recenzija samo nakon samoprijavljenog "realizovano" upita** (ili bar posebno obeležena) — smanjuje broj lažnih recenzija bez konkurenata koji nikad nisu ni kupili.
- **Dugmići za deljenje proizvoda na Viber/WhatsApp/Facebook** — organska promocija, i dobro se uklapa u ciljnu grupu (kupci često šalju link rodbini/prijateljima "vidi ovaj med").
- **Mapa proizvođača** (Google Maps prikaz svih proizvođača, posebno koristno za "lokalno isticanje" iz zadatka 20.8 i za kupce koji traže "nešto blizu mene").
- **SEO osnove** — čisti slug URL-ovi (`/proizvodjac/domacinstvo-petrovic` umesto `/proizvodjac/42`), meta tagovi, sitemap.xml — dosta organskog Google saobraćaja za lokalne proizvode dolazi iz pretrage tipa "domaći med Niš".
- **Onboarding forma proizvođača kao wizard (korak po korak)**, ne jedna ogromna forma — veći procenat ljudi završi prijavu ako je podeljena u 3–4 kratka koraka (osnovni podaci → slike → proizvodi → pregled i slanje).
- **Zaštita od spama u sistemu poruka** (zadatak 8) — rate limiting da neko ne bombardira proizvođača porukama, i mogućnost da proizvođač blokira/prijavi korisnika.
- **Stranice Uslovi korišćenja i Politika privatnosti** — posebno bitno s obzirom na model iz zadatka 17: mora biti jasno napisano (uz pravni savet) da platforma nije strana u kupoprodaji, ne garantuje transakciju, i da se plaćanje/dostava dešavaju direktno između korisnika. Ovo je pravno pitanje, konsultuj se sa pravnikom pre lansiranja.

## 22. Prijava/registracija — Google nalog ili forma
- Korisnik treba da može da se registruje i prijavi na dva načina:
  1. **Standardna forma** (email + lozinka) — ovo verovatno već postoji iz Laravel starter kita, samo treba da prati dizajn početne stranice (isto kao i ostatak, po globalnom pravilu).
  2. **Prijava preko Google naloga** (OAuth) — koristiti Laravel Socialite paket (`laravel/socialite`) sa Google driverom.
- Kod prijave preko Google-a:
  - Ako email sa Google naloga već postoji u bazi (registrovan kroz formu), povezati/ulogovati postojećeg korisnika (proveriti email, ne kreirati duplikat).
  - Ako ne postoji, kreirati novog korisnika automatski (ime i email povuci iz Google profila, avatar takođe ako je dostupan), bez dodatne forme — korisnik odmah upada na sajt.
  - Korisnicima koji su se registrovali preko Google-a, polje za lozinku ostaje prazno/nullable u bazi (ili generisati random placeholder) — ali im dati mogućnost da naknadno postave lozinku u "Moj nalog" ako žele i da se ubuduće loguju i preko forme.
- Dugme "Prijavi se preko Google-a" mora vizuelno pratiti dizajn početne stranice (ne default Google/Laravel dugme bez stilizacije), a postaviti ga i na login i na registracionu stranicu.
- Potrebno je napraviti Google OAuth aplikaciju (Google Cloud Console) i dodati `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` i `GOOGLE_REDIRECT_URI` u `.env` — ako korisnik (vlasnik sajta) nema još te kredencijale, javiti mu da ih treba generisati pre nego što se ova funkcionalnost testira u produkciji.

## Prioritet rada (predlog redosleda)
1. Seederi (zadatak 1) — bez ovoga se ništa drugo ne može testirati.
2. Bug fix avatara (zadatak 2) — brz fix, blokira korisnike odmah.
3. Preimenovanje "domaćinstvo" → "proizvođač" kroz kod (deo zadatka 13) — uraditi rano da se ne duplira posao.
4. Redizajn ključnih stranica prema početnoj (zadaci 3, 4, 11, 12, 13, 18) — vizuelna konzistentnost.
5. Funkcionalne nadogradnje (zadaci 5–10, 17) — realni podaci, korpa, paginacija, poruke, favoriti.
6. Admin panel, permisije, notifikacije, logovi (zadaci 14–16).
7. Monetizacija — članstva, isticanja, launch program (zadatak 20). Ovo je poslovno najkompleksniji deo, raditi ga tek kad je osnovna platforma (proizvodi, proizvođači, porudžbine, admin) stabilna — nema smisla graditi naplatu za profile koji se još menjaju.
8. Finalna provera linkova (zadatak 19) i regresivno testiranje.
9. Dodatne preporuke (zadatak 21) — birati selektivno prema vremenu/budžetu; "Prijavi problem" i onboarding wizard bih lično stavio najviše u prioritet od ove liste, ostalo može ići postepeno.
10. Google prijava (zadatak 22) — može ići paralelno sa redizajnom autentikacionih stranica (deo zadatka 4), pošto zavisi od dobijanja Google OAuth kredencijala od vlasnika sajta.

Nakon svake veće celine, pokreni postojeće testove (ako ih ima) i po potrebi dodaj nove za kritične tokove (checkout, odobravanje proizvođača, permisije).
