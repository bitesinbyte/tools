import { useId } from 'react';
import { SvgIcon, type SvgIconProps } from '@mui/material';

export default function Logo(props: SvgIconProps) {
  const gradientId = `logo-glow-${useId().replace(/:/g, '')}`;

  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <defs>
        <radialGradient id={gradientId} cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="hsl(44, 95%, 64%)" />
          <stop offset="55%" stopColor="hsl(38, 90%, 56%)" />
          <stop offset="100%" stopColor="hsl(31, 92%, 47%)" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="#0a0a0f" />
      <circle cx="50" cy="50" r="33" fill={`url(#${gradientId})`} />
      <path
        d="M42 31 h10 a2 2 0 0 1 2 2 v24 h13 a2 2 0 0 1 2 2 v8 a2 2 0 0 1 -2 2 h-25 a2 2 0 0 1 -2 -2 v-34 a2 2 0 0 1 2 -2 Z"
        fill="#0a0a0f"
      />
    </SvgIcon>
  );
}
