import type { AnimationCommandKey, ViewerMode } from '../state/viewerStore';

export type AnimationCommandOption = {
  command: AnimationCommandKey;
  label: string;
  shortLabel: string;
  group: 'move' | 'rotate';
};

export const MOVE_COMMAND_OPTIONS: AnimationCommandOption[] = [
  { command: 'ud+', label: 'Up', shortLabel: 'U', group: 'move' },
  { command: 'ud-', label: 'Down', shortLabel: 'D', group: 'move' },
  { command: 'lr-', label: 'Left', shortLabel: 'L', group: 'move' },
  { command: 'lr+', label: 'Right', shortLabel: 'R', group: 'move' },
  { command: 'fb+', label: 'Forward', shortLabel: 'F', group: 'move' },
  { command: 'fb-', label: 'Back', shortLabel: 'B', group: 'move' },
];

export const ROTATE_COMMAND_OPTIONS = (
  viewerMode: ViewerMode,
): AnimationCommandOption[] =>
  [
    { command: 'yaw-', label: 'Yaw -', shortLabel: 'Y-', group: 'rotate' },
    { command: 'yaw+', label: 'Yaw +', shortLabel: 'Y+', group: 'rotate' },
    {
      command: 'pitch-',
      label: 'Pitch -',
      shortLabel: 'P-',
      group: 'rotate',
    },
    {
      command: 'pitch+',
      label: 'Pitch +',
      shortLabel: 'P+',
      group: 'rotate',
    },
    ...(viewerMode === 'headway'
      ? []
      : [
          {
            command: 'roll-' as const,
            label: 'Roll -',
            shortLabel: 'R-',
            group: 'rotate' as const,
          },
          {
            command: 'roll+' as const,
            label: 'Roll +',
            shortLabel: 'R+',
            group: 'rotate' as const,
          },
        ]),
  ] satisfies AnimationCommandOption[];

export const getAnimationCommandOptions = (viewerMode: ViewerMode) => [
  ...MOVE_COMMAND_OPTIONS,
  ...ROTATE_COMMAND_OPTIONS(viewerMode),
];

export const getAnimationCommandOption = (
  viewerMode: ViewerMode,
  command: AnimationCommandKey,
) => getAnimationCommandOptions(viewerMode).find((option) => option.command === command);

export const getAnimationAmountHint = (
  viewerMode: ViewerMode,
  command: AnimationCommandKey,
) => {
  if (command.startsWith('fb')) {
    return viewerMode === 'geo'
      ? 'Amount is camera-distance delta for Geo forward/back.'
      : 'Amount is zoom delta for Headway forward/back.';
  }

  return 'Amount is measured in degrees.';
};
