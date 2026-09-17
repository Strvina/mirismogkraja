<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'users' => User::count(),
                'households' => Household::count(),
                'products' => Product::count(),
                'orders' => Order::count(),
                'revenue' => (float) Order::whereIn('status', ['confirmed', 'shipped', 'delivered'])->sum('total_price'),
            ],
        ]);
    }
}
