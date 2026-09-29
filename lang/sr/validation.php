<?php

/*
 * Validation messages, in Serbian (Latin).
 *
 * Every form on the site shows an error directly under its own field, so the
 * messages do not name the field - "Ovo polje je obavezno." reads right under
 * a person's name and under a product's alike, where a translated attribute
 * name would have to guess which one it is.
 */
return [
    'accepted' => 'Ovo polje mora biti prihvaćeno.',
    'active_url' => 'Ovo nije ispravan URL.',
    'after' => 'Datum mora biti posle :date.',
    'after_or_equal' => 'Datum mora biti :date ili kasnije.',
    'alpha' => 'Dozvoljena su samo slova.',
    'alpha_dash' => 'Dozvoljena su samo slova, brojevi, crtice i donje crte.',
    'alpha_num' => 'Dozvoljena su samo slova i brojevi.',
    'array' => 'Ovo polje mora biti lista.',
    'before' => 'Datum mora biti pre :date.',
    'before_or_equal' => 'Datum mora biti :date ili ranije.',
    'between' => [
        'array' => 'Mora imati između :min i :max stavki.',
        'file' => 'Fajl mora imati između :min i :max KB.',
        'numeric' => 'Vrednost mora biti između :min i :max.',
        'string' => 'Mora imati između :min i :max karaktera.',
    ],
    'boolean' => 'Vrednost mora biti da ili ne.',
    'confirmed' => 'Potvrda se ne poklapa.',
    'current_password' => 'Lozinka nije ispravna.',
    'date' => 'Ovo nije ispravan datum.',
    'date_format' => 'Datum mora biti u obliku :format.',
    'different' => 'Vrednost mora biti različita od :other.',
    'digits' => 'Mora imati tačno :digits cifara.',
    'digits_between' => 'Mora imati između :min i :max cifara.',
    'dimensions' => 'Slika nema odgovarajuće dimenzije.',
    'distinct' => 'Ova vrednost se ponavlja.',
    'email' => 'Unesite ispravnu e-mail adresu.',
    'ends_with' => 'Mora se završavati sa: :values.',
    'enum' => 'Izabrana vrednost nije ispravna.',
    'exists' => 'Izabrana vrednost ne postoji.',
    'file' => 'Ovo mora biti fajl.',
    'filled' => 'Ovo polje ne sme biti prazno.',
    'gt' => [
        'array' => 'Mora imati više od :value stavki.',
        'file' => 'Fajl mora biti veći od :value KB.',
        'numeric' => 'Vrednost mora biti veća od :value.',
        'string' => 'Mora imati više od :value karaktera.',
    ],
    'gte' => [
        'array' => 'Mora imati najmanje :value stavki.',
        'file' => 'Fajl mora imati najmanje :value KB.',
        'numeric' => 'Vrednost mora biti najmanje :value.',
        'string' => 'Mora imati najmanje :value karaktera.',
    ],
    'image' => 'Fajl mora biti slika (JPG, PNG, WebP ili GIF).',
    'in' => 'Izabrana vrednost nije ispravna.',
    'in_array' => 'Vrednost ne postoji u :other.',
    'integer' => 'Vrednost mora biti ceo broj.',
    'ip' => 'Ovo nije ispravna IP adresa.',
    'json' => 'Ovo nije ispravan JSON.',
    'lowercase' => 'Dozvoljena su samo mala slova.',
    'lt' => [
        'array' => 'Mora imati manje od :value stavki.',
        'file' => 'Fajl mora biti manji od :value KB.',
        'numeric' => 'Vrednost mora biti manja od :value.',
        'string' => 'Mora imati manje od :value karaktera.',
    ],
    'lte' => [
        'array' => 'Može imati najviše :value stavki.',
        'file' => 'Fajl može imati najviše :value KB.',
        'numeric' => 'Vrednost može biti najviše :value.',
        'string' => 'Može imati najviše :value karaktera.',
    ],
    'max' => [
        'array' => 'Može imati najviše :max stavki.',
        'file' => 'Fajl može imati najviše :max KB.',
        'numeric' => 'Vrednost može biti najviše :max.',
        'string' => 'Može imati najviše :max karaktera.',
    ],
    'mimes' => 'Dozvoljeni tipovi fajla: :values.',
    'mimetypes' => 'Dozvoljeni tipovi fajla: :values.',
    'min' => [
        'array' => 'Mora imati najmanje :min stavki.',
        'file' => 'Fajl mora imati najmanje :min KB.',
        'numeric' => 'Vrednost mora biti najmanje :min.',
        'string' => 'Mora imati najmanje :min karaktera.',
    ],
    'not_in' => 'Izabrana vrednost nije ispravna.',
    'not_regex' => 'Format nije ispravan.',
    'numeric' => 'Vrednost mora biti broj.',
    'password' => [
        'letters' => 'Lozinka mora sadržati bar jedno slovo.',
        'mixed' => 'Lozinka mora sadržati bar jedno veliko i jedno malo slovo.',
        'numbers' => 'Lozinka mora sadržati bar jedan broj.',
        'symbols' => 'Lozinka mora sadržati bar jedan simbol.',
        'uncompromised' => 'Ova lozinka se pojavila u procurelim podacima. Izaberite drugu.',
    ],
    'present' => 'Ovo polje mora postojati.',
    'prohibited' => 'Ovo polje nije dozvoljeno.',
    'regex' => 'Format nije ispravan.',
    'required' => 'Ovo polje je obavezno.',
    'required_if' => 'Ovo polje je obavezno.',
    'required_unless' => 'Ovo polje je obavezno.',
    'required_with' => 'Ovo polje je obavezno.',
    'required_with_all' => 'Ovo polje je obavezno.',
    'required_without' => 'Ovo polje je obavezno.',
    'required_without_all' => 'Ovo polje je obavezno.',
    'same' => 'Vrednost se mora poklapati sa :other.',
    'size' => [
        'array' => 'Mora imati tačno :size stavki.',
        'file' => 'Fajl mora imati tačno :size KB.',
        'numeric' => 'Vrednost mora biti :size.',
        'string' => 'Mora imati tačno :size karaktera.',
    ],
    'starts_with' => 'Mora počinjati sa: :values.',
    'string' => 'Ovo polje mora biti tekst.',
    'timezone' => 'Ovo nije ispravna vremenska zona.',
    'unique' => 'Ova vrednost je već zauzeta.',
    'uploaded' => 'Otpremanje nije uspelo. Pokušajte ponovo.',
    'uppercase' => 'Dozvoljena su samo velika slova.',
    'url' => 'Ovo nije ispravan URL.',
    'uuid' => 'Ovo nije ispravan UUID.',

    'custom' => [
        // Said with the field, since "already taken" alone could be anything.
        'email' => [
            'unique' => 'Nalog sa ovom e-mail adresom već postoji.',
        ],
    ],

    'attributes' => [],
];
