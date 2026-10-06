import { BookOpen, BriefcaseBusiness, Car, ChefHat, HeartHandshake, SprayCan, type LucideIcon } from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  cooking: ChefHat,
  cleaning: SprayCan,
  caretaking: HeartHandshake,
  driving: Car,
  teaching: BookOpen,
};

type SectorIconProps = { slug: string | undefined; size: number; color: string };

/** Line icon for a sector; sectors created later by hirers get a neutral briefcase. */
export function SectorIcon({ slug, size, color }: SectorIconProps) {
  const Icon = (slug ? ICONS[slug] : undefined) ?? BriefcaseBusiness;
  return <Icon size={size} color={color} strokeWidth={2} />;
}
