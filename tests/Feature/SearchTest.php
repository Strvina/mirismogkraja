<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Support\Search;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    /**
     * InnoDB adds rows to a FULLTEXT index only when their transaction
     * commits, so on MySQL these tests write for real - outside the usual
     * per-test transaction - and clear up after themselves.
     *
     * @return list<string>
     */
    protected function connectionsToTransact(): array
    {
        return $this->onMySql() ? [] : [config('database.default')];
    }

    protected function tearDown(): void
    {
        if ($this->onMySql()) {
            foreach (['products', 'households', 'categories', 'users'] as $table) {
                DB::table($table)->delete();
            }
        }

        parent::tearDown();
    }

    private function onMySql(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true);
    }

    public function test_products_are_found_by_name_or_description_with_every_word_required(): void
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->for($producer)->create(['name' => 'Ljuti ajvar', 'description' => 'Pečene paprike', 'status' => 'active']);
        Product::factory()->for($producer)->create(['name' => 'Blagi ajvar', 'description' => null, 'status' => 'active']);
        Product::factory()->for($producer)->create(['name' => 'Bagremov med', 'description' => 'Sa paprikom? Ne.', 'status' => 'active']);
        Product::factory()->for($producer)->create(['name' => 'Ajvar u pripremi', 'status' => 'draft']);

        $this->get('/proizvodi?q=ajvar')->assertInertia(fn ($page) => $page->has('products.data', 2)->where('filters.q', 'ajvar'));
        $this->get('/proizvodi?q=ljuti+ajvar')->assertInertia(fn ($page) => $page->has('products.data', 1)->where('products.data.0.name', 'Ljuti ajvar'));
        $this->get('/proizvodi?q=paprike')->assertInertia(fn ($page) => $page->has('products.data', 1));
        $this->get('/proizvodi?q=sir')->assertInertia(fn ($page) => $page->has('products.data', 0));
    }

    public function test_a_search_shows_the_producers_it_matches_above_the_products(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Jovanović']);
        Producer::factory()->create(['name' => 'Jovanović na čekanju', 'status' => 'pending']);

        $this->get('/proizvodi?q=jovanović')->assertInertia(fn ($page) => $page
            ->has('matchingProducers', 1)
            ->where('matchingProducers.0.slug', $producer->slug));

        $this->get('/proizvodjaci?q=pčelarstvo')->assertInertia(fn ($page) => $page->has('producers.data', 1)->where('filters.q', 'pčelarstvo'));
    }

    public function test_the_query_is_reduced_to_words_so_nothing_reaches_the_database_as_syntax(): void
    {
        $this->assertSame('med ajvar', Search::clean('  med%_ "ajvar*" +-<>()~@ '));
        $this->assertSame('', Search::clean('%%%'));
        $this->assertSame('a b c d e f', Search::clean('a b c d e f g h'));

        $this->get('/proizvodi?q=%25%25')->assertOk();
    }
}
