const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Entities ─────────────────────────────────────────────────────────────

export const api = {
  entities: {
    list: (params?: { status?: string; type?: string; q?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ data: Entity[]; total: number }>(`/entities${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<{ entity: Entity; blocks: ContentBlock[]; relations: Relation[] }>(`/entities/${id}`),
    getBySlug: (slug: string) => request<{ entity: Entity; blocks: ContentBlock[]; relations: Relation[] }>(`/entities/slug/${slug}`),
    create: (data: Partial<Entity>) =>
      request<{ entity: Entity }>("/entities", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Entity>) =>
      request<{ entity: Entity }>(`/entities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    generate: (id: string) =>
      request<{ entity: Entity; blocks: ContentBlock[] }>(`/entities/${id}/generate`, { method: "POST" }),
    publish: (id: string) =>
      request<{ entity: Entity }>(`/entities/${id}/publish`, { method: "POST" }),
    unpublish: (id: string) =>
      request<{ entity: Entity }>(`/entities/${id}/unpublish`, { method: "POST" }),
    delete: (id: string) =>
      request<{ message: string }>(`/entities/${id}`, { method: "DELETE" }),
  },

  relations: {
    forEntity: (entityId: string) =>
      request<{ data: Relation[] }>(`/relations/entity/${entityId}`),
    create: (data: Partial<Relation>) =>
      request<{ relation: Relation }>("/relations", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ message: string }>(`/relations/${id}`, { method: "DELETE" }),
  },

  blocks: {
    forEntity: (entityId: string) =>
      request<{ data: ContentBlock[] }>(`/blocks/entity/${entityId}`),
    create: (data: Partial<ContentBlock>) =>
      request<{ block: ContentBlock }>("/blocks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ContentBlock>) =>
      request<{ block: ContentBlock }>(`/blocks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ message: string }>(`/blocks/${id}`, { method: "DELETE" }),
  },

  admin: {
    login: (password: string) =>
      request<{ message: string; expiresAt: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    logout: () => request<{ message: string }>("/admin/logout", { method: "POST" }),
    createApiKey: (data: { name: string; permissions?: string[]; expiresInDays?: number }) =>
      request<{ id: string; name: string; key: string; permissions: string[] }>("/admin/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listApiKeys: () => request<{ data: ApiKey[] }>("/admin/api-keys"),
    revokeApiKey: (id: string) =>
      request<{ message: string }>(`/admin/api-keys/${id}`, { method: "DELETE" }),
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Entity {
  id: string;
  type: string;
  canonicalName: string;
  aliases: string[];
  language: string;
  casNumber?: string;
  categories: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  heroImageUrl?: string;
  metrics: Array<{ label: string; value: string; unit?: string }>;
  status: "draft" | "review" | "published" | "archived";
  version: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlock {
  id: string;
  entityId: string;
  layer: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
  scope: string[];
  blockType: string;
  title?: string;
  body: string;
  sources: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Relation {
  id: string;
  fromEntityId: string;
  relationType: string;
  toEntityId: string;
  layer: string;
  scope: string[];
  description?: string;
  sources: string[];
  confidenceScore: number;
  evidenceLevel?: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  permissions: string[];
  active: boolean;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}
