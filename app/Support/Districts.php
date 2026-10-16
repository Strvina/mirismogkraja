<?php

namespace App\Support;

use App\Models\Producer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Serbia's districts (okruzi) and the towns in each.
 *
 * A producer types their town, so the district is worked out from it: every
 * city and municipality is listed, with the few places people name instead
 * of their municipality ("Zlatibor", "Guča"). A village is not, and its
 * producer picks the district themselves.
 */
final class Districts
{
    /** @var array<string, array{0: string, 1: list<string>}> */
    private const DISTRICTS = [
        'beograd' => ['Grad Beograd', ['Beograd', 'Barajevo', 'Voždovac', 'Vračar', 'Grocka', 'Zvezdara', 'Zemun', 'Lazarevac', 'Mladenovac', 'Novi Beograd', 'Obrenovac', 'Rakovica', 'Savski venac', 'Sopot', 'Stari grad', 'Surčin', 'Čukarica', 'Borča', 'Batajnica']],
        'severnobacki' => ['Severnobački okrug', ['Subotica', 'Bačka Topola', 'Mali Iđoš', 'Palić']],
        'srednjobanatski' => ['Srednjobanatski okrug', ['Zrenjanin', 'Žitište', 'Nova Crnja', 'Novi Bečej', 'Sečanj']],
        'severnobanatski' => ['Severnobanatski okrug', ['Kikinda', 'Ada', 'Kanjiža', 'Novi Kneževac', 'Senta', 'Čoka']],
        'juznobanatski' => ['Južnobanatski okrug', ['Pančevo', 'Alibunar', 'Bela Crkva', 'Vršac', 'Kovačica', 'Kovin', 'Opovo', 'Plandište']],
        'zapadnobacki' => ['Zapadnobački okrug', ['Sombor', 'Apatin', 'Kula', 'Odžaci']],
        'juznobacki' => ['Južnobački okrug', ['Novi Sad', 'Petrovaradin', 'Futog', 'Bač', 'Bačka Palanka', 'Bački Petrovac', 'Beočin', 'Bečej', 'Vrbas', 'Žabalj', 'Srbobran', 'Sremski Karlovci', 'Temerin', 'Titel']],
        'sremski' => ['Sremski okrug', ['Sremska Mitrovica', 'Inđija', 'Irig', 'Pećinci', 'Ruma', 'Stara Pazova', 'Šid']],
        'macvanski' => ['Mačvanski okrug', ['Šabac', 'Bogatić', 'Vladimirci', 'Koceljeva', 'Krupanj', 'Loznica', 'Banja Koviljača', 'Ljubovija', 'Mali Zvornik']],
        'kolubarski' => ['Kolubarski okrug', ['Valjevo', 'Lajkovac', 'Ljig', 'Mionica', 'Osečina', 'Ub']],
        'podunavski' => ['Podunavski okrug', ['Smederevo', 'Smederevska Palanka', 'Velika Plana']],
        'branicevski' => ['Braničevski okrug', ['Požarevac', 'Kostolac', 'Veliko Gradište', 'Golubac', 'Žabari', 'Žagubica', 'Kučevo', 'Malo Crniće', 'Petrovac na Mlavi', 'Petrovac']],
        'sumadijski' => ['Šumadijski okrug', ['Kragujevac', 'Aranđelovac', 'Batočina', 'Knić', 'Lapovo', 'Rača', 'Topola']],
        'pomoravski' => ['Pomoravski okrug', ['Jagodina', 'Ćuprija', 'Despotovac', 'Paraćin', 'Rekovac', 'Svilajnac']],
        'borski' => ['Borski okrug', ['Bor', 'Kladovo', 'Majdanpek', 'Negotin']],
        'zajecarski' => ['Zaječarski okrug', ['Zaječar', 'Boljevac', 'Knjaževac', 'Sokobanja', 'Soko Banja']],
        'zlatiborski' => ['Zlatiborski okrug', ['Užice', 'Sevojno', 'Arilje', 'Bajina Bašta', 'Kosjerić', 'Nova Varoš', 'Požega', 'Priboj', 'Prijepolje', 'Sjenica', 'Čajetina', 'Zlatibor', 'Mokra Gora']],
        'moravicki' => ['Moravički okrug', ['Čačak', 'Gornji Milanovac', 'Ivanjica', 'Lučani', 'Guča']],
        'raski' => ['Raški okrug', ['Kraljevo', 'Vrnjačka Banja', 'Novi Pazar', 'Raška', 'Tutin']],
        'rasinski' => ['Rasinski okrug', ['Kruševac', 'Aleksandrovac', 'Brus', 'Varvarin', 'Trstenik', 'Ćićevac']],
        'nisavski' => ['Nišavski okrug', ['Niš', 'Niška Banja', 'Aleksinac', 'Gadžin Han', 'Doljevac', 'Merošina', 'Ražanj', 'Svrljig']],
        'toplicki' => ['Toplički okrug', ['Prokuplje', 'Blace', 'Žitorađa', 'Kuršumlija']],
        'pirotski' => ['Pirotski okrug', ['Pirot', 'Babušnica', 'Bela Palanka', 'Dimitrovgrad']],
        'jablanicki' => ['Jablanički okrug', ['Leskovac', 'Bojnik', 'Vlasotince', 'Lebane', 'Medveđa', 'Crna Trava', 'Grdelica', 'Vučje']],
        'pcinjski' => ['Pčinjski okrug', ['Vranje', 'Vranjska Banja', 'Bosilegrad', 'Bujanovac', 'Vladičin Han', 'Preševo', 'Surdulica', 'Trgovište']],
        'kosovski' => ['Kosovski okrug', ['Priština', 'Gračanica', 'Glogovac', 'Kosovo Polje', 'Lipljan', 'Obilić', 'Podujevo', 'Štimlje', 'Štrpce', 'Uroševac', 'Kačanik']],
        'pecki' => ['Pećki okrug', ['Peć', 'Dečani', 'Đakovica', 'Istok', 'Klina']],
        'prizrenski' => ['Prizrenski okrug', ['Prizren', 'Gora', 'Orahovac', 'Suva Reka']],
        'kosovskomitrovacki' => ['Kosovsko-mitrovački okrug', ['Kosovska Mitrovica', 'Zvečan', 'Zubin Potok', 'Leposavić', 'Vučitrn', 'Srbica']],
        'kosovskopomoravski' => ['Kosovsko-pomoravski okrug', ['Gnjilane', 'Kosovska Kamenica', 'Novo Brdo', 'Vitina', 'Ranilug', 'Klokot', 'Parteš']],
    ];

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys(self::DISTRICTS);
    }

    public static function name(?string $key): ?string
    {
        return self::DISTRICTS[$key][0] ?? null;
    }

    /**
     * Every district by its key, for a choice.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return collect(self::DISTRICTS)
            ->map(fn (array $district, string $key) => ['value' => $key, 'label' => $district[0]])
            ->sortBy(fn (array $option) => Str::ascii($option['label']))
            ->values()
            ->all();
    }

    /**
     * The districts the given producers are in, each with the towns they
     * typed: what a filter offers, narrowing the towns to the district chosen.
     *
     * @param  Builder<Producer>  $producers
     * @return list<array{value: string, label: string, cities: list<string>}>
     */
    public static function withTowns(Builder $producers): array
    {
        $towns = $producers->whereNotNull('district')->distinct()->orderBy('city')->get(['district', 'city'])
            ->groupBy('district')
            ->map(fn ($group) => $group->pluck('city')->filter()->values()->all());

        return collect(self::options())
            ->filter(fn (array $option) => $towns->has($option['value']))
            ->map(fn (array $option) => [...$option, 'cities' => $towns[$option['value']]])
            ->values()
            ->all();
    }

    /** The district a town is in; null for one not on the list. "Nis" finds Niš. */
    public static function forCity(?string $city): ?string
    {
        static $byTown = null;

        $byTown ??= collect(self::DISTRICTS)
            ->flatMap(fn (array $district, string $key) => collect($district[1])->mapWithKeys(fn (string $town) => [Str::slug($town) => $key]))
            ->all();

        return $byTown[Str::slug((string) $city)] ?? null;
    }
}
