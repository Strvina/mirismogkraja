<?php

use App\Http\Controllers\MembershipController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/clanarina', [MembershipController::class, 'index'])->name('memberships.index');
    Route::post('/clanarina', [MembershipController::class, 'store'])->name('memberships.store');
    Route::get('/clanarina/{subscription}/uplatnica.pdf', [MembershipController::class, 'slip'])->name('memberships.slip');
});
