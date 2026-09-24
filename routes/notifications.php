<?php

use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/obavestenja', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/obavestenja/{notification}', [NotificationController::class, 'open'])->name('notifications.open');
    Route::post('/obavestenja/procitano', [NotificationController::class, 'readAll'])->name('notifications.read-all');
});
