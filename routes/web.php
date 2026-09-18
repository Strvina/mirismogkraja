<?php

use App\Http\Controllers\HomeController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', HomeController::class)->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/producers.php';
require __DIR__.'/marketplace.php';
require __DIR__.'/products.php';
require __DIR__.'/cart.php';
require __DIR__.'/orders.php';
require __DIR__.'/favorites.php';
require __DIR__.'/admin.php';
