/**
 * The one way to open the AI concierge: a window event. Any surface (the
 * phones' bar "Ask", the desktop launcher, the booking page) dispatches it;
 * components/concierge/Concierge listens. `opener` is where focus returns
 * when the dialog closes (iOS Safari does not focus a tapped button, so
 * document.activeElement alone is not enough).
 */
export const OPEN_CHAT_EVENT = "garnish:open-chat";

export type ChatSurface = "sticky_bar" | "desktop_tab" | "menu" | "book" | "other";

export type OpenChatDetail = { opener?: HTMLElement | null; surface?: ChatSurface };

export function openConcierge(detail: OpenChatDetail = {}) {
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail }));
}
