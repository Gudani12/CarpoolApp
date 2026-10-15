export function estimateArrivalTime(
  departureTime: string,
  durationSeconds: number,
): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(departureTime);
  if (!match || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const arrivalMinutes =
    (hours * 60 + minutes + Math.round(durationSeconds / 60)) % (24 * 60);
  return `${String(Math.floor(arrivalMinutes / 60)).padStart(2, "0")}:${String(
    arrivalMinutes % 60,
  ).padStart(2, "0")}`;
}
