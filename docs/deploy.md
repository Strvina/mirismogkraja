# Postavljanje sajta na server

Uputstvo korak po korak, od praznog servera do sajta na internetu. Pisano je za **Ubuntu 24.04**, na
bilo kom VPS-u. Komande se kucaju u terminalu servera, preko SSH-a.

Šta je potrebno i šta su detalji pojedinih podešavanja opisano je u [scaling.md](scaling.md).

## 0. Server i domen

**Server bez troška: Oracle Cloud „Always Free“.** Oracle daje besplatan virtuelni server bez
vremenskog ograničenja (ARM „Ampere“, do 4 jezgra i 24 GB memorije), što je više nego dovoljno.
- Pri registraciji traže karticu radi provere identiteta. Dok koristite samo „Always Free“ resurse,
  ništa se ne naplaćuje.
- Mana: besplatni ARM serveri ponekad nisu odmah dostupni u izabranom regionu, pa treba probati
  ponovo ili izabrati drugi region (npr. Frankfurt).

Ako se kasnije pojavi budžet, isti koraci rade na bilo kom plaćenom VPS-u od par evra mesečno
(Hetzner, DigitalOcean i slični).

**Domen** (npr. `vrelinajuga.rs`) košta oko 1.500–2.500 dinara godišnje kod domaćih registara.
- Za početak može i besplatan poddomen (npr. `vrelinajuga.duckdns.org`).
- Za ozbiljan rad treba pravi domen: mejlovi sa njega ne završavaju u spamu, a kupci mu veruju.

U DNS podešavanjima domena dodajte `A` zapis koji pokazuje na javnu IP adresu servera.

## 1. Softver na serveru

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server git unzip curl \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl \
  php8.3-gd php8.3-bcmath php8.3-intl php8.3-zip composer \
  certbot python3-certbot-nginx

# Node.js 22, za pravljenje frontend fajlova
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Na Oracle serveru otvorite i portove 80 i 443:
- u Oracle konzoli: Networking → Security List → Ingress rules;
- na samom serveru:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 2. Baza

```bash
sudo mysql
```

```sql
CREATE DATABASE vrelina_juga CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vrelina'@'localhost' IDENTIFIED BY 'OVDE-DUGACKA-NASUMICNA-LOZINKA';
GRANT ALL PRIVILEGES ON vrelina_juga.* TO 'vrelina'@'localhost';
EXIT;
```

## 3. Kod

```bash
sudo mkdir -p /var/www/vrelina-juga && sudo chown $USER:www-data /var/www/vrelina-juga
git clone https://github.com/Strvina/mirismogkraja.git /var/www/vrelina-juga
cd /var/www/vrelina-juga

cp deploy/env.production.example .env
nano .env            # popunite sve ispod redova sa "CHANGE"
php artisan key:generate

composer install --no-dev --optimize-autoloader
npm ci && npm run build

php artisan migrate --force
php artisan db:seed --force      # samo uloge, kategorije i paketi; nema demo naloga
php artisan admin:create         # vaš administratorski nalog, lozinka se kuca skriveno
php artisan storage:link
php artisan optimize

# PHP (www-data) mora da piše u storage i cache
sudo chown -R $USER:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache
```

### Dvostruka potvrda za admin nalog (preporučeno)

Admin nalog potvrđuje uplate i blokira naloge, pa ga ne treba štititi samo lozinkom. Odmah posle prve
prijave otvorite „Moj nalog → Dvostruka potvrda“, skenirajte kod aplikacijom (Google Authenticator,
Microsoft Authenticator, Aegis) i **prepišite rezervne kodove na papir**. Admin panel vas podseća dok
to ne uradite.

Ako izgubite i telefon i rezervne kodove, potvrda se skida sa servera:

```bash
php artisan tinker --execute="app(App\Services\TwoFactor::class)->disable(App\Models\User::where('email', 'vas@email.com')->firstOrFail());"
```

### Prijava preko Google naloga (nije obavezno)

Dugme „Nastavi sa Google nalogom“ se pojavljuje tek kada upišete ključeve. Besplatno je:

1. Otvorite [console.cloud.google.com](https://console.cloud.google.com), napravite projekat.
2. „APIs & Services“ → „OAuth consent screen“: tip „External“, naziv sajta, vaš mejl, pa „Publish app“.
3. „Credentials“ → „Create credentials“ → „OAuth client ID“ → „Web application“.
4. Pod „Authorized redirect URIs“ upišite tačno `https://vasdomen.rs/auth/google/callback`.
5. Dobijeni „Client ID“ i „Client secret“ upišite u `.env` kao `GOOGLE_CLIENT_ID` i
   `GOOGLE_CLIENT_SECRET`, pa pokrenite `php artisan optimize`.

Sertifikati koje proizvođači šalju čuvaju se u `storage/app/private`, van javnog dela sajta. Taj
folder ulazi u backup servera, ne u noćni backup baze, pa ga kopirajte zajedno sa `storage/app/public`.

## 4. Web server i HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/vrelina-juga
sudo nano /etc/nginx/sites-available/vrelina-juga     # example.rs → vaš domen
sudo ln -s /etc/nginx/sites-available/vrelina-juga /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d vasdomen.rs -d www.vasdomen.rs      # besplatan HTTPS, sam se obnavlja
```

Sajt mora da radi preko HTTPS-a, jer kolačići sesije na produkciji idu samo preko HTTPS-a.

**Ako je ispred servera Cloudflare (narandžasti oblak) ili neki drugi proxy:** u `.env` upišite `TRUSTED_PROXIES=*`, pa `php artisan optimize`. Bez toga sajt svakog posetioca vidi kao istu adresu (svi dele jedno ograničenje broja zahteva) i misli da ga čitaju preko običnog HTTP-a. Ako nginx sam gleda ka internetu, kao u ovom uputstvu, ostavite prazno.

## 5. Zakazani poslovi (cron)

Bez cron-a se ne dešava sledeće: članarine i isticanja ne ističu, mejlovi o porukama i „Javi mi kad
stigne“ ne idu, a noćni backup se ne pravi.

```bash
crontab -e
```

Dodajte red:

```
* * * * * cd /var/www/vrelina-juga && php artisan schedule:run >> /dev/null 2>&1
```

Šta se tada samo pokreće (vreme je po `APP_TIMEZONE`, podrazumevano Beograd):

| Kada | Šta |
|---|---|
| na 5 minuta | mejl o nepročitanim porukama |
| na sat | „Javi mi kad stigne“ za proizvode koji su ponovo dostupni |
| 02:30 | backup baze |
| 03:30–03:50 | brisanje starih logova, pročitanih obaveštenja i brojača pretraga |
| 06:00 | kraj pauza kojima je prošao datum povratka; pratioci dobijaju obaveštenje |
| 07:00 | članarine i isticanja: upozorenje pred istek (i mejlom) i zatvaranje isteklih |
| 10:00 | podsetnik vlasniku stranice koja je posle nedelju dana i dalje skoro prazna |
| četvrtak, petak i subota u 09:00 | nedeljni pregled pratiocima proizvođača koji su nešto objavili (svako ga dobija jednom nedeljno) |

Spisak sa sledećim terminom svakog posla: `php artisan schedule:list`.

**Koliko mejlova ide.** Besplatan Brevo paket šalje do 300 mejlova dnevno, a to mora da ostane i za
mejlove o porukama i promenu lozinke. Zato nedeljni pregled u jednom pokretanju pošalje najviše 150
mejlova (`DIGEST_MAX_PER_RUN` u `.env`), a ostali ga dobiju sutradan - tri jutra, dakle do 450
korisnika nedeljno. Kada ih bude više, pređite na plaćeni paket i povećajte taj broj. Mejl koji nije
poslat vidi se u `storage/logs` i u Sentry-ju.

## 6. Provera

```bash
php artisan mail:test vas@email.com     # stiže li mejl?
php artisan sentry:test                 # stiže li greška u Sentry?
php artisan backup:database             # pravi li se backup?
curl -s -o /dev/null -w "%{http_code}\n" https://vasdomen.rs/up    # 200 = sve radi
```

Na kraju na [UptimeRobot](https://uptimerobot.com) (besplatno) dodajte proveru adrese
`https://vasdomen.rs/up`. Ako sajt ili baza prestanu da rade, javiće vam mejlom.

## Svaka sledeća verzija

Kada se novi PR-ovi spoje u `master`, na serveru pokrenite:

```bash
cd /var/www/vrelina-juga && ./deploy/deploy.sh
```

Skripta uključi stranicu „održavanje“, povuče kod, instalira pakete, napravi frontend, pokrene
migracije, osveži keš i vrati sajt. Ako bilo koji korak ne uspe, sajt ostaje u režimu održavanja dok
se greška ne ispravi. Tako kupci nikad ne vide polovično ažuriran sajt.

## Ako nešto ne radi

- Bela strana ili greška 500: pogledajte `storage/logs/laravel-*.log` i Sentry.
- „Permission denied“ u logu: ponovite `chown`/`chmod` iz koraka 3.
- Nešto na strani blokirano (vidi se u konzoli pregledača): privremeno stavite
  `CSP_REPORT_ONLY=true` u `.env`, pa `php artisan optimize`. U konzoli će i dalje pisati šta je blokirano, da se ispravi.
