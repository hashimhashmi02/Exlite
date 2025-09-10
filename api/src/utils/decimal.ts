export function toScaledBigInt(human: number | string, decimals: number): bigint {
  const s = typeof human === 'number' ? human.toString() : human;
  const neg = s.startsWith('-');
  const [iRaw, fRaw = ''] = (neg ? s.slice(1) : s).split('.');
  const i = iRaw.replace(/\D/g, '') || '0';
  const f = (fRaw + '0'.repeat(decimals)).slice(0, decimals);
  const scaled = BigInt(i) * BigInt(10 ** decimals) + BigInt(f || '0');
  return neg ? -scaled : scaled;
}

export function fromScaledBigInt(scaled: bigint, decimals: number): string {
  const neg = scaled < 0n ? '-' : '';
  const v = scaled < 0n ? -scaled : scaled;
  const base = BigInt(10 ** decimals);
  const i = v / base;
  const f = (v % base).toString().padStart(decimals, '0');
  return `${neg}${i}.${f}`;
}
