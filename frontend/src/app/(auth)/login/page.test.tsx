import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import LoginPage from "./page";

const login = vi.fn();
vi.mock("@/context/auth-context", () => ({ useAuth: () => ({ login }) }));

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

describe("LoginPage", () => {
  beforeEach(() => {
    login.mockReset();
    render(<LoginPage />);
  });

  it("shows field errors and does not call the API when the form is empty", () => {
    submit();
    expect(screen.getByText("El correo es obligatorio")).toBeTruthy();
    expect(screen.getByText("La contraseña es obligatoria")).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it("sends trimmed credentials and blocks the button while the request is in flight", async () => {
    login.mockReturnValue(new Promise(() => {}));
    fill("Correo electrónico", "  ana@test.com ");
    fill("Contraseña", "password123");
    submit();

    expect(login).toHaveBeenCalledWith("ana@test.com", "password123");
    const button = await screen.findByRole("button", { name: /Entrando/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the server message for invalid credentials and lets the user retry", async () => {
    login.mockRejectedValue(new ApiError(401, ["Correo o contraseña incorrectos"]));
    fill("Correo electrónico", "ana@test.com");
    fill("Contraseña", "wrong-password");
    submit();

    expect((await screen.findByRole("alert")).textContent).toBe("Correo o contraseña incorrectos");
    expect((screen.getByRole("button", { name: "Entrar" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
