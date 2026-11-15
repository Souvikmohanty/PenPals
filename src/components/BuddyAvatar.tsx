import {
  Bus,
  Coffee,
  Gift,
  Heart,
  Home,
  ShoppingBasket,
  Sparkles,
  Utensils,
} from 'lucide-react';
import {
  AVATAR_COLORS,
  CATEGORY_MAP,
  type AvatarColorKey,
  type AvatarKey,
  type ExpenseCategory,
} from '../types';

interface BuddyAvatarProps {
  avatarKey: AvatarKey;
  colorKey: AvatarColorKey;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: 'happy' | 'curious' | 'focused' | 'surprised';
}

const SIZE_CLASSES: Record<NonNullable<BuddyAvatarProps['size']>, string> = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export function BuddyAvatar({
  avatarKey,
  colorKey,
  size = 'md',
  mood = 'happy',
}: BuddyAvatarProps) {
  const palette = AVATAR_COLORS[colorKey] || AVATAR_COLORS.coral;

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-2xl flex items-center justify-center shrink-0 select-none transition-transform duration-150`}
      style={{
        backgroundColor: palette.bg,
        color: palette.ink,
      }}
      aria-hidden="true"
    >
      <BuddyIllustration avatarKey={avatarKey} mood={mood} />
    </div>
  );
}

export function BuddyIllustration({
  avatarKey,
  mood = 'happy',
  className = 'w-[68%] h-[68%]',
}: {
  avatarKey: AvatarKey;
  mood?: 'happy' | 'curious' | 'focused' | 'surprised';
  className?: string;
}) {
  const renderFace = (cy = 14) => (
    <>
      {mood === 'curious' ? (
        <>
          <circle cx="9.5" cy={cy - 0.5} r="1.2" fill="currentColor" />
          <path
            d={`M13.5 ${cy - 0.5} Q14.8 ${cy - 1.8} 16 ${cy - 0.5}`}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <circle cx="9.2" cy={cy - 0.5} r="1.2" fill="currentColor" />
          <circle cx="14.8" cy={cy - 0.5} r="1.2" fill="currentColor" />
        </>
      )}

      {/* Rosy cheeks */}
      <circle cx="7.3" cy={cy + 1.3} r="1.1" fill="#FF5D73" opacity="0.35" />
      <circle cx="16.7" cy={cy + 1.3} r="1.1" fill="#FF5D73" opacity="0.35" />

      {mood === 'happy' && (
        <path
          d={`M10.4 ${cy + 1.6} Q12 ${cy + 3.2} 13.6 ${cy + 1.6}`}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {mood === 'curious' && (
        <path
          d={`M10.8 ${cy + 1.8} Q12 ${cy + 2.6} 13.2 ${cy + 1.8}`}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {mood === 'focused' && (
        <line
          x1="10.6"
          y1={cy + 2}
          x2="13.4"
          y2={cy + 2}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
      {mood === 'surprised' && (
        <circle
          cx="12"
          cy={cy + 2}
          r="1.3"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
        />
      )}
    </>
  );

  switch (avatarKey) {
    case 'piggy':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="6.5" cy="7.5" r="2.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17.5" cy="7.5" r="2.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="13.5" rx="7.5" ry="6.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 8.8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          {renderFace(14)}
        </svg>
      );
    case 'bear':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="6.5" cy="7" r="2.7" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17.5" cy="7" r="2.7" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="13.2" r="7.2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.6" />
          {renderFace(13.5)}
        </svg>
      );
    case 'bunny':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="7.5" y="3" width="3" height="6.5" rx="1.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13.5" y="3" width="3" height="6.5" rx="1.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="14.5" rx="7" ry="6" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.6" />
          {renderFace(14.5)}
        </svg>
      );
    case 'cat':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M6 10L5.5 4.8L10 7.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M18 10L18.5 4.8L14 7.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <ellipse cx="12" cy="13.8" rx="7.2" ry="6.2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.6" />
          {renderFace(13.8)}
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M12 3.2L14.5 8.5L20.3 9.3L16 13.4L17.1 19.2L12 16.4L6.9 19.2L8 13.4L3.7 9.3L9.5 8.5L12 3.2Z"
            fill="#FFFFFF"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {renderFace(12.8)}
        </svg>
      );
    case 'sprout':
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M12 7V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 5.2C12 3.4 14.5 2.5 16 3.5C15.5 5.2 13.8 5.8 12 5.2Z" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="12" cy="13.8" r="6.8" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.6" />
          {renderFace(13.8)}
        </svg>
      );
  }
}

export function CategoryIcon({
  category,
  size = 'md',
}: {
  category: ExpenseCategory;
  size?: 'sm' | 'md' | 'lg';
}) {
  const meta = CATEGORY_MAP[category] || CATEGORY_MAP.other;
  const boxSize =
    size === 'sm' ? 'w-8 h-8 rounded-xl' : size === 'lg' ? 'w-11 h-11 rounded-2xl' : 'w-9 h-9 rounded-xl';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  const renderIcon = () => {
    switch (category) {
      case 'coffee':
        return <Coffee className={iconSize} />;
      case 'meals':
        return <Utensils className={iconSize} />;
      case 'groceries':
        return <ShoppingBasket className={iconSize} />;
      case 'transit':
        return <Bus className={iconSize} />;
      case 'fun':
        return <Gift className={iconSize} />;
      case 'home':
        return <Home className={iconSize} />;
      case 'health':
        return <Heart className={iconSize} />;
      case 'other':
      default:
        return <Sparkles className={iconSize} />;
    }
  };

  return (
    <div
      className={`${boxSize} flex items-center justify-center shrink-0`}
      style={{ backgroundColor: meta.bgHex, color: meta.inkHex }}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
}
