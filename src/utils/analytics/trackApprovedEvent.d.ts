export declare const EVENT_REGISTRY: Record<string, { required: readonly string[]; properties: Record<string, readonly string[]> }>;
export declare function trackApprovedEvent(eventName: string, props?: Record<string, unknown>, pageUrl?: string, websiteId?: string):
  { ok: true; payload: { type: 'event'; payload: { website: string; url: string; name: string; data: Record<string, string> } }; warnings?: string[] } |
  { ok: false; error: string };
export declare function classifyPageUrl(rawUrl: string): { kind: 'safe'; path: string } | { kind: 'aggregate' } | { kind: 'unsafe' };
export declare function normalizePath(rawUrl: string): string | null;
export declare function getPathPolicyStats(): { aggregated: number; rejected: number };
export declare function resetPathPolicyStats(): void;
export declare function resolveWebsiteId(hostname: string): string | null;
export declare function pageCategoryFor(pathname: string): string;
export declare function sendApprovedEvent(eventName: string, props?: Record<string, string>): { ok: boolean; error?: string };
