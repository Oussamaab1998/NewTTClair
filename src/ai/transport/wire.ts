/**
 * Messages API shapes used by the AI tutor (src/ai). Only the fields we send
 * or read are typed. Content blocks returned by the model are kept as opaque
 * JSON objects: thinking blocks carry signatures that must go back unchanged,
 * and new block types (fallback, compaction) must round-trip untouched.
 */

export type JsonObject = { [key: string]: unknown };

export interface ContentBlock extends JsonObject {
  type: string;
}

export interface TextBlock extends ContentBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock extends ContentBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultBlock extends ContentBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/** `system` messages mid-conversation are supported on Sonnet 5.5 (no beta). */
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export interface CacheControl {
  type: 'ephemeral';
  ttl?: '5m' | '1h';
}

export interface SystemBlock {
  type: 'text';
  text: string;
  cache_control?: CacheControl;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: JsonObject;
  strict?: boolean;
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface MessagesRequest {
  model: string;
  max_tokens: number;
  system: SystemBlock[];
  messages: ApiMessage[];
  tools: ToolDefinition[];
  thinking: { type: 'adaptive' };
  output_config: { effort: Effort };
  /** Top-level automatic caching of the last cacheable block (the history tail). */
  cache_control?: CacheControl;
  /** Server-side refusal fallback (beta header server-side-fallback-2026-07-01). */
  fallbacks?: 'default';
}

/** Token counts as billed; `input` is only what came after the last cache breakpoint. */
export interface AiUsage {
  input: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  output: number;
}

export interface MessagesResponse {
  id: string;
  model: string;
  content: ContentBlock[];
  stopReason: string;
  /** Only when stopReason is 'refusal'. */
  refusalCategory: string | null;
  usage: AiUsage;
}

export const isObject = (v: unknown): v is JsonObject =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export const isToolUse = (b: ContentBlock): b is ToolUseBlock =>
  b.type === 'tool_use' &&
  typeof b.id === 'string' &&
  typeof b.name === 'string';

export const isText = (b: ContentBlock): b is TextBlock =>
  b.type === 'text' && typeof b.text === 'string';
