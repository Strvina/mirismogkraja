<?php

use App\Http\Controllers\Marketplace\HouseholdController;
use App\Http\Controllers\Marketplace\ProductController;
use App\Http\Controllers\ReviewController;
use Illuminate\Support\Facades\Route;

Route::get('/domacinstva', [HouseholdController::class, 'index'])->name('marketplace.households.index');
Route::get('/domacinstvo/{household:slug}', [HouseholdController::class, 'show'])->name('marketplace.households.show');
Route::get('/proizvodi', [ProductController::class, 'index'])->name('marketplace.products.index');
Route::get('/proizvod/{product:slug}', [ProductController::class, 'show'])->name('marketplace.products.show');

Route::middleware('auth')->group(function () {
    Route::post('/domacinstvo/{household}/ocene', [ReviewController::class, 'store'])->name('reviews.store');
    Route::delete('/ocene/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');
});
