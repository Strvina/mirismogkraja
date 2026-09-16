# Plan projekta

Svaki task je u repou i kao GitHub Issue (grupisan po Milestone-u = faza) i praćen na
[Project board-u](https://github.com/users/Strvina/projects/1). Radimo task po task, redosledom
faza - ne preskačati unapred (vidi CLAUDE.md).

## Faza 0: Setup i priprema
- [x] 0.1 Kreirati novi Laravel projekat od laravel/react-starter-kit template-a
- [x] 0.2 Podesiti .env (baza, ime aplikacije), pokrenuti podrazumevane migracije starter kita
- [ ] 0.3 Instalirati i podesiti Spatie laravel-permission paket
- [ ] 0.4 Analizirati postojeći landing page repo: izdvojiti boje, fontove, spacing, komponente (dugmad, kartice, navbar, footer) u listu dizajn tokena
- [ ] 0.5 Preneti Tailwind config (boje, fontovi) iz landing repoa u novi projekat
- [ ] 0.6 Prekopirati/adaptirati landing page sekcije kao React komponente (i dalje bez veze sa bazom - statičan sadržaj)
- [x] 0.7 Podesiti git repo, .gitignore, README sa opisom projekta
- [x] 0.8 Kreirati GitHub Issues/Project board, uneti sve faze kao Milestones i taskove iz ovog plana kao Issues

## Faza 1: Auth, useri i role
- [ ] 1.1 Proširiti users migraciju (phone, avatar_path, address, city, lat, lng)
- [ ] 1.2 Definisati role: buyer, seller, admin (Spatie RolesSeeder)
- [ ] 1.3 Prilagoditi registraciju - default rola buyer pri registraciji
- [ ] 1.4 Napraviti flow "Postani prodavac" (user popuni podatke o domaćinstvu → dobija seller rolu, status domaćinstva pending)
- [ ] 1.5 Prilagoditi stranicu profila (izmena podataka, upload avatara)
- [ ] 1.6 Middleware za pristup po roli (samo seller vidi "moja domaćinstva", samo admin vidi admin panel)
- [ ] 1.7 Pest testovi za registraciju, login i dodelu rola

## Faza 2: Domaćinstva
- [ ] 2.1 Migracija + model Household (relacije: belongsTo User, hasMany Product, hasMany Review)
- [ ] 2.2 CRUD za domaćinstvo (seller kreira/uređuje svoje, ne vidi tuđa)
- [ ] 2.3 Upload cover/logo slike domaćinstva
- [ ] 2.4 Javna stranica domaćinstva /domacinstvo/{slug} (svi proizvodi, ocene, opis)
- [ ] 2.5 Javna lista/pretraga svih domaćinstava /domacinstva sa filterom po gradu/kategoriji
- [ ] 2.6 Status odobravanja (pending/active/blocked) - novo domaćinstvo nije javno vidljivo dok ga admin ne odobri (priprema za Fazu 6)
- [ ] 2.7 Pest testovi (CRUD, autorizacija - seller ne sme da menja tuđe domaćinstvo)

## Faza 3: Kategorije i proizvodi
- [ ] 3.1 Migracija + model Category (samoreferentna, parent_id)
- [ ] 3.2 Seeder osnovnih kategorija (Voće, Povrće, Mlečni proizvodi, Med i pčelinji proizvodi, Žitarice, Jaja, Meso i suhomesnato, Rakija i vino, Ostalo)
- [ ] 3.3 Migracija + model Product (belongsTo Household, belongsTo Category, hasMany ProductImage)
- [ ] 3.4 CRUD za proizvode (seller upravlja samo svojim proizvodima)
- [ ] 3.5 Upload više slika po proizvodu (ProductImage) + redosled/glavna slika
- [ ] 3.6 Javna stranica proizvoda /proizvod/{slug} (opis, cena, prodavac, ocene, slični proizvodi)
- [ ] 3.7 Lista/pretraga proizvoda sa filterima (kategorija, cena, grad, dostupnost) i sortiranjem
- [ ] 3.8 Pest testovi
- [ ] 3.9 Osnovni seeder (par domaćinstava + proizvoda po kategoriji) - ubaciti čim modeli iz Faze 3 postoje, da odmah imamo realan sadržaj za rad na dizajnu, ne čekati Fazu 8

## Faza 4: Korpa i porudžbine
- [ ] 4.1 Migracija + model CartItem (user_id, product_id, quantity)
- [ ] 4.2 Dodavanje u korpu / izmena količine / uklanjanje (frontend + backend)
- [ ] 4.3 Prikaz korpe grupisan po domaćinstvu (svaki seller ima svoju "grupu" stavki)
- [ ] 4.4 Migracija + model Order i OrderItem
- [ ] 4.5 Checkout flow: iz korpe se kreira jedna Order, a njene order_items nose household_id (jedna porudžbina, stavke označene po domaćinstvu)
- [ ] 4.6 Snapshot cene i naziva proizvoda u order_items (izmena cene kasnije ne sme da menja stare porudžbine)
- [ ] 4.7 Statusi porudžbine (pending → confirmed → shipped → delivered / cancelled), promenu statusa radi seller
- [ ] 4.8 Pregled "Moje porudžbine" (buyer) i "Porudžbine mog domaćinstva" (seller)
- [ ] 4.9 Pest testovi - ovo je najkritičnija faza, pokriti dobro (korpa → checkout → status promene, autorizacija ko šta sme da menja)

## Faza 5: Ocene i omiljeni
- [ ] 5.1 Migracija + model Review (user_id, household_id, rating, comment) - dogovoriti pravilo da li samo kupac koji je naručio od tog domaćinstva sme da ostavi ocenu
- [ ] 5.2 Prikaz prosečne ocene na stranici domaćinstva
- [ ] 5.3 Migracija + model Favorite (polimorfna tabela)
- [ ] 5.4 Dugme "Omiljeni proizvođač" na stranici domaćinstva
- [ ] 5.5 Dugme "Omiljeni proizvod" na stranici proizvoda
- [ ] 5.6 Stranica "Moji omiljeni" (lista omiljenih domaćinstava i proizvoda)
- [ ] 5.7 Pest testovi

## Faza 6: Admin panel
- [ ] 6.1 Middleware/guard za /admin rute
- [ ] 6.2 Dashboard sa osnovnim brojkama (broj usera, domaćinstava, proizvoda, porudžbina, prihod)
- [ ] 6.3 Upravljanje userima (lista, izmena role, blokiranje naloga)
- [ ] 6.4 Upravljanje domaćinstvima (odobravanje pending domaćinstava, blokiranje)
- [ ] 6.5 Upravljanje proizvodima (pregled svih, brisanje neprimerenih)
- [ ] 6.6 Upravljanje kategorijama (CRUD)
- [ ] 6.7 Pregled svih porudžbina
- [ ] 6.8 Moderacija ocena (brisanje neprimerenih)

## Faza 7: Frontend dizajn sistem prema landing page-u
- [ ] 7.1 Izdvojiti reusable komponente (Button, Card, Input, Badge, Navbar, Footer) u shared/components na osnovu stila landing page-a
- [ ] 7.2 Uskladiti sve nove stranice (marketplace, dashboard, admin) sa bojama/fontovima/spacing landing page-a
- [ ] 7.3 Responsive provera ključnih stranica (mobile/tablet/desktop)
- [ ] 7.4 Loading/empty/error stanja (skeleton loaderi, prazne liste, poruke o grešci) u istom stilu
- [ ] 7.5 Dark mode (opciono, samo ako ga landing page već ima)

## Faza 8: Finalna dorada, testiranje, deployment
- [ ] 8.1 Seed baze realističnim demo podacima (useri, domaćinstva, proizvodi, porudžbine)
- [ ] 8.2 Pest testovi - pokriti kritične tokove (registracija, kreiranje proizvoda, korpa → porudžbina, admin akcije)
- [ ] 8.3 Optimizacija upita (eager loading, indeksi na FK kolonama)
- [ ] 8.4 Bezbednosna provera - Policy klase za sve modele (Product, Household, Order, Review)
- [ ] 8.5 Priprema za deployment (env, storage:link, queue ako treba za slanje mejlova)
- [ ] 8.6 Deploy na hosting/VPS
- [ ] 8.7 Dokumentacija/README za odbranu projekta
