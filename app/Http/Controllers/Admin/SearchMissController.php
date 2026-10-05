<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SearchMisses;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Šta kupci traže": what was searched for and is not on the site. The
 * list to read before deciding which producers to invite next.
 */
class SearchMissController extends Controller
{
    private const PERIODS = [7, 30, 90];

    public function index(Request $request, SearchMisses $misses): Response
    {
        $days = in_array($request->integer('dana'), self::PERIODS, true) ? $request->integer('dana') : 30;

        return Inertia::render('admin/search-misses/index', [
            'terms' => $misses->top($days, 100),
            'days' => $days,
            'periods' => self::PERIODS,
            'keepDays' => SearchMisses::KEEP_DAYS,
        ]);
    }
}
