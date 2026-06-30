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

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  entities: {
    list: (params?: { status?: string; type?: string; q?: string; limit?: string; offset?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ data: Entity[]; total: number }>(`/entities${qs ? `?${qs}` : ""}`);
    },
    get: (id: string, scope?: string) =>
      request<{ entity: Entity; blocks: ContentBlock[]; relations: Relation[] }>(
        `/entities/${id}${scope ? `?scope=${scope}` : ""}`
      ),
    getBySlug: (slug: string, scope?: string) =>
      request<{ entity: Entity; blocks: ContentBlock[]; relations: Relation[] }>(
        `/entities/slug/${slug}${scope ? `?scope=${scope}` : ""}`
      ),
    create: (data: Partial<Entity>) =>
      request<{ entity: Entity }>("/entities", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Entity>) =>
      request<{ entity: Entity }>(`/entities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    generate: (id: string, context?: string) =>
      request<{ blocksCreated: number; suggestedRelations: unknown[]; seoTitle: string; blocks?: ContentBlock[]; entity?: Entity }>(
        `/entities/${id}/generate`,
        { method: "POST", body: JSON.stringify({ context }) }
      ),
    publish: (id: string) =>
      request<{ message: string; publishedAt: string }>(`/entities/${id}/publish`, { method: "POST" }),
    unpublish: (id: string) =>
      request<{ message: string }>(`/entities/${id}/unpublish`, { method: "POST" }),
    adminAll: () =>
      request<{ data: Entity[]; total: number }>("/entities/admin/all"),
    delete: (id: string) =>
      request<{ message: string }>(`/entities/${id}`, { method: "DELETE" }),
  },

  topics: {
    list: () => request<{ data: Topic[]; total: number }>("/topics"),
    get: (slug: string, params?: { type?: string; limit?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string> ?? {}).toString();
      return request<{ topic: Topic; entities: Entity[]; total: number }>(
        `/topics/${slug}${qs ? `?${qs}` : ""}`
      );
    },
    create: (data: Partial<Topic>) =>
      request<{ topic: Topic }>("/topics", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Topic>) =>
      request<{ topic: Topic }>(`/topics/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    assignEntity: (topicId: string, entityId: string, opts?: { isPrimary?: boolean; sortOrder?: number }) =>
      request<{ message: string }>(`/topics/${topicId}/entities/${entityId}`, {
        method: "POST",
        body: JSON.stringify(opts ?? {}),
      }),
    removeEntity: (topicId: string, entityId: string) =>
      request<{ message: string }>(`/topics/${topicId}/entities/${entityId}`, { method: "DELETE" }),
  },

  search: {
    query: (q: string, opts?: { type?: string; limit?: number }) => {
      const params = new URLSearchParams({ q, ...(opts as Record<string, string> ?? {}) });
      return request<{ data: Entity[]; total: number; query: string }>(`/search?${params}`);
    },
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

  studies: {
    list: (params?: { page?: string; limit?: string; q?: string; entityId?: string; studyType?: string; isHuman?: string; isRct?: string; yearFrom?: string; yearTo?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<{ data: Study[]; total: number; page: number; limit: number }>(`/studies${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<Study>(`/studies/${id}`),
    create: (data: Partial<Study>) =>
      request<Study>("/studies", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Study>) =>
      request<Study>(`/studies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/studies/${id}`, { method: "DELETE" }),
    publish: (id: string) =>
      request<Study>(`/studies/${id}/publish`, { method: "POST" }),
  },

  protocols: {
    list: (params?: { page?: string; limit?: string; q?: string; goal?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<{ data: Protocol[]; total: number; page: number; limit: number }>(`/protocols${qs ? `?${qs}` : ""}`);
    },
    getBySlug: (slug: string) => request<Protocol>(`/protocols/slug/${slug}`),
    get: (id: string) => request<Protocol>(`/protocols/${id}`),
    create: (data: Partial<Protocol>) =>
      request<Protocol>("/protocols", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Protocol>) =>
      request<Protocol>(`/protocols/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/protocols/${id}`, { method: "DELETE" }),
    publish: (id: string) =>
      request<Protocol>(`/protocols/${id}/publish`, { method: "POST" }),
  },

  collections: {
    list: (params?: { page?: string; limit?: string; q?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<{ data: Collection[]; total: number; page: number; limit: number }>(`/collections${qs ? `?${qs}` : ""}`);
    },
    getBySlug: (slug: string) => request<Collection & { entities: Entity[] }>(`/collections/slug/${slug}`),
    get: (id: string) => request<Collection>(`/collections/${id}`),
    create: (data: Partial<Collection>) =>
      request<Collection>("/collections", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Collection>) =>
      request<Collection>(`/collections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/collections/${id}`, { method: "DELETE" }),
    publish: (id: string) =>
      request<Collection>(`/collections/${id}/publish`, { method: "POST" }),
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Entity {
  id: string;
  slug?: string;
  type: string;
  entityType?: string;
  canonicalName: string;
  aliases: string[];
  language: string;
  casNumber?: string;
  categories: string[];
  tags: string[];
  shortDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  heroImageUrl?: string;
  metrics: Array<{ label: string; value: string; unit?: string }>;
  status: "draft" | "review" | "pending_review" | "published" | "archived";
  generatedByAi?: boolean;
  version: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  description?: string;
  heroImageUrl?: string;
  icon?: string;
  iconName?: string;
  color?: string;
  sortOrder: number;
  active: boolean;
  seoTitle?: string;
  seoDescription?: string;
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

export interface Study {
  id: string;
  entityId?: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: number;
  doi?: string;
  pubmedId?: string;
  studyType?: "rct" | "meta_analysis" | "systematic_review" | "cohort" | "case_control" | "case_report" | "in_vitro" | "animal" | "review" | "other";
  isHuman?: boolean;
  isRct?: boolean;
  sampleSize?: number;
  duration?: string;
  abstractText?: string;
  aiSummaryDe?: string;
  keyFindings?: string[];
  limitations?: string[];
  evidenceLevel?: "1a" | "1b" | "2a" | "2b" | "3" | "4" | "5";
  status: "draft" | "review" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface Protocol {
  id: string;
  slug: string;
  name: string;
  goal?: string;
  targetAudience?: string[];
  duration?: string;
  frequency?: string;
  compounds?: string[];
  phases?: Array<{ name: string; duration: string; compounds: string[]; notes?: string }>;
  contraindications?: string[];
  monitoring?: string[];
  notes?: string;
  status: "draft" | "review" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description?: string;
  collectionType?: "stack" | "category" | "goal" | "curated" | "auto";
  manualEntityIds?: string[];
  filterEntityTypes?: string[];
  excludeEntityIds?: string[];
  sortBy?: string;
  status: "draft" | "review" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
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
