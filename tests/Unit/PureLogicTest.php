<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\ResponseTime;
use App\Support\PaymentReference;
use App\Support\Search;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * The rules that need no database: tested directly, fast, and with the
 * awkward cases spelled out.
 */
class PureLogicTest extends TestCase
{
    public function test_a_search_query_is_reduced_to_a_few_plain_words(): void
    {
        $this->assertSame('med ajvar', Search::clean('  med%_ "ajvar*" +-<>()~@ '));
        $this->assertSame('Pčelinji vosak', Search::clean('Pčelinji, vosak!'));
        $this->assertSame('', Search::clean('%%%'));
        $this->assertSame('', Search::clean(null));
        $this->assertSame('a b c d e f', Search::clean('a b c d e f g h'));
        $this->assertSame(100, mb_strlen(Search::clean(str_repeat('x', 300))));
    }

    /** @return iterable<string, array{?int, ?int, int, bool}> */
    public static function seasons(): iterable
    {
        yield 'no season: all year' => [null, null, 1, true];
        yield 'summer, in July' => [6, 8, 7, true];
        yield 'summer, first month' => [6, 8, 6, true];
        yield 'summer, last month' => [6, 8, 8, true];
        yield 'summer, in May' => [6, 8, 5, false];
        yield 'winter wraps the year, in January' => [11, 2, 1, true];
        yield 'winter wraps the year, in December' => [11, 2, 12, true];
        yield 'winter wraps the year, in July' => [11, 2, 7, false];
        yield 'a single month' => [9, 9, 9, true];
        yield 'half a range is no range' => [6, null, 1, true];
    }

    #[DataProvider('seasons')]
    public function test_a_season_covers_the_right_months(?int $from, ?int $to, int $month, bool $expected): void
    {
        $product = new Product(['season_from' => $from, 'season_to' => $to]);

        $this->assertSame($expected, $product->isInSeason($month));
    }

    public function test_available_means_in_stock_and_in_season(): void
    {
        $this->assertFalse((new Product(['stock_quantity' => 0]))->isAvailable());
        $this->assertTrue((new Product(['stock_quantity' => 3]))->isAvailable());
    }

    public function test_the_usual_wait_counts_from_the_first_unanswered_message(): void
    {
        $at = fn (int $hour) => Carbon::create(2026, 5, 1, $hour);
        $message = fn (int $buyer, int $sender, int $hour) => (object) ['buyer_id' => $buyer, 'sender_id' => $sender, 'created_at' => $at($hour)];

        $waits = ResponseTime::waits([
            $message(1, 1, 8),   // buyer 1 asks at 8
            $message(1, 1, 9),   // and again - the clock does not restart
            $message(2, 2, 9),   // buyer 2 asks at 9
            $message(1, 99, 11), // the producer answers buyer 1: 3 hours
            $message(2, 99, 10), // and buyer 2: 1 hour
            $message(1, 99, 12), // a second answer with nobody waiting counts for nothing
        ]);

        $this->assertSame([3.0, 1.0], $waits);
        $this->assertSame(2.0, ResponseTime::median($waits));
        $this->assertSame(3.0, ResponseTime::median([30.0, 1.0, 3.0]));
    }

    /** Model 97: the number with its control digits is 1 modulo 97, which is what banks check. */
    public function test_payment_references_carry_valid_control_digits(): void
    {
        foreach (['12345678', '10000000', '99999999', '20261003'] as $base) {
            $control = PaymentReference::controlDigits($base);

            $this->assertMatchesRegularExpression('/^\d{2}$/', $control);
            $this->assertSame(1, (int) bcmod($base.$control, '97'));
        }
    }
}
