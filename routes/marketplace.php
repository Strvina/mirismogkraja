<?php

use App\Http\Controllers\Marketplace\HouseholdController;
use App\Http\Controllers\Marketplace\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/domacinstva', [HouseholdController::class, 'index'])->name('marketplace.households.index');
Route::get('/domacinstvo/{household:slug}', [HouseholdController::class, 'show'])->name('marketplace.households.show');
Route::get('/proizvodi', [ProductController::class, 'index'])->name('marketplace.products.index');
Route::get('/proizvod/{product:slug}', [ProductController::class, 'show'])->name('marketplace.products.show');
