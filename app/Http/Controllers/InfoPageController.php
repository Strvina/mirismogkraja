<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\BoostService;
use App\Services\FoundingProducerService;
use App\Support\Faq;
use App\Support\PageMeta;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The pages that explain the site itself. A visitor who expects a shop has
 * to be told there is no basket before they go looking for one, and a
 * producer has to be able to read what it costs before opening an account.
 */
class InfoPageController extends Controller
{
    public function how(): Response
    {
        return Inertia::render('info/how-it-works', [
            'meta' => PageMeta::make(
                __('Kako radi | Vrelina juga'),
                __('Pronađete proizvod, pošaljete upit proizvođaču i dogovorite se direktno. Bez korpe, bez posrednika.'),
            ),
        ]);
    }

    /**
     * Plans and prices for someone who is not signed in yet. The same rows
     * the membership page sells from, so the two cannot disagree.
     */
    public function producers(BoostService $boosts, FoundingProducerService $founding): Response
    {
        return Inertia::render('info/for-producers', [
            'meta' => PageMeta::make(
                __('Za proizvođače | Vrelina juga'),
                __('Otvorite svoju stranicu, postavite proizvode i primajte upite kupaca. Bez procenta od prodaje.'),
            ),
            'plans' => SubscriptionPlan::where('is_active', true)
                ->orderBy('level')
                ->get(['id', 'name', 'description', 'price_rsd', 'features', 'level']),
            'featureLabels' => array_map(__(...), SubscriptionPlan::FEATURES),
            'boost' => $boosts->terms(),
            'founding' => ['remaining' => $founding->remaining(), 'limit' => $founding->limit()],
        ]);
    }

    public function terms(): Response
    {
        return Inertia::render('legal/terms', [
            'meta' => PageMeta::make(
                __('Uslovi korišćenja | Vrelina juga'),
                __('Pravila korišćenja sajta Vrelina juga, za kupce i za proizvođače.'),
            ),
        ]);
    }

    public function privacy(): Response
    {
        return Inertia::render('legal/privacy', [
            'meta' => PageMeta::make(
                __('Politika privatnosti | Vrelina juga'),
                __('Koje podatke Vrelina juga prikuplja, zašto, i kako možete da ih vidite ili obrišete.'),
            ),
        ]);
    }

    public function about(): Response
    {
        return Inertia::render('info/about', [
            'meta' => PageMeta::make(
                __('O nama | Vrelina juga'),
                __('Vrelina juga povezuje male proizvođače hrane sa juga Srbije sa ljudima koji traže domaće.'),
            ),
        ]);
    }

    public function faq(): Response
    {
        $groups = Faq::groups();

        return Inertia::render('info/faq', [
            'meta' => [
                ...PageMeta::make(
                    __('Česta pitanja | Vrelina juga'),
                    __('Odgovori na najčešća pitanja kupaca i proizvođača o tome kako Vrelina juga radi.'),
                ),
                'structured' => PageMeta::faq($groups),
            ],
            'groups' => $groups,
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('info/contact', [
            'meta' => PageMeta::make(
                __('Kontakt | Vrelina juga'),
                __('Pišite nam: pitanja, predlozi i pomoć oko naloga ili stranice proizvođača.'),
            ),
        ]);
    }
}
