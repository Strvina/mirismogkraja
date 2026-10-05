# Projekat: Vrelina juga – marketplace za domaćinstva

## Prvo pročitaj
Pre svakog zadatka pročitaj `CLAUDE_CONTEXT.md`: stanje projekta, modeli, poslovna pravila, donete
odluke i šta je ostalo. Odatle utvrdi gde treba raditi, pa čitaj samo fajlove koji su bitni za
zadatak - ne analiziraj ceo projekat iznova. Posle svake značajne izmene (baza, dozvole, poslovna
pravila, arhitektura, nova funkcionalnost) odmah ispravi taj fajl: zastarelo zameni, ne dopisuj.

## Šta je ovo
Saas platforma koja promoviše male proizvođače i poljoprivredna gazdinstva i povezuje ih direktno sa
kupcima. **Nije prodavnica**: nema korpe ni plaćanja na sajtu - kupac pošalje upit, a dogovor ide u
porukama. Korisnik može biti kupac (buyer), vlasnik stranice proizvođača (seller), ili oboje
istovremeno. Platforma zarađuje od proizvođača (članarine, isticanje, kampanje - uplatnicom).
Postoji i admin panel za mene kao vlasnika platforme.

## Stek
- Laravel 12 (PHP 8.2+), Inertia.js, React 19 + TypeScript, Tailwind CSS v4
- Projekat je kreiran od `laravel/react-starter-kit` - NE menjaj auth scaffolding iz starter kita bez
  potrebe, samo ga proširuj.
- Spatie Laravel-permission za role (buyer, seller, admin).
- PHPUnit za feature/unit testove (`tests/`), Playwright za testove u pregledaču (`e2e/`).

## Dizajn
U folderu `/design-reference` (ili gde ga smestim) nalazi se kopija postojećeg landing page repoa
(generisan u Lovable-u). To je JEDINI izvor istine za vizuelni identitet: boje, fontove, razmake,
izgled dugmadi/kartica/formi. SVAKA nova stranica ili komponenta koju praviš mora vizuelno da se
uklapa u taj dizajn - koristi iste Tailwind klase/tokene, isti font, istu paletu boja. Ne izmišljaj
nov stil. Ako nešto iz dizajna nije pokriveno (npr. izgled nove admin strane), ekstrapoliraj na
osnovu postojećih komponenti (isti radius, senke, spacing, boje dugmadi).

## Kako radimo
- Radimo **task po task**, taskovi su definisani kao GitHub Issues u ovom repou i praćeni na GitHub
  Project board-u (https://github.com/users/Strvina/projects/1). Ne preskačati unapred i ne raditi
  stvari iz sledećih taskova/faza dok trenutni nije završen i zatvoren.
- Za svaki task: prvo predloži plan (koje fajlove praviš/menjaš, koje migracije, koje rute), pa tek
  onda piši kod - pogotovo za taskove koji diraju bazu (migracije se teško menjaju kasnije).
- Svaka nova tabela ide kroz Laravel migraciju + Eloquent model sa definisanim relacijama
  (`belongsTo`, `hasMany` itd.) i, gde ima smisla, factory za testove/seedere.
- Autorizacija: koristi Laravel Policy klase za svaki model gde ima smisla (Producer, Product,
  ProducerMessage, Review) - ne oslanjaj se samo na provere u kontroleru.
- Piši PHPUnit test za svaki novi feature koji dira bazu ili poslovnu logiku (nije potrebno za čisto
  vizuelne komponente).
- Nemoj menjati strukturu baze iz prethodnih taskova bez da mi eksplicitno kažeš da to radiš i zašto.
- Kad nisi siguran za poslovno pravilo (npr. da li proizvođač sme da menja cenu posle
  upita, ko sme da ostavi utisak) - pitaj me, ne pretpostavljaj.
- Komentare u kodu i commit poruke piši na engleskom, komunikaciju sa mnom na srpskom.
- Git workflow: za SVAKI task napravi poseban branch (npr. `task/1.1-extend-users-migration`), radi i
  commituj tamo, pa nakon što se proveri da radi (testovi prolaze, ponašanje je ispravno) otvori
  pravi GitHub Pull Request (`gh pr create`, sa "Closes #N" u opisu da se Issue automatski zatvori) i
  spoji ga (`gh pr merge`). Ne komituj direktno na `master` i ne radi lokalni `git merge` bez PR-a -
  ovo daje vidljivu evidenciju (diff, veza sa Issue-om) za svaki task na GitHub-u.

## Struktura baze
Puna specifikacija tabela je u `docs/database.md` - drži se tih naziva tabela i kolona osim ako se
izričito dogovorimo da ih menjamo. Pročitaj taj fajl pre svakog taska koji dira bazu.
