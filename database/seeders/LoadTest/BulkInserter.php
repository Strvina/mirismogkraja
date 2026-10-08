<?php

namespace Database\Seeders\LoadTest;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * Rows for one table, written a few hundred to a statement.
 *
 * A quarter of a million rows saved one by one take most of an hour; in
 * multi-row inserts they take a minute or two. How many rows fit in one
 * statement is decided by the database: every value is a bound parameter,
 * and SQLite refuses a statement with too many of them.
 */
final class BulkInserter
{
    /** Rows per statement at most, so one statement stays well under MySQL's max_allowed_packet (1 MB on a default XAMPP). */
    private const MAX_ROWS = 400;

    /** SQLite's SQLITE_MAX_VARIABLE_NUMBER before 3.32, and from it on. */
    private const SQLITE_OLD_LIMIT = 999;

    private const SQLITE_LIMIT = 32766;

    /** A prepared statement's limit on MySQL and MariaDB. */
    private const MYSQL_LIMIT = 65535;

    /** @var list<array<string, mixed>> */
    private array $buffer = [];

    private ?int $rowsPerStatement = null;

    private int $written = 0;

    private ?BulkInserter $parent = null;

    /** @param  (Closure(int): void)|null  $onWrite  Told how many rows each statement wrote. */
    public function __construct(private readonly string $table, private readonly ?Closure $onWrite = null) {}

    /**
     * This table's rows point at rows of the other one, so whatever that one
     * still holds is written first: a photo cannot go in before its product.
     */
    public function after(BulkInserter $parent): static
    {
        $this->parent = $parent;

        return $this;
    }

    /** @param  array<string, mixed>  $row  The same columns in every row of a table. */
    public function add(array $row): void
    {
        $this->rowsPerStatement ??= max(1, min(self::MAX_ROWS, intdiv(self::parameterLimit(), count($row))));
        $this->buffer[] = $row;

        if (count($this->buffer) >= $this->rowsPerStatement) {
            $this->flush();
        }
    }

    /** Writes what is left; returns how many rows went in altogether. */
    public function flush(): int
    {
        if ($this->buffer !== []) {
            $this->parent?->flush();

            DB::table($this->table)->insert($this->buffer);

            $this->written += count($this->buffer);
            ($this->onWrite)?->__invoke(count($this->buffer));
            $this->buffer = [];
        }

        return $this->written;
    }

    private static function parameterLimit(): int
    {
        $connection = DB::connection();

        if ($connection->getDriverName() !== 'sqlite') {
            return self::MYSQL_LIMIT;
        }

        $version = (string) $connection->scalar('select sqlite_version()');

        return version_compare($version, '3.32.0', '>=') ? self::SQLITE_LIMIT : self::SQLITE_OLD_LIMIT;
    }
}
