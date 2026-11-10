import { describe, expect, it } from "vitest";
import { validateLogin, validateRegister } from "./validation";

describe("validateRegister", () => {
  it("accepts valid data", () => {
    expect(validateRegister({ name: "Ana", email: "ana@test.com", password: "password123" })).toEqual({});
  });

  it("reports every empty field", () => {
    expect(validateRegister({ name: "  ", email: "", password: "" })).toEqual({
      name: "El nombre es obligatorio",
      email: "El correo es obligatorio",
      password: "La contraseña es obligatoria",
    });
  });

  it("applies the same limits as the backend", () => {
    const errors = validateRegister({ name: "A", email: "ana@", password: "1234567" });
    expect(errors.name).toBe("El nombre debe tener entre 2 y 50 caracteres");
    expect(errors.email).toBe("El correo no tiene un formato válido");
    expect(errors.password).toBe("La contraseña debe tener al menos 8 caracteres");
    expect(validateRegister({ name: "Ana", email: "ana@test.com", password: "x".repeat(73) }).password).toBe(
      "La contraseña no puede superar 72 caracteres",
    );
  });
});

describe("validateLogin", () => {
  it("only requires a well-formed email and a password", () => {
    expect(validateLogin({ email: " ana@test.com ", password: "x" })).toEqual({});
    expect(validateLogin({ email: "ana", password: "" })).toEqual({
      email: "El correo no tiene un formato válido",
      password: "La contraseña es obligatoria",
    });
  });
});
