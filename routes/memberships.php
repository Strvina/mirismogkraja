<?php

use App\Http\Controllers\BoostController;
use App\Http\Controllers\MembershipController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/clanarina', [MembershipController::class, 'index'])->name('memberships.index');
    Route::post('/clanarina', [MembershipController::class, 'store'])->name('memberships.store');
    Route::get('/clanarina/{subscription}/uplatnica.pdf', [MembershipController::class, 'slip'])->name('memberships.slip');

    // Paid boosts (task 20.2), paid by the same kind of slip.
    Route::get('/isticanje', [BoostController::class, 'index'])->name('boosts.index');
    Route::post('/isticanje', [BoostController::class, 'store'])->name('boosts.store');
    Route::get('/isticanje/{boost}/uplatnica.pdf', [BoostController::class, 'slip'])->name('boosts.slip');
});
