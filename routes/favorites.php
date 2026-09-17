<?php

use App\Http\Controllers\FavoriteController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->post('/omiljeni/toggle', [FavoriteController::class, 'toggle'])->name('favorites.toggle');
