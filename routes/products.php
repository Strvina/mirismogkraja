<?php

use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImageController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('moji-proizvodjaci/{producer}/proizvodi')->name('producers.products.')->group(function () {
    Route::get('/', [ProductController::class, 'index'])->name('index');
    Route::get('/novi', [ProductController::class, 'create'])->name('create');
    Route::post('/', [ProductController::class, 'store'])->name('store');
    Route::get('/{product}/izmena', [ProductController::class, 'edit'])->name('edit');
    Route::put('/{product}', [ProductController::class, 'update'])->name('update');
    Route::delete('/{product}', [ProductController::class, 'destroy'])->name('destroy');

    Route::post('/{product}/slike', [ProductImageController::class, 'store'])->name('images.store');
    Route::delete('/{product}/slike/{image}', [ProductImageController::class, 'destroy'])->name('images.destroy');
    Route::patch('/{product}/slike/{image}/glavna', [ProductImageController::class, 'makePrimary'])->name('images.primary');
});
