<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Text search over a model's own columns.
 *
 * On MySQL it is the FULLTEXT index (see the add_search_indexes migration)
 * in boolean mode: every word must appear, each as a prefix - "ajv" finds
 * "ajvar". InnoDB does not index words shorter than three letters, so a
 * query with one of those - and the test suite's SQLite - falls back to
 * LIKE, which reads every row but still answers correctly.
 */
final class Search
{
    /** Longer queries are cut; nobody types more to find a jar of honey. */
    private const MAX_LENGTH = 100;

    private const MAX_WORDS = 6;

    /** InnoDB's innodb_ft_min_token_size. */
    private const MIN_INDEXED_WORD = 3;

    /** The query as the search sees it: letters and digits only, a few words at most. */
    public static function clean(?string $input): string
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', Str::limit((string) $input, self::MAX_LENGTH, ''), -1, PREG_SPLIT_NO_EMPTY);

        return implode(' ', array_slice($words ?: [], 0, self::MAX_WORDS));
    }

    /**
     * Narrows $query to rows matching every word of $input in any of $columns.
     *
     * @param  Builder<Model>  $query
     * @param  list<string>  $columns  Exactly the columns of one FULLTEXT index.
     */
    public static function apply(Builder $query, array $columns, ?string $input): Builder
    {
        $words = self::words($input);

        if ($words === []) {
            return $query;
        }

        if (self::canUseIndex($words)) {
            return $query->whereFullText(array_map($query->qualifyColumn(...), $columns), self::boolean($words), ['mode' => 'boolean']);
        }

        foreach ($words as $word) {
            $query->where(function (Builder $inner) use ($columns, $word) {
                foreach ($columns as $column) {
                    $inner->orWhere($inner->qualifyColumn($column), 'like', "%{$word}%");
                }
            });
        }

        return $query;
    }

    /**
     * Best matches first, where the index can tell; otherwise unchanged.
     *
     * @param  Builder<Model>  $query
     * @param  list<string>  $columns
     */
    public static function orderByRelevance(Builder $query, array $columns, ?string $input): Builder
    {
        $words = self::words($input);

        if ($words === [] || ! self::canUseIndex($words)) {
            return $query;
        }

        $grammar = $query->getQuery()->getGrammar();
        $match = implode(', ', array_map(fn (string $column) => $grammar->wrap($query->qualifyColumn($column)), $columns));

        return $query->orderByRaw("MATCH ({$match}) AGAINST (? IN BOOLEAN MODE) DESC", [self::boolean($words)]);
    }

    /** @return list<string> */
    private static function words(?string $input): array
    {
        $clean = self::clean($input);

        return $clean === '' ? [] : explode(' ', $clean);
    }

    /** Every word required, each as a prefix. @param  list<string>  $words */
    private static function boolean(array $words): string
    {
        return implode(' ', array_map(fn (string $word) => "+{$word}*", $words));
    }

    /** @param  list<string>  $words */
    private static function canUseIndex(array $words): bool
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return false;
        }

        foreach ($words as $word) {
            if (mb_strlen($word) < self::MIN_INDEXED_WORD) {
                return false;
            }
        }

        return true;
    }
}
