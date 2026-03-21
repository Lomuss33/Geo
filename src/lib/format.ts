export const formatSigned = (
  value: number,
  positiveLabel: string,
  negativeLabel: string,
) =>
  `${Math.abs(value).toFixed(1)}° ${value >= 0 ? positiveLabel : negativeLabel}`;

export const formatAltitude = (value: number) =>
  `${Math.round(value).toLocaleString()} km`;

export const formatRoll = (value: number) => `${Math.round(value)}°`;
