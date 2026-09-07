// Máscara e validação de WhatsApp (Brasil): (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX
export function usePhoneMask() {
  function maskPhone(value: string) {
    const digits = (value || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function isValidPhone(value: string) {
    const digits = (value || "").replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  }

  return { maskPhone, isValidPhone };
}
