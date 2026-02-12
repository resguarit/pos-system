export const normalizePhone = (value: string, maxLength = 10): string => {
  if (!value) return "";
  return value.replace(/\D/g, "").slice(0, maxLength);
};
