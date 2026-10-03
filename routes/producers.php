<?php

use App\Http\Controllers\ProducerController;
use App\Http\Controllers\ProducerImageController;
use App\Http\Controllers\ProducerStatisticsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('moji-proizvodjaci')->name('producers.')->group(function () {
    Route::get('/', [ProducerController::class, 'index'])->name('index');
    Route::get('/novo', [ProducerController::class, 'create'])->name('create');
    // Uploads photos and notifies the admins: a few a minute is plenty.
    Route::post('/', [ProducerController::class, 'store'])->middleware('throttle:5,1')->name('store');
    Route::get('/{producer}/izmena', [ProducerController::class, 'edit'])->name('edit');
    Route::get('/{producer}/statistika', [ProducerStatisticsController::class, 'show'])->name('statistics');
    Route::put('/{producer}', [ProducerController::class, 'update'])->name('update');
    Route::delete('/{producer}', [ProducerController::class, 'destroy'])->name('destroy');

    Route::post('/{producer}/galerija', [ProducerImageController::class, 'store'])->middleware('throttle:30,1')->name('images.store');
    Route::delete('/{producer}/galerija/{image}', [ProducerImageController::class, 'destroy'])->name('images.destroy');
});

// Contact clicks reported by a visitor's browser (task 20.6). Public, since
// most visitors are not signed in; limited, since it only counts.
Route::post('/statistika/{producer}/{event}', [ProducerStatisticsController::class, 'click'])
    ->middleware('throttle:60,1')
    ->name('statistics.click');
