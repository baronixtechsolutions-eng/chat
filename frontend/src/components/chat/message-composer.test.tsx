import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageComposer } from "./message-composer";

const sendMessage = vi.fn();
let status = "connected";
vi.mock("@/context/chats-context", () => ({ useChats: () => ({ sendMessage }) }));
vi.mock("@/context/socket-context", () => ({ useSocket: () => ({ status }) }));

const input = () => screen.getByLabelText("Mensaje") as HTMLTextAreaElement;
const sendButton = () => screen.getByRole("button", { name: "Enviar mensaje" }) as HTMLButtonElement;
const type = (value: string) => fireEvent.change(input(), { target: { value } });

describe("MessageComposer", () => {
  beforeEach(() => {
    sendMessage.mockReset();
    status = "connected";
  });

  it("sends the trimmed text with Enter and clears the box", async () => {
    sendMessage.mockResolvedValue(null);
    render(<MessageComposer chatId="chat-1" />);
    type("  hola  ");
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(sendMessage).toHaveBeenCalledWith("chat-1", "hola");
    await vi.waitFor(() => expect(input().value).toBe(""));
  });

  it("uses Shift+Enter for a new line instead of sending", () => {
    render(<MessageComposer chatId="chat-1" />);
    type("línea 1");
    fireEvent.keyDown(input(), { key: "Enter", shiftKey: true });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("does not send empty messages", () => {
    render(<MessageComposer chatId="chat-1" />);
    type("   ");
    expect(sendButton().disabled).toBe(true);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("keeps the text and shows the error when sending fails", async () => {
    sendMessage.mockResolvedValue("El servidor no respondió. Inténtalo de nuevo.");
    render(<MessageComposer chatId="chat-1" />);
    type("importante");
    fireEvent.click(sendButton());

    expect((await screen.findByRole("alert")).textContent).toBe("El servidor no respondió. Inténtalo de nuevo.");
    expect(input().value).toBe("importante");
  });

  it("blocks a second send while the first one is pending", () => {
    sendMessage.mockReturnValue(new Promise(() => {}));
    render(<MessageComposer chatId="chat-1" />);
    type("una vez");
    fireEvent.click(sendButton());
    fireEvent.click(sendButton());
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("is disabled while the socket is disconnected", () => {
    status = "reconnecting";
    render(<MessageComposer chatId="chat-1" />);
    type("hola");
    expect(sendButton().disabled).toBe(true);
    expect(input().placeholder).toBe("Esperando conexión…");
  });
});
