<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategoriesSeeder extends Seeder
{
    /**
     * Base product categories, per docs/plan.md task 3.2.
     *
     * @var list<string>
     */
    private const CATEGORIES = [
        'Voće',
        'Povrće',
        'Mlečni proizvodi',
        'Med i pčelinji proizvodi',
        'Žitarice',
        'Jaja',
        'Meso i suhomesnato',
        'Rakija i vino',
        'Ostalo',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::CATEGORIES as $name) {
            Category::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name],
            );
        }
    }
}
