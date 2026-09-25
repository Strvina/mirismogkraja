<?php

use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/uslovi-koriscenja', fn () => Inertia::render('legal/terms'))->name('legal.terms');
Route::get('/politika-privatnosti', fn () => Inertia::render('legal/privacy'))->name('legal.privacy');

Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');
