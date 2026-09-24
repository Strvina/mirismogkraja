<?php

use App\Http\Controllers\ProducerFollowController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::post('/proizvodjac/{producer}/prati', [ProducerFollowController::class, 'toggle'])->name('producers.follow');
});
