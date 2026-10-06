<?php

use App\Http\Controllers\Marketplace\WantedAdController as PublicWantedAdController;
use App\Http\Controllers\WantedAdController;
use Illuminate\Support\Facades\Route;

// "Tražim": buyers write what they are looking for, producers answer.
Route::get('/trazim', [PublicWantedAdController::class, 'index'])->middleware('deep-pages')->name('wanted.index');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/trazim/novi', [WantedAdController::class, 'create'])->name('wanted.create');
    // Each one notifies producers and admins: a few a minute is plenty.
    Route::post('/trazim', [WantedAdController::class, 'store'])->middleware('throttle:5,1')->name('wanted.store');
    Route::patch('/trazim/{ad}/zatvori', [WantedAdController::class, 'close'])->name('wanted.close');
    Route::delete('/trazim/{ad}', [WantedAdController::class, 'destroy'])->name('wanted.destroy');
    // An answer opens a conversation, so it is limited like a first message.
    Route::post('/trazim/{ad}/odgovor', [WantedAdController::class, 'respond'])->middleware('throttle:10,1')->name('wanted.respond');
});

Route::get('/trazim/{ad}', [PublicWantedAdController::class, 'show'])->whereNumber('ad')->name('wanted.show');
