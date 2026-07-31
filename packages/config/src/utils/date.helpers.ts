export function toIsoString(date: Date = new Date()): string {
  return date.toISOString();
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}
