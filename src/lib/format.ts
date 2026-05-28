export function money(value: number | string | null | undefined, currency = "$") {
  const n = Number(value ?? 0);
  return `${currency}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function pct(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
