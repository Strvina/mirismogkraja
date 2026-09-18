<?php

use App\Http\Controllers\Marketplace\ProducerController;
use App\Http\Controllers\Marketplace\ProductController;
use App\Http\Controllers\ReviewController;
use Illuminate\Support\Facades\Route;

Route::get('/proizvodjaci', [ProducerController::class, 'index'])->name('marketplace.producers.index');
Route::get('/proizvodjac/{producer:slug}', [ProducerController::class, 'show'])->name('marketplace.producers.show');
Route::get('/proizvodi', [ProductController::class, 'index'])->name('marketplace.products.index');
Route::get('/proizvod/{product:slug}', [ProductController::class, 'show'])->name('marketplace.products.show');

Route::middleware('auth')->group(function () {
    Route::post('/proizvodjac/{producer}/ocene', [ReviewController::class, 'store'])->name('reviews.store');
    Route::delete('/ocene/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');
});
