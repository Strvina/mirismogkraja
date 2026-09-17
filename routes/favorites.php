<?php

use App\Http\Controllers\FavoriteController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/omiljeni', [FavoriteController::class, 'index'])->name('favorites.index');
    Route::post('/omiljeni/toggle', [FavoriteController::class, 'toggle'])->name('favorites.toggle');
});
