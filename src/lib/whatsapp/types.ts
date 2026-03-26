// ============================================
// WhatsApp Business API - TypeScript Types
// ============================================

// ---- Meta Cloud API Types ----

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: "whatsapp";
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WebhookContact[];
    messages?: IncomingMessage[];
    statuses?: MessageStatus[];
    errors?: WebhookError[];
  };
  field: string;
}

export interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: MessageType;
  text?: { body: string };
  image?: MediaMessage;
  document?: MediaMessage & { filename?: string };
  audio?: MediaMessage;
  video?: MediaMessage;
  location?: { latitude: number; longitude: number; name?: string };
  button?: { text: string; payload: string };
  interactive?: InteractiveResponse;
  context?: { from: string; id: string };
}

export type MessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "location"
  | "button"
  | "interactive"
  | "sticker"
  | "contacts";

export interface MediaMessage {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface InteractiveResponse {
  type: "button_reply" | "list_reply";
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: WebhookError[];
}

export interface WebhookError {
  code: number;
  title: string;
  message: string;
  error_data?: { details: string };
}

// ---- Outgoing Message Types ----

export interface SendTextMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: { body: string; preview_url?: boolean };
}

export interface SendTemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters?: TemplateParameter[];
  sub_type?: "quick_reply" | "url";
  index?: number;
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  image?: { link: string };
  document?: { link: string; filename: string };
}

export interface SendInteractiveMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "interactive";
  interactive: {
    type: "button" | "list";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: InteractiveAction;
  };
}

export interface InteractiveAction {
  buttons?: Array<{
    type: "reply";
    reply: { id: string; title: string };
  }>;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export type OutgoingMessage =
  | SendTextMessage
  | SendTemplateMessage
  | SendInteractiveMessage;

// ---- Database / CRM Types ----

export interface WhatsAppConfig {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  wabaId: string; // WhatsApp Business Account ID
  displayPhoneNumber: string;
  businessName: string;
  accessToken: string; // Encrypted
  webhookSecret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  tenantId: string;
  configId: string;
  contactPhone: string;
  contactName: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
  status: "open" | "closed" | "pending" | "bot";
  assignedTo?: string;
  tags: string[];
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  tenantId: string;
  waMessageId: string;
  direction: "inbound" | "outbound";
  type: MessageType;
  content: string;
  mediaUrl?: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  components: TemplateComponentDef[];
}

export interface TemplateComponentDef {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
  text?: string;
  example?: { body_text?: string[][] };
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

// ---- API Response Types ----

export interface MetaApiResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// ---- Embedded Signup Types ----

export interface EmbeddedSignupResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: "GREEN" | "YELLOW" | "RED";
  code_verification_status: string;
}
