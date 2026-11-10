import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import RegisterPage from "./page";

const register = vi.fn();
vi.mock("@/context/auth-context", () => ({ useAuth: () => ({ register }) }));

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("RegisterPage", () => {
  beforeEach(() => {
    register.mockReset();
    render(<RegisterPage />);
    fill("Nombre", " Ana ");
    fill("Correo electrónico", "ana@test.com");
    fill("Contraseña", "password123");
  });

  it("registers with the trimmed name", () => {
    register.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(register).toHaveBeenCalledWith({ name: "Ana", email: "ana@test.com", password: "password123" });
  });

  it("shows a duplicated email under the email field", async () => {
    register.mockRejectedValue(new ApiError(409, ["Ya existe una cuenta con este correo"]));
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await screen.findByText("Ya existe una cuenta con este correo");
    const email = screen.getByLabelText("Correo electrónico");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells the user when the server cannot be reached", async () => {
    register.mockRejectedValue(new ApiError(0, ["No se pudo conectar con el servidor. Revisa tu conexión."]));
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No se pudo conectar con el servidor");
  });
});
