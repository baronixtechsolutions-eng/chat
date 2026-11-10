export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Participant {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
  sender: Participant;
}

export interface Chat {
  id: string;
  participants: Participant[];
  lastMessage: Message | null;
  lastActivityAt: string;
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}
