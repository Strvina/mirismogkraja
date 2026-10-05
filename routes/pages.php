<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/uslovi-koriscenja', fn () => Inertia::render('legal/terms'))->name('legal.terms');
Route::get('/politika-privatnosti', fn () => Inertia::render('legal/privacy'))->name('legal.privacy');

// A route, not a file in public/: the sitemap line needs the site's full
// address, which only the running app knows.
Route::get('/robots.txt', fn () => response("User-agent: *\nDisallow: /admin\n\nSitemap: ".route('sitemap')."\n", 200, ['Content-Type' => 'text/plain']))
    ->name('robots');

// An index, the static pages, and the catalogue in files of 10,000 each.
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/sitemap-pages.xml', [SitemapController::class, 'pages'])->name('sitemap.pages');
Route::get('/sitemap-{section}-{page}.xml', [SitemapController::class, 'section'])
    ->whereIn('section', ['producers', 'products', 'posts'])
    ->where('page', '[1-9][0-9]*')
    ->name('sitemap.section');

Route::get('/jezik/{locale}', LocaleController::class)->name('locale');
