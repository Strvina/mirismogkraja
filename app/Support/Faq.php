<?php

namespace App\Support;

/**
 * The questions on /cesta-pitanja.
 *
 * Kept on the server, not in the React page, because the same list is
 * written into the first HTML response as FAQPage data (see PageMeta::faq) -
 * and that has to exist before any JavaScript runs.
 */
class Faq
{
    /**
     * @return list<array{title: string, items: list<array{question: string, answer: string}>}>
     */
    public static function groups(): array
    {
        return [
            [
                'title' => __('Za kupce'),
                'items' => [
                    [
                        'question' => __('Da li mogu da kupim preko sajta?'),
                        'answer' => __('Ne. Vrelina juga nije prodavnica: nema korpe ni plaćanja na sajtu. Pošaljete upit proizvođaču, a o količini, ceni, plaćanju i dostavi dogovarate se direktno sa njim.'),
                    ],
                    [
                        'question' => __('Da li je sajt besplatan za kupce?'),
                        'answer' => __('Da. Pretraga, poruke, praćenje proizvođača i utisci su besplatni.'),
                    ],
                    [
                        'question' => __('Kako da stupim u kontakt sa proizvođačem?'),
                        'answer' => __('Na stranici proizvoda pošaljite upit. Za to vam treba nalog, da bi odgovor stigao u vaše poruke i na e-mail. Ako je proizvođač ostavio telefon, možete ga i pozvati.'),
                    ],
                    [
                        'question' => __('Kako plaćam i kako stiže roba?'),
                        'answer' => __('Onako kako se dogovorite sa proizvođačem. Na njegovoj stranici piše da li šalje poštom, dostavlja lično ili se roba preuzima kod njega ili na pijaci.'),
                    ],
                    [
                        'question' => __('Ko može da ostavi utisak?'),
                        'answer' => __('Samo kupac kome je proizvođač odgovorio na upit, i to jedan utisak po proizvođaču. Utisak objavljujemo posle pregleda.'),
                    ],
                    [
                        'question' => __('Šta ako nešto nije u redu?'),
                        'answer' => __('Na stranici proizvođača i proizvoda postoji dugme „Prijavi problem“. Svaku prijavu čitamo i po potrebi sklanjamo sadržaj ili nalog.'),
                    ],
                ],
            ],
            [
                'title' => __('Za proizvođače'),
                'items' => [
                    [
                        'question' => __('Ko može da otvori stranicu proizvođača?'),
                        'answer' => __('Mali proizvođači hrane i poljoprivredna gazdinstva sa juga Srbije. Svaku novu stranicu pregledamo pre objave.'),
                    ],
                    [
                        'question' => __('Koliko košta?'),
                        'answer' => __('Ne uzimamo procenat od prodaje. Platforma se izdržava od godišnje članarine; pakete i cene vidite na stranici „Za proizvođače“.'),
                    ],
                    [
                        'question' => __('Kako se plaća članarina?'),
                        'answer' => __('Uplatnicom sa QR kodom, u banci, pošti ili bankarskoj aplikaciji. Članarinu aktiviramo čim uplata stigne.'),
                    ],
                    [
                        'question' => __('Šta se dešava kada članarina istekne?'),
                        'answer' => __('Stranica ostaje na sajtu sa svime što ste uneli. Gubite samo dodatne pogodnosti paketa dok ne obnovite.'),
                    ],
                    [
                        'question' => __('Da li moram da izdajem račun kupcu?'),
                        'answer' => __('Prodaja je između vas i kupca, pa obaveze prema propisima ostaju na vama. Vrelina juga nije strana u kupoprodaji.'),
                    ],
                ],
            ],
        ];
    }
}
