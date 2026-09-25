<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AdminMembershipController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ProducerChangeRequestController;
use App\Http\Controllers\Admin\ProducerController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ReportController;
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
    Route::patch('/proizvodjaci/{producer}/verifikacija', [ProducerController::class, 'updateVerification'])->name('producers.verify');
    Route::put('/proizvodjaci/{producer}', [ProducerController::class, 'update'])->name('producers.update');

    Route::get('/proizvodi', [ProductController::class, 'index'])->name('products.index');
    Route::put('/proizvodi/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::delete('/proizvodi/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
    Route::post('/proizvodi/masovno', [ProductController::class, 'bulk'])->name('products.bulk');

    Route::get('/zahtevi', [ProducerChangeRequestController::class, 'index'])->name('change-requests.index');
    Route::patch('/zahtevi/{changeRequest}/odobri', [ProducerChangeRequestController::class, 'approve'])->name('change-requests.approve');
    Route::patch('/zahtevi/{changeRequest}/odbij', [ProducerChangeRequestController::class, 'reject'])->name('change-requests.reject');

    Route::get('/clanarine', [AdminMembershipController::class, 'index'])->name('memberships.index');
    Route::patch('/clanarine/{subscription}/potvrdi', [AdminMembershipController::class, 'confirm'])->name('memberships.confirm');
    Route::patch('/clanarine/{subscription}/otkazi', [AdminMembershipController::class, 'cancel'])->name('memberships.cancel');
    Route::put('/paketi/{plan}', [AdminMembershipController::class, 'updatePlan'])->name('plans.update');
    Route::put('/uplatnica', [AdminMembershipController::class, 'updatePayment'])->name('payment.update');

    Route::get('/prijave', [ReportController::class, 'index'])->name('reports.index');
    Route::patch('/prijave/{report}', [ReportController::class, 'update'])->name('reports.update');

    Route::get('/logovi', [ActivityLogController::class, 'index'])->name('logs.index');

    Route::get('/kategorije', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('/kategorije', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('/kategorije/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/kategorije/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

    Route::get('/utisci', [ReviewController::class, 'index'])->name('reviews.index');
    Route::patch('/utisci/{review}/odobri', [ReviewController::class, 'approve'])->name('reviews.approve');
    Route::patch('/utisci/{review}/odbij', [ReviewController::class, 'reject'])->name('reviews.reject');
    Route::delete('/utisci/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');
});
