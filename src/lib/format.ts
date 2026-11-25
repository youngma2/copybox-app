const wonFormatter = new Intl.NumberFormat('ko-KR');

/** 12345 -> "12,345원" */
export function won(value: number): string {
  return `${wonFormatter.format(Math.round(value))}원`;
}

/** 12345 -> "12,345" */
export function number(value: number): string {
  return wonFormatter.format(Math.round(value));
}

/** 1536000 -> "1.5MB" */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function fileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function todayCode(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
