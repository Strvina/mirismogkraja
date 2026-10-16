import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { t, tx } from '@/lib/i18n';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';

const CHOICES: { value: Appearance; label: string; icon: LucideIcon }[] = [
    { value: 'light', label: tx('Svetla'), icon: Sun },
    { value: 'dark', label: tx('Tamna'), icon: Moon },
    { value: 'system', label: tx('Kao na uređaju'), icon: Monitor },
];

/**
 * Light, dark or as the device has it, from the header of every page - the
 * same choice as Podešavanja → Izgled, one click away instead of three.
 */
export default function ThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();
    // The button shows what is in force: a moon at night, a sun by day.
    const Icon = appearance === 'dark' ? Moon : appearance === 'light' ? Sun : Monitor;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('Tema sajta')} className="text-foreground/70 hover:text-foreground">
                    <Icon className="size-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuRadioGroup value={appearance} onValueChange={(value) => updateAppearance(value as Appearance)}>
                    {CHOICES.map((choice) => (
                        <DropdownMenuRadioItem key={choice.value} value={choice.value} className="gap-2.5 py-2">
                            <choice.icon className="text-muted-foreground size-4" />
                            {t(choice.label)}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
