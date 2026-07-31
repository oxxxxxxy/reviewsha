export interface AvatarProps {
  readonly name: string;
  readonly src?: string;
}

export function Avatar({ name, src }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (src) {
    return <img src={src} alt={name} />;
  }

  return <span aria-label={name}>{initials}</span>;
}
