<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategoriesSeeder extends Seeder
{
    /**
     * The product categories: name, the phrase people search for it by, and
     * its subcategories as [name, search phrase].
     *
     * The subcategories are the products people look up by name - nobody
     * searches for "zimnica" when they want ajvar - so each has a page of
     * its own to be found by. Named by kind, never by a place: a protected
     * name ("Leskovački ajvar") is not ours to file products under.
     *
     * @var list<array{0: string, 1: string|null, 2: list<array{0: string, 1: string}>}>
     */
    private const CATEGORIES = [
        ['Voće', 'Domaće voće', []],
        ['Povrće', 'Domaće povrće', [
            ['Paprika za ajvar', 'Paprika za ajvar'],
            ['Paradajz', 'Domaći paradajz'],
            ['Beli luk', 'Domaći beli luk'],
            ['Pasulj', 'Domaći pasulj'],
            ['Kupus', 'Domaći kupus'],
        ]],
        ['Mlečni proizvodi', 'Domaći mlečni proizvodi', [
            ['Kozji sir', 'Domaći kozji sir'],
            ['Ovčiji sir', 'Domaći ovčiji sir'],
            ['Kravlji sir', 'Domaći kravlji sir'],
            ['Kajmak', 'Domaći kajmak'],
            ['Kačkavalj', 'Domaći kačkavalj'],
        ]],
        ['Med i pčelinji proizvodi', 'Domaći med', [
            ['Bagremov med', 'Bagremov med'],
            ['Livadski med', 'Livadski med'],
            ['Šumski med', 'Šumski med'],
        ]],
        ['Žitarice', 'Domaće žitarice i brašno', []],
        ['Jaja', 'Domaća jaja', []],
        ['Meso i suhomesnato', 'Domaće meso i suhomesnato', [
            ['Slanina', 'Domaća slanina'],
            ['Pršuta', 'Domaća pršuta'],
            ['Kobasice', 'Domaće kobasice'],
            ['Čvarci', 'Domaći čvarci'],
            ['Piletina', 'Domaća piletina'],
        ]],
        ['Rakija i vino', 'Domaća rakija i vino', [
            ['Šljivovica', 'Domaća šljivovica'],
            ['Dunjevača', 'Domaća dunjevača'],
            ['Kajsijevača', 'Domaća kajsijevača'],
            ['Vino', 'Domaće vino'],
        ]],
        ['Zimnica', 'Domaća zimnica', [
            ['Ajvar', 'Domaći ajvar'],
            ['Pinđur', 'Domaći pinđur'],
            ['Ljutenica', 'Domaća ljutenica'],
            ['Turšija', 'Domaća turšija'],
            ['Sušena paprika', 'Sušena paprika'],
        ]],
        ['Sokovi, slatko i džem', 'Domaći sokovi, slatko i džem', [
            ['Sokovi', 'Domaći sokovi'],
            ['Slatko', 'Domaće slatko'],
            ['Džem i pekmez', 'Domaći džem i pekmez'],
        ]],
        ['Poklon paketi', 'Poklon paketi domaćih proizvoda', []],
        ['Ostalo', null, []],
    ];

    /**
     * Safe to run on a site already in use: a category that exists is found
     * by its address and kept as the admin left it - only a search phrase it
     * does not have yet is filled in.
     */
    public function run(): void
    {
        foreach (self::CATEGORIES as [$name, $searchName, $children]) {
            $parent = $this->category($name, $searchName);

            foreach ($children as [$childName, $childSearchName]) {
                $this->category($childName, $childSearchName, $parent);
            }
        }
    }

    private function category(string $name, ?string $searchName, ?Category $parent = null): Category
    {
        $category = Category::firstOrCreate(
            ['slug' => Str::slug($name)],
            ['name' => $name, 'parent_id' => $parent?->id],
        );

        if ($category->search_name === null && $searchName !== null) {
            $category->update(['search_name' => $searchName]);
        }

        return $category;
    }
}
