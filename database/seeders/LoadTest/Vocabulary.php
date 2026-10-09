<?php

namespace Database\Seeders\LoadTest;

/**
 * The words the load-test data is written in.
 *
 * Real ones, by category, rather than Faker's Latin: the search is measured
 * on this data, and a search for "ajvar" is only worth timing when ajvar is
 * a share of the catalogue and not a word that never occurs.
 */
final class Vocabulary
{
    /**
     * What is sold in each category of CategoriesSeeder, keyed by the
     * category's name: units, a price range in RSD and product names.
     *
     * @var array<string, array{units: list<string>, price: array{0: int, 1: int}, names: list<string>}>
     */
    public const PRODUCTS = [
        'Voće' => ['units' => ['kg'], 'price' => [80, 650], 'names' => ['Jabuke ajdared', 'Jabuke zlatni delišes', 'Šljive požegače', 'Kruške viljamovke', 'Maline', 'Kupine', 'Višnje oblačinske', 'Dunje leskovačke', 'Breskve', 'Kajsije', 'Trešnje', 'Jagode', 'Grožđe hamburg', 'Orasi u ljusci', 'Lešnici', 'Borovnice']],
        'Povrće' => ['units' => ['kg'], 'price' => [60, 400], 'names' => ['Krompir beli', 'Crni luk', 'Šargarepa', 'Krastavci kornišoni', 'Tikvice', 'Plavi patlidžan', 'Praziluk', 'Cvekla', 'Bundeva', 'Mladi luk', 'Spanać', 'Boranija']],
        'Paprika za ajvar' => ['units' => ['kg'], 'price' => [90, 220], 'names' => ['Paprika za ajvar kurtovka', 'Crvena paprika roga za ajvar', 'Paprika za ajvar slonovo uvo', 'Pečena paprika za ajvar']],
        'Paradajz' => ['units' => ['kg'], 'price' => [100, 320], 'names' => ['Domaći paradajz volovsko srce', 'Paradajz jabučar', 'Čeri paradajz', 'Paradajz za kuvanje']],
        'Beli luk' => ['units' => ['kg', 'kom'], 'price' => [150, 900], 'names' => ['Domaći beli luk', 'Beli luk jesenji', 'Venac belog luka', 'Mladi beli luk']],
        'Pasulj' => ['units' => ['kg'], 'price' => [350, 800], 'names' => ['Pasulj tetovac', 'Pasulj gradištanac', 'Šareni pasulj', 'Pasulj zelenčok']],
        'Kupus' => ['units' => ['kg', 'kom'], 'price' => [50, 260], 'names' => ['Kupus futoški', 'Kiseli kupus u glavicama', 'Ribani kiseli kupus', 'Kupus srpski melez']],
        'Mlečni proizvodi' => ['units' => ['l', 'kg', 'kom'], 'price' => [120, 900], 'names' => ['Domaće kravlje mleko', 'Kiselo mleko', 'Domaći jogurt', 'Pavlaka', 'Surutka', 'Domaći maslac', 'Urda']],
        'Kozji sir' => ['units' => ['kg'], 'price' => [900, 2200], 'names' => ['Kozji sir mladi', 'Kozji sir zreli', 'Kozji sir u maslinovom ulju', 'Dimljeni kozji sir']],
        'Ovčiji sir' => ['units' => ['kg'], 'price' => [1100, 2400], 'names' => ['Ovčiji sir beli', 'Ovčiji sir iz kace', 'Stari ovčiji sir', 'Ovčiji sir punomasni']],
        'Kravlji sir' => ['units' => ['kg'], 'price' => [500, 1300], 'names' => ['Kravlji sir mladi', 'Kravlji sir polumasni', 'Sir sitan', 'Beli kravlji sir u kriškama']],
        'Kajmak' => ['units' => ['kg', 'g'], 'price' => [900, 2600], 'names' => ['Mladi kajmak', 'Stari kajmak', 'Kajmak od kravljeg mleka', 'Kajmak ovčiji']],
        'Kačkavalj' => ['units' => ['kg'], 'price' => [1200, 2800], 'names' => ['Pirotski tip kačkavalja', 'Kačkavalj kravlji', 'Kačkavalj ovčiji', 'Dimljeni kačkavalj']],
        'Med i pčelinji proizvodi' => ['units' => ['kg', 'g', 'kom'], 'price' => [400, 3500], 'names' => ['Propolis kapi', 'Polen', 'Matični mleč', 'Med sa saćem', 'Pčelinji vosak', 'Medovina', 'Suncokretov med']],
        'Bagremov med' => ['units' => ['kg', 'g'], 'price' => [900, 1600], 'names' => ['Bagremov med', 'Bagremov med tegla', 'Bagremov med sa saćem']],
        'Livadski med' => ['units' => ['kg', 'g'], 'price' => [700, 1300], 'names' => ['Livadski med', 'Livadski med kristalisan', 'Planinski livadski med']],
        'Šumski med' => ['units' => ['kg', 'g'], 'price' => [1000, 1900], 'names' => ['Šumski med', 'Šumski med medljikovac', 'Tamni šumski med']],
        'Žitarice' => ['units' => ['kg', 'paket'], 'price' => [70, 450], 'names' => ['Kukuruzno brašno', 'Pšenično integralno brašno', 'Heljdino brašno', 'Ovsene pahuljice', 'Projino brašno sa vodenice', 'Kukuruz u zrnu', 'Ječam', 'Speltino brašno']],
        'Jaja' => ['units' => ['kom', 'paket'], 'price' => [25, 450], 'names' => ['Domaća jaja', 'Jaja od kokoši iz slobodnog uzgoja', 'Prepeličja jaja', 'Pačja jaja']],
        'Meso i suhomesnato' => ['units' => ['kg'], 'price' => [700, 3200], 'names' => ['Sušeno svinjsko meso', 'Goveđa pečenica', 'Domaća mast', 'Jagnjetina', 'Sudžuk', 'Dimljena rebra', 'Kulen']],
        'Slanina' => ['units' => ['kg'], 'price' => [900, 1800], 'names' => ['Domaća slanina sušena', 'Mesnata slanina', 'Pančeta', 'Hamburška slanina']],
        'Pršuta' => ['units' => ['kg'], 'price' => [2200, 4200], 'names' => ['Svinjska pršuta', 'Goveđa pršuta', 'Ovčija pršuta stelja']],
        'Kobasice' => ['units' => ['kg'], 'price' => [900, 2100], 'names' => ['Domaće kobasice ljute', 'Domaće kobasice blage', 'Sremska kobasica', 'Peglana kobasica']],
        'Čvarci' => ['units' => ['kg'], 'price' => [1300, 2400], 'names' => ['Domaći čvarci', 'Duvan čvarci', 'Čvarci krupni']],
        'Piletina' => ['units' => ['kg', 'kom'], 'price' => [450, 1100], 'names' => ['Domaće pile', 'Pileći batak i karabatak', 'Domaća kokoš za supu']],
        'Rakija i vino' => ['units' => ['l'], 'price' => [500, 2500], 'names' => ['Lozovača', 'Viljamovka', 'Medovača', 'Travarica', 'Komovica', 'Orahovača', 'Višnjevača']],
        'Šljivovica' => ['units' => ['l'], 'price' => [700, 2200], 'names' => ['Šljivovica prepečenica', 'Šljivovica odležala u hrastu', 'Meka šljivovica', 'Šljivovica od požegače']],
        'Dunjevača' => ['units' => ['l'], 'price' => [1100, 2600], 'names' => ['Dunjevača', 'Dunjevača od leskovačke dunje', 'Dunjevača odležala']],
        'Kajsijevača' => ['units' => ['l'], 'price' => [1100, 2500], 'names' => ['Kajsijevača', 'Kajsijevača dvaput pečena']],
        'Vino' => ['units' => ['l'], 'price' => [450, 1900], 'names' => ['Crno vino prokupac', 'Belo vino tamjanika', 'Roze vino', 'Crno vino vranac', 'Belo vino smederevka']],
        'Zimnica' => ['units' => ['kom', 'kg'], 'price' => [250, 900], 'names' => ['Pečene paprike u tegli', 'Kiseli krastavci', 'Paradajz sos kuvani', 'Paprika punjena kupusom', 'Mešana salata', 'Cvekla kisela']],
        'Ajvar' => ['units' => ['kom', 'kg'], 'price' => [450, 1100], 'names' => ['Ajvar blagi', 'Ajvar ljuti', 'Domaći ajvar od pečene paprike', 'Ajvar sa patlidžanom', 'Ajvar po bakinom receptu']],
        'Pinđur' => ['units' => ['kom'], 'price' => [380, 800], 'names' => ['Pinđur', 'Pinđur ljuti', 'Pinđur sa belim lukom']],
        'Ljutenica' => ['units' => ['kom'], 'price' => [350, 780], 'names' => ['Ljutenica', 'Ljutenica blaga', 'Ljutenica sa paradajzom']],
        'Turšija' => ['units' => ['kom', 'kg'], 'price' => [280, 700], 'names' => ['Turšija mešana', 'Turšija od paprike', 'Ljute papričice u turšiji']],
        'Sušena paprika' => ['units' => ['kom', 'kg'], 'price' => [300, 2400], 'names' => ['Sušena paprika u vencu', 'Sušena paprika za punjenje', 'Mlevena crvena paprika', 'Tucana ljuta paprika']],
        'Sokovi, slatko i džem' => ['units' => ['kom', 'l'], 'price' => [250, 900], 'names' => ['Sirup od zove', 'Kompot od šljiva', 'Sirup od nane', 'Kompot od dunja']],
        'Sokovi' => ['units' => ['l'], 'price' => [200, 600], 'names' => ['Sok od jabuke ceđeni', 'Sok od maline', 'Sok od paradajza', 'Sok od aronije', 'Sok od višnje']],
        'Slatko' => ['units' => ['kom'], 'price' => [400, 950], 'names' => ['Slatko od šumskih jagoda', 'Slatko od dunja', 'Slatko od višanja', 'Slatko od smokava', 'Slatko od ruža']],
        'Džem i pekmez' => ['units' => ['kom'], 'price' => [350, 850], 'names' => ['Pekmez od šljiva bez šećera', 'Džem od kajsija', 'Džem od malina', 'Džem od šipurka', 'Pekmez od dunja']],
        'Poklon paketi' => ['units' => ['paket'], 'price' => [1500, 6500], 'names' => ['Poklon paket zimnica', 'Poklon korpa sa medom i rakijom', 'Slavski paket', 'Novogodišnji poklon paket', 'Paket za degustaciju']],
        'Ostalo' => ['units' => ['kom', 'kg', 'paket'], 'price' => [200, 1800], 'names' => ['Domaće testenine', 'Sušene šljive', 'Čaj od majčine dušice', 'Sušene pečurke vrganji', 'Domaći sapun', 'Orah jezgro', 'Suvo voće mešano']],
    ];

    /** For a category an admin added since, which has no words of its own here. */
    public const FALLBACK_PRODUCT = ['units' => ['kom', 'kg'], 'price' => [200, 1500], 'names' => ['Domaći proizvod', 'Proizvod sa sela', 'Proizvod po starom receptu']];

    /** What a product sold by the piece comes in. @var list<string> */
    public const PACKAGINGS = ['tegla 720 g', 'tegla 370 g', 'tegla 1 kg', 'flaša 0,7 l', 'flaša 1 l', 'pakovanje 500 g', 'porodično pakovanje'];

    /** What a producer adds to the name of something sold by weight or volume. @var list<string> */
    public const QUALIFIERS = ['prva klasa', 'berba ove godine', 'sa planine', 'za zimnicu', 'organski uzgoj', 'na veliko'];

    /** @var list<string> */
    public const PRODUCT_SENTENCES = [
        'Pravimo u malim serijama, po receptu koji se u kući ne menja.',
        'Bez konzervansa i bez dodatih aroma.',
        'Iz ovogodišnje berbe, sa naše njive.',
        'Pakujemo tek kada je gotovo kako treba.',
        'Šaljemo kurirskom službom, pažljivo upakovano.',
        'Može preuzimanje na gazdinstvu, uz najavu dan ranije.',
        'Za veće količine pišite, dogovorićemo cenu.',
        'Domaći proizvod sa juga Srbije, direktno od proizvođača.',
        'Gajeno bez prskanja pred berbu.',
        'Stoji na hladnom i tamnom mestu do godinu dana.',
        'Kupci se vraćaju svake jeseni po još.',
        'Količine su ograničene, javite se na vreme.',
    ];

    /**
     * Southern Serbia's towns, the larger ones several times over so that
     * most producers come from a few of them, as they would.
     *
     * @var list<array{0: string, 1: float, 2: float, 3: int}> name, latitude, longitude, weight
     */
    public const TOWNS = [
        ['Niš', 43.3209, 21.8958, 16], ['Leskovac', 42.9981, 21.9461, 12], ['Vranje', 42.5514, 21.9003, 8],
        ['Pirot', 43.1531, 22.5861, 7], ['Prokuplje', 43.2342, 21.5881, 6], ['Aleksinac', 43.5417, 21.7078, 5],
        ['Vlasotince', 42.9667, 22.1333, 5], ['Kruševac', 43.5800, 21.3339, 5], ['Zaječar', 43.9036, 22.2639, 4],
        ['Knjaževac', 43.5667, 22.2572, 4], ['Bela Palanka', 43.2181, 22.3142, 3], ['Lebane', 42.9167, 21.7333, 3],
        ['Surdulica', 42.6906, 22.1706, 3], ['Vladičin Han', 42.7078, 22.0633, 3], ['Bujanovac', 42.4600, 21.7667, 2],
        ['Kuršumlija', 43.1408, 21.2678, 3], ['Blace', 43.2906, 21.2847, 2], ['Svrljig', 43.4142, 22.1167, 2],
        ['Sokobanja', 43.6433, 21.8700, 3], ['Dimitrovgrad', 43.0158, 22.7781, 2], ['Babušnica', 43.0681, 22.4114, 2],
        ['Medveđa', 42.8414, 21.5844, 1], ['Bojnik', 43.0142, 21.7181, 2], ['Crna Trava', 42.8103, 22.2989, 1],
        ['Gadžin Han', 43.2231, 22.0328, 2], ['Merošina', 43.2817, 21.7203, 2], ['Doljevac', 43.1969, 21.8336, 2],
        ['Žitorađa', 43.1900, 21.7133, 2], ['Ražanj', 43.6708, 21.5494, 1], ['Trgovište', 42.3514, 22.0872, 1],
        ['Bosilegrad', 42.5003, 22.4728, 1], ['Preševo', 42.3092, 21.6497, 1], ['Brus', 43.3836, 21.0333, 2],
        ['Aleksandrovac', 43.4586, 21.0467, 3], ['Trstenik', 43.6167, 21.0000, 2], ['Boljevac', 43.8314, 21.9519, 1],
    ];

    /** @var list<string> */
    public const PRODUCER_KINDS = ['Domaćinstvo', 'Gazdinstvo', 'Pčelinjak', 'Mlekara', 'Voćnjak', 'Vinarija', 'Sušara', 'Salaš', 'Bašta', 'Destilerija', 'Farma', 'Podrum', 'Zadruga', 'Imanje'];

    /** @var list<string> */
    public const SURNAMES = [
        'Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Stanković', 'Pavlović', 'Milošević',
        'Ristić', 'Mitić', 'Cvetković', 'Stefanović', 'Zdravković', 'Stamenković', 'Veljković', 'Mladenović', 'Dimitrijević', 'Kostić',
        'Živković', 'Anđelković', 'Krstić', 'Janković', 'Tasić', 'Nešić', 'Savić', 'Radenković', 'Miljković', 'Popović',
        'Lazarević', 'Todorović', 'Antić', 'Simić', 'Trajković', 'Pešić', 'Golubović', 'Rančić', 'Bogdanović', 'Vukadinović',
        'Mihajlović', 'Filipović', 'Arsić', 'Stojković', 'Nedeljković', 'Spasić', 'Ivanović', 'Aleksić', 'Momčilović', 'Jocić',
    ];

    /** @var list<string> */
    public const FIRST_NAMES = [
        'Dragan', 'Milan', 'Zoran', 'Goran', 'Slobodan', 'Nenad', 'Marko', 'Stefan', 'Nikola', 'Aleksandar',
        'Vesna', 'Snežana', 'Jelena', 'Marija', 'Milica', 'Jovana', 'Ana', 'Dragana', 'Ivana', 'Gordana',
        'Miroslav', 'Bojan', 'Dejan', 'Vladimir', 'Saša', 'Ljiljana', 'Biljana', 'Tamara', 'Katarina', 'Svetlana',
    ];

    /** @var list<string> */
    public const PRODUCER_SENTENCES = [
        'Porodično gazdinstvo sa tradicijom dugom tri generacije.',
        'Sve što prodajemo proizvodimo sami, na svom imanju.',
        'Radimo u malim serijama i ne žurimo.',
        'Naši proizvodi stižu direktno sa sela, bez posrednika.',
        'Ne koristimo veštačka đubriva ni konzervanse.',
        'Dobrodošli ste da nas posetite i probate pre nego što kupite.',
        'Šaljemo širom Srbije, a subotom smo na pijaci.',
        'Počeli smo za svoju kuću, a danas hranimo i komšije i kupce iz grada.',
        'Recepte smo nasledili od baka i nismo ih menjali.',
        'Nalazimo se u podnožju planine, na čistom vazduhu i dobroj vodi.',
    ];

    /** @var list<string> */
    public const GALLERY_CAPTIONS = ['Naše dvorište u jutarnjim satima', 'Priprema, korak po korak', 'Spremno za pakovanje', 'Berba', 'Na pijaci subotom'];

    /** @var list<string> */
    public const PAUSE_NOTES = ['Rasprodato do nove berbe.', 'Na godišnjem odmoru smo, vraćamo se uskoro.', 'Trenutno ne primamo nove porudžbine.'];

    /** @var list<string> */
    public const BUYER_OPENINGS = [
        'Dobar dan, da li imate ovo na stanju i kolika je cena za veću količinu?',
        'Pozdrav, da li šaljete kurirskom službom za Beograd?',
        'Zanima me da li je ovo iz ovogodišnje berbe i koliko imate na raspolaganju.',
        'Dobar dan, da li može preuzimanje vikendom i u kojim satima?',
        'Pozdrav, koliko unapred treba naručiti za slavu?',
        'Da li pakujete u manja pakovanja za poklon?',
        'Dobar dan, video sam vaš profil. Da li prodajete i na pijaci u Nišu?',
        'Pozdrav, da li je cena ista ako uzmem deset komada?',
    ];

    /** @var list<string> */
    public const PRODUCER_REPLIES = [
        'Dobar dan, imamo. Za veću količinu može dogovor oko cene, javite kada vam odgovara preuzimanje.',
        'Pozdrav, šaljemo kurirskom službom svakog utorka i petka.',
        'Jeste, sve je iz ovogodišnje berbe. Trenutno imamo dovoljno, recite koliko vam treba.',
        'Može i subotom i nedeljom, najbolje pre podne. Javite dan ranije.',
        'Hvala na interesovanju. Poslaću vam cenovnik i slike večeras.',
        'Naravno, pakujemo i za poklon. Koliko komada vam treba?',
        'Na pijaci smo subotom, tezga je odmah kod ulaza.',
        'Za deset komada spuštamo cenu deset posto.',
    ];

    /** @var list<string> */
    public const BUYER_FOLLOW_UPS = [
        'Odlično, uzeo bih pet komada. Kako da platim?',
        'Hvala, javiću se sutra da potvrdim.',
        'Može, pošaljite mi na adresu koju ću vam napisati.',
        'Da li može pouzećem?',
        'Dogovoreno, dolazim u subotu pre podne.',
        'Stiglo je, sve je u redu. Hvala vam!',
        'A do kada važi ta cena?',
    ];

    /** @var list<string> */
    public const PRODUCER_FOLLOW_UPS = [
        'Može pouzećem, poštarinu plaća kupac.',
        'Dogovoreno, čekamo vas.',
        'Poslato jutros, stiže sutra do podne.',
        'Hvala vama, javite se opet.',
        'Cena važi do kraja meseca.',
        'Napišite mi adresu i broj telefona za kurira.',
    ];

    /**
     * What buyers write, by rating.
     *
     * @var array<int, list<string>>
     */
    public const REVIEW_COMMENTS = [
        5 => ['Ukus baš kao od kuće, stiglo brzo i pažljivo upakovano.', 'Sve pohvale, naručujem ponovo.', 'Odličan kvalitet i ljubazan proizvođač.', 'Najbolje što sam probao ove godine.'],
        4 => ['Kvalitetno, samo je dostava malo kasnila.', 'Vrlo dobro, preporučujem.', 'Ukusno, pakovanje bi moglo biti bolje.'],
        3 => ['Dobro, ali sam očekivao malo veće pakovanje za tu cenu.', 'Korektno, ništa posebno.'],
        2 => ['Stiglo je kasno i jedna tegla je bila napukla.', 'Nije kao na slici.'],
        1 => ['Nisam zadovoljan, proizvođač se nije javljao danima.', 'Roba nije stigla u dogovoreno vreme.'],
    ];

    /** @var list<string> */
    public const REVIEW_REPLIES = ['Hvala vam na lepim rečima, vidimo se opet!', 'Hvala, drago nam je da vam se dopalo.', 'Žao nam je zbog kašnjenja, sledeći put šaljemo ranije.', 'Hvala na utisku, trudimo se da budemo bolji.'];
}
