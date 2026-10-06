import { t } from '@/lib/i18n';
import { type Category } from '@/types';

/**
 * A category's name as a select box shows it: a subcategory set in under its
 * parent. The list itself arrives in tree order, so the dash is all it takes
 * to read as one.
 */
export function categoryLabel(category: Category): string {
    return category.parent_id ? `— ${t(category.name)}` : t(category.name);
}

/** The categories as options of a CompactSelect. */
export function categoryOptions(categories: Category[]): { value: string; label: string }[] {
    return categories.map((category) => ({ value: String(category.id), label: categoryLabel(category) }));
}
