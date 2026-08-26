export function formatCurrency(amount: number, currency = "CLP"): string {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "CLP" ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString("es-CL")}`;
  }
}

export function formatMeters(value: number): string {
  return `${value.toFixed(3)} m`;
}
