<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/households.php';
require __DIR__.'/marketplace.php';
require __DIR__.'/products.php';
require __DIR__.'/cart.php';
require __DIR__.'/orders.php';
require __DIR__.'/favorites.php';
require __DIR__.'/admin.php';
