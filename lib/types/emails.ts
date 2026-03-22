export type EmailFolder = 'inbox' | 'sent' | 'drafts';

export type EmailAccount =
  | 'ryan@bluelinecg.com'
  | 'nick@bluelinecg.com'
  | 'bluelinecgllc@gmail.com';

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  folder: EmailFolder;
  account: EmailAccount;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: string[];
  messages: EmailMessage[];
  lastMessageAt: string;
  isRead: boolean;
  account: EmailAccount;
  folder: EmailFolder;
  clientId?: string;
  preview: string;
}
