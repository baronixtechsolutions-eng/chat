// Mirrors the backend rules so most mistakes are caught before a request is made
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

function emailError(email: string) {
  if (!email.trim()) return "El correo es obligatorio";
  if (!EMAIL_PATTERN.test(email.trim())) return "El correo no tiene un formato válido";
}

export function validateLogin(values: { email: string; password: string }) {
  const errors: FieldErrors<"email" | "password"> = {};
  errors.email = emailError(values.email);
  if (!values.password) errors.password = "La contraseña es obligatoria";
  return clean(errors);
}

export function validateRegister(values: { name: string; email: string; password: string }) {
  const errors: FieldErrors<"name" | "email" | "password"> = {};
  const name = values.name.trim();
  if (!name) errors.name = "El nombre es obligatorio";
  else if (name.length < 2 || name.length > 50) errors.name = "El nombre debe tener entre 2 y 50 caracteres";
  errors.email = emailError(values.email);
  if (!values.password) errors.password = "La contraseña es obligatoria";
  else if (values.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres";
  else if (values.password.length > 72) errors.password = "La contraseña no puede superar 72 caracteres";
  return clean(errors);
}

function clean<T extends string>(errors: FieldErrors<T>) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as FieldErrors<T>;
}
