export function isValidIsraeliId(value: string | number): boolean {
  const str = String(value ?? "").trim();
  if (!/^\d{5,9}$/.test(str)) return false;

  const paddedId = str.padStart(9, "0");
  const sum = paddedId.split("").reduce((acc, digit, index) => {
    const step = Number(digit) * ((index % 2) + 1);
    return acc + (step > 9 ? step - 9 : step);
  }, 0);

  return sum % 10 === 0;
}

