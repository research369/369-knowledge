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

  sources: {
    list: (params?: { search?: string; status?: string; evidenceLevel?: string; limit?: string; offset?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<{ data: Source[]; total: number; limit: number; offset: number }>(`/sources${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<Source & { linkedBlocks: unknown[] }>(`/sources/${id}`),
    create: (data: Partial<Source>) =>
      request<Source>("/sources", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Source>) =>
      request<Source>(`/sources/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/sources/${id}`, { method: "DELETE" }),
    importPmid: (pmid: string) =>
      request<{ source: Source; imported: boolean; message?: string }>("/sources/import/pmid", {
        method: "POST", body: JSON.stringify({ pmid }),
      }),
    importDoi: (doi: string) =>
      request<{ source: Source; imported: boolean; message?: string }>("/sources/import/doi", {
        method: "POST", body: JSON.stringify({ doi }),
      }),
    importBatch: (pmids: string[], dois: string[]) =>
      request<{ results: Array<{ id: string; success: boolean; error?: string }>; imported: number; failed: number }>("/sources/import/batch", {
        method: "POST", body: JSON.stringify({ pmids, dois }),
      }),
  },

  prompts: {
    list: (params?: { promptType?: string; active?: string; search?: string; limit?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<{ data: AiPrompt[]; total: number }>(`/prompts${qs ? `?${qs}` : ""}`);
    },
    get: (idOrSlug: string) => request<AiPrompt>(`/prompts/${idOrSlug}`),
    create: (data: Partial<AiPrompt>) =>
      request<AiPrompt>("/prompts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<AiPrompt>) =>
      request<AiPrompt>(`/prompts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deactivate: (id: string) =>
      request<{ success: boolean }>(`/prompts/${id}`, { method: "DELETE" }),
    logs: (id: string) => request<unknown[]>(`/prompts/${id}/logs`),
  },

  agents: {
    listKeys: () => request<AgentKey[]>("/agents/keys"),
    createKey: (data: { name: string; agentRole: string; canRead?: boolean; canSuggest?: boolean; canWrite?: boolean; description?: string }) =>
      request<AgentKey & { rawKey: string; warning: string }>("/agents/keys", { method: "POST", body: JSON.stringify(data) }),
    updateKey: (id: string, data: Partial<AgentKey>) =>
      request<AgentKey>(`/agents/keys/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    revokeKey: (id: string) =>
      request<{ success: boolean }>(`/agents/keys/${id}`, { method: "DELETE" }),
    listSuggestions: (params?: { status?: string; limit?: string; offset?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<{ data: AgentSuggestion[]; total: number }>(`/agents/suggestions${qs ? `?${qs}` : ""}`);
    },
    reviewSuggestion: (id: string, data: { status: string; reviewNote?: string; reviewedBy?: string }) =>
      request<AgentSuggestion>(`/agents/suggestions/${id}/review`, { method: "PUT", body: JSON.stringify(data) }),
    logs: (params?: { limit?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<unknown[]>(`/agents/logs${qs ? `?${qs}` : ""}`);
    },
  },

  confidence: {
    get: (targetType: string, targetId: string) =>
      request<ConfidenceScore>(`/confidence/${targetType}/${targetId}`),
    compute: (targetType: string, targetId: string) =>
      request<ConfidenceScore>(`/confidence/compute/${targetType}/${targetId}`, { method: "POST" }),
    top: (targetType: string, limit?: number) =>
      request<ConfidenceScore[]>(`/confidence/top/${targetType}${limit ? `?limit=${limit}` : ""}`),
  },

  discussion: {
    get: (targetType: string, targetId: string) =>
      request<DiscussionThread>(`/discussion/${targetType}/${targetId}`),
    add: (targetType: string, targetId: string, data: Partial<DiscussionEntry>) =>
      request<{ id: string; threadId: string }>(`/discussion/${targetType}/${targetId}`, { method: "POST", body: JSON.stringify(data) }),
    resolve: (entryId: string, data: { resolvedBy?: string; resolutionNote?: string }) =>
      request<{ success: boolean }>(`/discussion/${entryId}/resolve`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (entryId: string) =>
      request<{ success: boolean }>(`/discussion/${entryId}`, { method: "DELETE" }),
  },

  tasks: {
    list: (params?: { status?: string; taskType?: string; targetType?: string; targetId?: string; limit?: string; offset?: string }) => {
      const qs = new URLSearchParams((params ?? {}) as Record<string, string>).toString();
      return request<{ tasks: ScientificTask[]; total: number; openCount: number }>(`/tasks${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<ScientificTask>(`/tasks/${id}`),
    create: (data: Partial<ScientificTask> & { taskType: string; title: string }) =>
      request<{ id: string }>("/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ScientificTask> & { completedBy?: string; completionNote?: string }) =>
      request<{ success: boolean }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    lifecycle: (targetType: string, targetId: string, data: LifecycleTransition) =>
      request<{ decisionId: string; previousStatus: string; newStatus: string }>(
        `/tasks/lifecycle/${targetType}/${targetId}`, { method: "POST", body: JSON.stringify(data) }
      ),
    history: (targetType: string, targetId: string) =>
      request<DecisionHistory[]>(`/tasks/history/${targetType}/${targetId}`),
    stats: () => request<TaskStats>("/tasks/stats/overview"),
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

export interface Source {
  id: string;
  pmid?: string;
  doi?: string;
  crossrefUrl?: string;
  pubmedUrl?: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: number;
  volume?: string;
  issue?: string;
  pages?: string;
  abstract?: string;
  aiSummaryDe?: string;
  evidenceLevel?: string;
  studyType?: string;
  biasRisk?: string;
  fundingSource?: string;
  isOpenAccess?: boolean;
  impactFactor?: number;
  qualityScore?: number;
  status: "draft" | "review" | "published" | "archived";
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiPrompt {
  id: string;
  name: string;
  slug: string;
  promptType: string;
  targetEntityType?: string;
  targetLayer?: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables?: unknown[];
  outputFormat?: string;
  expectedLength?: string;
  language: string;
  version: number;
  active: boolean;
  description?: string;
  tags?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentKey {
  id: string;
  name: string;
  agentRole: string;
  canRead: boolean;
  canSuggest: boolean;
  canWrite: boolean;
  active: boolean;
  lastUsedAt?: string;
  requestCount: number;
  createdAt: string;
  expiresAt?: string;
  description?: string;
  rateLimit?: number;
}

export interface AgentSuggestion {
  id: string;
  agentKeyId: string;
  agentRole: string;
  suggestionType: string;
  targetEntityId?: string;
  payload?: unknown;
  reasoning?: string;
  confidence?: number;
  sourceIds?: string[];
  status: "pending" | "approved" | "rejected" | "under_review" | "merged";
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfidenceScore {
  id: string;
  targetType: string;
  targetId: string;
  overallScore: number;
  evidenceLevelScore: number;
  sourceCountScore: number;
  humanStudyScore: number;
  animalStudyScore: number;
  inVitroScore: number;
  metaAnalysisScore: number;
  recencyScore: number;
  reviewerValidationScore: number;
  aiValidationScore: number;
  totalSources: number;
  humanStudies: number;
  animalStudies: number;
  inVitroStudies: number;
  rctCount: number;
  metaAnalysisCount: number;
  openConflicts: number;
  newestSourceYear?: number;
  oldestSourceYear?: number;
  nextValidationDue?: string;
  computedAt: string;
  updatedAt: string;
  canonicalName?: string;
  slug?: string;
}

export interface DiscussionEntry {
  id: string;
  targetType: string;
  targetId: string;
  threadId: string;
  parentEntryId?: string;
  entryType: string;
  content: string;
  authorType: string;
  authorId?: string;
  authorRole?: string;
  sourceIds: string[];
  confidenceScore?: number;
  evidenceLevel?: string;
  isConflict: boolean;
  conflictWith?: string;
  conflictResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  active: boolean;
  createdAt: string;
}

export interface DiscussionThread {
  targetType: string;
  targetId: string;
  totalEntries: number;
  openConflicts: number;
  threads: DiscussionEntry[][];
}

export interface ScientificTask {
  id: string;
  taskType: string;
  title: string;
  description?: string;
  targetType?: string;
  targetId?: string;
  triggeredBy?: string;
  triggerReason?: string;
  assignedTo?: string;
  priority: number;
  dueAt?: string;
  checklist: Array<{ item: string; completed: boolean }>;
  status: "open" | "in_progress" | "completed" | "dismissed" | "blocked";
  completedBy?: string;
  completedAt?: string;
  completionNote?: string;
  linkedSuggestionIds: string[];
  linkedDecisionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleTransition {
  newStatus: string;
  reasoning: string;
  evidenceSummary?: string;
  evidenceLevel?: string;
  confidenceScore?: number;
  sourceIds?: string[];
  reviewedBy?: string;
  reviewerRole?: string;
}

export interface DecisionHistory {
  id: string;
  targetType: string;
  targetId: string;
  decision: string;
  previousStatus?: string;
  newStatus?: string;
  reasoning: string;
  evidenceSummary?: string;
  evidenceLevel?: string;
  confidenceScore?: number;
  sourceIds: string[];
  reviewedBy: string;
  reviewerRole?: string;
  createdAt: string;
}

export interface TaskStats {
  open_tasks: string;
  in_progress_tasks: string;
  completed_tasks: string;
  urgent_tasks: string;
  open_conflicts: string;
  pending_source_reviews: string;
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
