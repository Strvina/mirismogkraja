<?php

use App\Http\Controllers\MessageEmailUnsubscribeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PushSubscriptionController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/obavestenja', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/obavestenja/{notification}', [NotificationController::class, 'open'])->name('notifications.open');
    Route::post('/obavestenja/procitano', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    // This device's push notifications, on and off.
    Route::post('/obavestenja/uredjaj', [PushSubscriptionController::class, 'store'])->middleware('throttle:10,1')->name('push.store');
    Route::delete('/obavestenja/uredjaj', [PushSubscriptionController::class, 'destroy'])->middleware('throttle:10,1')->name('push.destroy');
});

// From the link in a "new message" e-mail; signed, so no sign-in needed.
Route::middleware(['signed', 'throttle:10,1'])->group(function () {
    Route::get('/obavestenja/mejl/odjava/{user}', [MessageEmailUnsubscribeController::class, 'show'])->name('message-emails.unsubscribe');
    Route::post('/obavestenja/mejl/odjava/{user}', [MessageEmailUnsubscribeController::class, 'store'])->name('message-emails.unsubscribe.store');
});
