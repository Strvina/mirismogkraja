<?php

use App\Http\Controllers\ProducerMessageController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::post('/proizvod/{product:slug}/upit', [ProducerMessageController::class, 'storeInquiry'])
        ->middleware('throttle:10,1')
        ->name('inquiries.store');
    // Buyer's side: one thread per producer they've written to.
    Route::get('/poruke', [ProducerMessageController::class, 'index'])->name('messages.index');
    Route::get('/poruke/{producer:slug}', [ProducerMessageController::class, 'show'])->name('messages.show');
    Route::post('/poruke/{producer:slug}', [ProducerMessageController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('messages.store');

    // Seller's side of a thread. Its inbox is /poruke, which lists both
    // sides together; the old address still leads there.
    Route::redirect('/poruke-proizvodjaca', '/poruke')->name('messages.inbox');
    Route::get('/poruke-proizvodjaca/{producer}/{buyer}', [ProducerMessageController::class, 'show'])->name('messages.thread');
    Route::post('/poruke-proizvodjaca/{producer}/{buyer}', [ProducerMessageController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('messages.thread.store');
});
