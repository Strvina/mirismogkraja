<?php

use App\Http\Controllers\Marketplace\HouseholdController;
use Illuminate\Support\Facades\Route;

Route::get('/domacinstvo/{household:slug}', [HouseholdController::class, 'show'])->name('marketplace.households.show');
