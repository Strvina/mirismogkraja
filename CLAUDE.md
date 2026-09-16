# Projekat: Miris mog kraja – marketplace za domaćinstva

## Šta je ovo
Saas platforma koja promoviše domaćinstva (male proizvođače, poljoprivredna gazdinstva) i omogućava
im da prodaju svoje proizvode direktno kupcima. Korisnik može biti kupac (buyer), prodavac koji je
registrovao svoje domaćinstvo (seller), ili oboje istovremeno. Postoji i admin panel za mene kao
vlasnika platforme.

## Stek
- Laravel 12 (PHP 8.3+), Inertia.js, React 19 + TypeScript, Tailwind CSS v4
- Projekat je kreiran od `laravel/react-starter-kit` - NE menjaj auth scaffolding iz starter kita bez
  potrebe, samo ga proširuj.
- Spatie Laravel-permission za role (buyer, seller, admin).
- Pest za testove.

## Dizajn
U folderu `/design-reference` (ili gde ga smestim) nalazi se kopija postojećeg landing page repoa
(generisan u Lovable-u). To je JEDINI izvor istine za vizuelni identitet: boje, fontove, razmake,
izgled dugmadi/kartica/formi. SVAKA nova stranica ili komponenta koju praviš mora vizuelno da se
uklapa u taj dizajn - koristi iste Tailwind klase/tokene, isti font, istu paletu boja. Ne izmišljaj
nov stil. Ako nešto iz dizajna nije pokriveno (npr. izgled forme za checkout), ekstrapoliraj na
osnovu postojećih komponenti (isti radius, senke, spacing, boje dugmadi).

## Kako radimo
- Radimo **task po task**, taskovi su definisani u planu projekta (fajl `docs/plan.md` ili Redmine).
  Ne preskačati unapred i ne raditi stvari iz sledećih taskova/faza dok trenutni nije završen.
- Za svaki task: prvo predloži plan (koje fajlove praviš/menjaš, koje migracije, koje rute), pa tek
  onda piši kod - pogotovo za taskove koji diraju bazu (migracije se teško menjaju kasnije).
- Svaka nova tabela ide kroz Laravel migraciju + Eloquent model sa definisanim relacijama
  (`belongsTo`, `hasMany` itd.) i, gde ima smisla, factory za testove/seedere.
- Autorizacija: koristi Laravel Policy klase za svaki model gde ima smisla (Product, Household,
  Order, Review) - ne oslanjaj se samo na provere u kontroleru.
- Piši Pest test za svaki novi feature koji dira bazu ili poslovnu logiku (nije potrebno za čisto
  vizuelne komponente).
- Nemoj menjati strukturu baze iz prethodnih taskova bez da mi eksplicitno kažeš da to radiš i zašto.
- Kad nisi siguran za poslovno pravilo (npr. da li seller može da menja cenu proizvoda posle
  porudžbine, da li kupac mora prvo da naruči da bi ostavio ocenu) - pitaj me, ne pretpostavljaj.
- Komentare u kodu i commit poruke piši na engleskom, komunikaciju sa mnom na srpskom.

## Struktura baze
Puna specifikacija tabela je u `docs/database.md` - drži se tih naziva tabela i kolona osim ako se
izričito dogovorimo da ih menjamo. Pročitaj taj fajl pre svakog taska koji dira bazu.
