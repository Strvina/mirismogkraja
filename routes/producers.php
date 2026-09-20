<?php

use App\Http\Controllers\ProducerController;
use App\Http\Controllers\ProducerImageController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('moji-proizvodjaci')->name('producers.')->group(function () {
    Route::get('/', [ProducerController::class, 'index'])->name('index');
    Route::get('/novo', [ProducerController::class, 'create'])->name('create');
    Route::post('/', [ProducerController::class, 'store'])->name('store');
    Route::get('/{producer}/izmena', [ProducerController::class, 'edit'])->name('edit');
    Route::put('/{producer}', [ProducerController::class, 'update'])->name('update');
    Route::delete('/{producer}', [ProducerController::class, 'destroy'])->name('destroy');

    Route::post('/{producer}/galerija', [ProducerImageController::class, 'store'])->name('images.store');
    Route::delete('/{producer}/galerija/{image}', [ProducerImageController::class, 'destroy'])->name('images.destroy');
});
