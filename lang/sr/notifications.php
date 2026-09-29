<?php

/*
 * What each notification says. Keyed by the notification's type (see
 * App\Notifications\SiteNotification); :params are its stored facts.
 */
return [
    'date_format' => 'j. F Y.',

    'producer' => [
        'approved' => ['title' => 'Vaš proizvođač je odobren', 'body' => '„:producer” je od sada vidljiv svima na sajtu.'],
        'verified' => ['title' => 'Vaš profil je proveren', 'body' => '„:producer” od sada nosi oznaku proverenog proizvođača.'],
        'blocked' => ['title' => 'Vaš proizvođač je skriven', 'body' => '„:producer” trenutno nije vidljiv na sajtu. Javite nam se ako mislite da je greška.'],
    ],

    'founding' => [
        'granted' => [
            'title' => 'Postali ste osnivač #:number',
            'body' => '„:producer” je među prvim proizvođačima na sajtu i dobija Premium članstvo na poklon, do :ends_on.',
        ],
    ],

    'change-request' => [
        'approved' => ['title' => 'Izmena naziva je odobrena', 'body' => 'Vaš proizvođač se od sada zove „:name”.'],
        'rejected' => ['title' => 'Izmena naziva nije odobrena', 'body' => 'Naziv „:name” nije prihvaćen, pa ostaje dosadašnji. Javite nam se ako vam treba pomoć.'],
    ],

    'product' => [
        'published' => ['title' => ':producer ima nešto novo', 'body' => '„:product” je upravo objavljen.'],
    ],

    'review' => [
        'received' => ['title' => 'Novi utisak o vama', 'body' => 'Neko je ostavio utisak o „:producer”. Biće objavljen kada ga pregledamo.'],
        'published' => ['title' => 'Vaš utisak je objavljen', 'body' => 'Utisak o „:producer” je od sada vidljiv svima.'],
    ],

    'weekly-pick' => ['title' => 'Proizvođač nedelje', 'body' => '„:producer” je proizvođač nedelje od :starts_on i biće istaknut na početnoj strani.'],

    'membership' => [
        'requested' => ['title' => 'Uplatnica za članarinu je spremna', 'body' => 'Paket „:plan”, :amount RSD, poziv na broj :reference. Aktiviramo ga čim uplata stigne.'],
        'activated' => ['title' => 'Članarina je aktivirana', 'body' => 'Paket „:plan” važi do :ends_on.'],
        'ending' => ['title' => 'Članarina uskoro ističe', 'body' => 'Paket „:plan” važi do :ends_on. Uplatnicu za obnovu naći ćete na stranici članarine.'],
        'expired' => ['title' => 'Članarina je istekla', 'body' => 'Paket „:plan” je istekao. Vaša stranica ostaje na sajtu, ali bez dodatnih pogodnosti dok ne obnovite.'],
        'cancelled' => ['title' => 'Članarina je otkazana', 'body' => 'Paket „:plan” više nije aktivan. Ako imate pitanja, javite nam se.'],
    ],

    'boost' => [
        'requested' => ['title' => 'Uplatnica za isticanje je spremna', 'body' => '„:name”, :amount RSD, poziv na broj :reference. Isticanje počinje čim uplata stigne.'],
        'activated' => ['title' => 'Isticanje je aktivirano', 'body' => '„:name” je istaknut do :ends_on.'],
        'ending' => ['title' => 'Isticanje se završava sutra', 'body' => '„:name” je istaknut do :ends_on. Ako želite da nastavite, novo isticanje se nadovezuje.'],
        'expired' => ['title' => 'Isticanje je završeno', 'body' => '„:name” više nije istaknut.'],
        'cancelled' => ['title' => 'Isticanje je otkazano', 'body' => '„:name” više nije istaknut. Ako imate pitanja, javite nam se.'],
    ],

    'campaign' => [
        'requested' => ['title' => 'Uplatnica za kampanju je spremna', 'body' => '„:campaign”, :amount RSD, poziv na broj :reference. Uključujemo vas čim uplata stigne.'],
        'joined' => ['title' => 'Učestvujete u kampanji', 'body' => 'Uplata je primljena — vaš profil je na stranici kampanje „:campaign”.'],
        'cancelled' => ['title' => 'Učešće u kampanji je otkazano', 'body' => 'Više niste na stranici kampanje „:campaign”. Ako imate pitanja, javite nam se.'],
    ],

    'admin' => [
        'producer-pending' => ['title' => 'Novi proizvođač čeka odobrenje', 'body' => '„:producer” (:city).'],
        'membership-requested' => ['title' => 'Nova uplata za članarinu', 'body' => '„:producer” — paket :plan, :amount RSD, poziv na broj :reference.'],
        'boost-requested' => ['title' => 'Nova uplata za isticanje', 'body' => '„:producer” — :name, :amount RSD, poziv na broj :reference.'],
        'campaign-requested' => ['title' => 'Nova prijava za kampanju', 'body' => '„:producer” — :campaign, :amount RSD, poziv na broj :reference.'],
        'cancel-requested' => ['title' => 'Zahtev za otkazivanje', 'body' => '„:producer” traži otkazivanje: :what.'],
        'review-pending' => ['title' => 'Novi utisak čeka odobrenje', 'body' => 'O proizvođaču „:producer”, ocena :rating/5.'],
        'report-opened' => ['title' => 'Nova prijava problema', 'body' => ':subject — :reason.'],
        'change-requested' => ['title' => 'Zahtev za izmenu naziva', 'body' => '„:current” želi da se zove „:requested”.'],
    ],
];
