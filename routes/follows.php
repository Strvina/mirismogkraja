<?php

use App\Http\Controllers\ProducerFollowController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::post('/proizvodjac/{producer}/prati', [ProducerFollowController::class, 'toggle'])->middleware('throttle:30,1')->name('producers.follow');
});
