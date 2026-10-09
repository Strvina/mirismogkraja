import InputError from '@/components/input-error';

/**
 * Everything the server refused, in one place. For the short forms that
 * post with `router` and have no room for a message under each field.
 */
export default function FormErrors({ errors }: { errors: Record<string, string> }) {
    return Object.entries(errors).map(([field, message]) => <InputError key={field} role="alert" message={message} />);
}
