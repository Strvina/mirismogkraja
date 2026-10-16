# Javni demo sajta

Demo je ista aplikacija, sa izmišljenim proizvođačima, proizvodima, porukama i uplatama, na
besplatnom hostingu. Služi da se sajt pokaže (portfolio, razgovor za posao, budući proizvođači),
dok pravi sajt ne proradi.

Po čemu se razlikuje od pravog sajta:

- Na svakoj strani stoji traka da je ovo demo, a na stranici za prijavu su dugmad sa tri demo naloga:
  kupac (`marko@example.com` / `password`), proizvođač (`nicic@example.com` / `password`) i
  administrator (`admin@gmail.com` / `admin`).
- Pretraživači ga ne indeksiraju (`robots.txt` sve zabranjuje, a svaka strana šalje `X-Robots-Tag:
  noindex`), da se izmišljeni proizvodi ne pojave na Google-u.
- Mejlovi se ne šalju, samo se upisuju u log. Zato registracija novog naloga ne može da se završi
  (link za potvrdu ne stiže); za razgledanje služe demo nalozi.
- Baza je SQLite, upisana pri pravljenju image-a. Svaki restart vraća sve na početno stanje, pa šta
  god posetilac promeni ili obriše, posle restarta toga nema.

Tehnički: poslednji deo (`demo`) `Dockerfile`-a, jedan kontejner sa PHP-ovim ugrađenim serverom
(4 radnika). Podešavanja su u samom `Dockerfile`-u; `APP_DEMO=true` uključuje traku i zabranu
indeksiranja.

## Postavljanje na Render (besplatno)

Potreban je nalog na [render.com](https://render.com) (prijava preko GitHub-a). Render ponekad pri
otvaranju naloga traži platnu karticu i za besplatan paket.

1. Na Render-u: **New → Blueprint**, pa izaberite repozitorijum `Strvina/mirismogkraja` (prvi put
   Render traži dozvolu da vidi GitHub repozitorijume).
2. Render pročita `render.yaml` iz repozitorijuma i predloži servis `vrelina-juga-demo` na
   besplatnom paketu. Kliknite **Apply**.
3. Prvo pravljenje traje 5 do 10 minuta. Kada se završi, adresa je oblika
   `https://vrelina-juga-demo.onrender.com` (tačna piše na stranici servisa).

Posle toga se demo sam pravi iznova na svaki push u `master`.

## Šta znači besplatan paket

- Posle 15 minuta bez posete servis se uspava. Prva poseta posle toga čeka oko minut dok se probudi,
  a onda radi normalno. Uspavljivanje je ujedno i restart, pa se podaci vraćaju na početno stanje.
- 512 MB memorije i deo jednog procesora: dovoljno za nekoliko posetilaca odjednom, ne za
  merenje brzine. Brojevi o brzini su u `docs/performance.md`.

## Lokalno, isti image

```bash
docker build -t vrelina-demo .
docker run --rm -p 8090:10000 -e PORT=10000 vrelina-demo
```

Sajt je na `http://localhost:8090`.
