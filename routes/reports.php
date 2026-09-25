<?php

use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    // Throttled: a report is a considered act, not something to send in bulk.
    Route::post('/prijave', [ReportController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('reports.store');
});
