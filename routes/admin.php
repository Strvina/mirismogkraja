<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ProducerController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/korisnici', [UserController::class, 'index'])->name('users.index');
    Route::patch('/korisnici/{user}/role', [UserController::class, 'updateRoles'])->name('users.roles');
    Route::patch('/korisnici/{user}/blokiraj', [UserController::class, 'toggleBlock'])->name('users.block');

    Route::get('/proizvodjaci', [ProducerController::class, 'index'])->name('producers.index');
    Route::patch('/proizvodjaci/{producer}/status', [ProducerController::class, 'updateStatus'])->name('producers.status');

    Route::get('/proizvodi', [ProductController::class, 'index'])->name('products.index');
    Route::delete('/proizvodi/{product}', [ProductController::class, 'destroy'])->name('products.destroy');

    Route::get('/kategorije', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('/kategorije', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('/kategorije/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/kategorije/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

    Route::get('/porudzbine', [OrderController::class, 'index'])->name('orders.index');

    Route::get('/ocene', [ReviewController::class, 'index'])->name('reviews.index');
    Route::delete('/ocene/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');
});
