export function parseBdtToPaisa(input: string): number {
  if (!input || input.trim() === '') return 0;
  // Remove spaces, commas
  const sanitized = input.replace(/[\\s,]/g, '');
  if (!/^[0-9]+(\\.[0-9]{1,2})?$/.test(sanitized)) {
    throw new Error('Invalid monetary amount');
  }
  const parts = sanitized.split('.');
  const taka = parseInt(parts[0], 10) || 0;
  let paisa = 0;
  if (parts.length > 1) {
    const fractionStr = parts[1].padEnd(2, '0').slice(0, 2);
    paisa = parseInt(fractionStr, 10);
  }
  return (taka * 100) + paisa;
}
