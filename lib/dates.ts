/** Format ISO dates like 2026-07-09 → 9 Jul 2026 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

export function toRfc822(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return date.toUTCString();
}
