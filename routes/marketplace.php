<?php

use App\Http\Controllers\Marketplace\HouseholdController;
use Illuminate\Support\Facades\Route;

Route::get('/domacinstva', [HouseholdController::class, 'index'])->name('marketplace.households.index');
Route::get('/domacinstvo/{household:slug}', [HouseholdController::class, 'show'])->name('marketplace.households.show');
