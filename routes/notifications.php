<?php

use App\Http\Controllers\DigestUnsubscribeController;
use App\Http\Controllers\MessageEmailUnsubscribeController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/obavestenja', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/obavestenja/{notification}', [NotificationController::class, 'open'])->name('notifications.open');
    Route::post('/obavestenja/procitano', [NotificationController::class, 'readAll'])->middleware('throttle:30,1')->name('notifications.read-all');
});

// From the link in an e-mail the site sends on its own; signed, so no sign-in needed.
Route::middleware(['signed', 'throttle:10,1'])->group(function () {
    Route::get('/obavestenja/mejl/odjava/{user}', [MessageEmailUnsubscribeController::class, 'show'])->name('message-emails.unsubscribe');
    Route::post('/obavestenja/mejl/odjava/{user}', [MessageEmailUnsubscribeController::class, 'store'])->name('message-emails.unsubscribe.store');
    // The same, from the weekly digest.
    Route::get('/obavestenja/pregled/odjava/{user}', [DigestUnsubscribeController::class, 'show'])->name('digest.unsubscribe');
    Route::post('/obavestenja/pregled/odjava/{user}', [DigestUnsubscribeController::class, 'store'])->name('digest.unsubscribe.store');
});
