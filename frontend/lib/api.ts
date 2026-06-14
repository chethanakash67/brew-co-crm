const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

export type Store = {
  id: string;
  name: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tier: "gold" | "silver" | "bronze" | string;
  totalSpend: number;
  createdAt: string;
  lastOrderAt?: string | null;
};

export type Order = {
  id: string;
  amount: number;
  items: Array<{ name: string; quantity: number }> | unknown;
  channel: string;
  orderedAt: string;
};

export type CustomerDetail = Customer & {
  orders: Order[];
  totalOrders: number;
  lifetimeValue: number;
};

export type DraftPreviewCustomer = {
  name: string;
  city: string;
  tier: string;
  totalSpend: number;
  totalOrders: number;
  favoriteItem: string;
  lastItem: string;
  lastOrderDaysAgo: number | null;
};

export type PaginatedCustomers = {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type Segment = {
  id: string;
  name: string;
  description: string;
  sqlQuery: string;
  createdAt: string;
  customerCount?: number;
};

export type SegmentPreview = {
  count: number;
  customers: Customer[];
  sql: string;
};

export type CampaignStatsData = {
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
};

export type Campaign = {
  id: string;
  name: string;
  segmentId: string;
  message: string;
  channel: "whatsapp" | "sms" | "email" | string;
  status: "draft" | "launched" | "completed" | string;
  createdAt: string;
  segment: Segment;
  stats: CampaignStatsData;
};

export type CampaignDetail = Campaign & {
  timeline: Array<{ date: string; delivered?: number; failed?: number; opened?: number; clicked?: number }>;
  communications: Array<{
    id: string;
    message: string;
    channel: string;
    status: string;
    sentAt: string | null;
    customer: Customer;
    receipts: Array<{ id: string; eventType: string; timestamp: string }>;
  }>;
};

export type CampaignRecommendation = {
  title: string;
  description: string;
  suggestedSegmentQuery: string;
  suggestedChannel: string;
  suggestedGoal: string;
  estimatedAudience?: number;
};

export type DashboardData = {
  totalCustomers: number;
  activeSegments: number;
  campaignsThisMonth: number;
  avgOpenRate: number;
  aiSuggestions: string[];
  aiRecommendations: CampaignRecommendation[];
  recentCampaigns: Campaign[];
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {})
  };

  if (typeof window !== "undefined") {
    const storeId = window.localStorage.getItem("activeStoreId");
    if (storeId) {
      headers["x-store-id"] = storeId;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }
  return payload.data;
}

export const api = {
  getDashboard: () => apiRequest<DashboardData>("/api/dashboard"),
  getCustomers: (filters: { search?: string; city?: string; tier?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (filters.search) query.set("search", filters.search);
    if (filters.city && filters.city !== "all") query.set("city", filters.city);
    if (filters.tier && filters.tier !== "all") query.set("tier", filters.tier);
    if (filters.page) query.set("page", String(filters.page));
    if (filters.limit) query.set("limit", String(filters.limit));
    return apiRequest<PaginatedCustomers>(`/api/customers?${query.toString()}`);
  },
  getCustomer: (id: string) => apiRequest<CustomerDetail>(`/api/customers/${id}`),
  getSegments: () => apiRequest<Segment[]>("/api/segments"),
  previewSegment: (naturalLanguage: string) =>
    apiRequest<SegmentPreview>("/api/segments/preview", {
      method: "POST",
      body: JSON.stringify({ naturalLanguage })
    }),
  createSegment: (data: { name: string; description: string; sqlQuery: string }) =>
    apiRequest<Segment>("/api/segments", { method: "POST", body: JSON.stringify(data) }),
  getCampaigns: () => apiRequest<Campaign[]>("/api/campaigns"),
  draftMessages: (data: { segmentId: string; goal: string; channel: string }) =>
    apiRequest<{ variants: string[]; usedAi: boolean; previewCustomers: DraftPreviewCustomer[] }>("/api/campaigns/draft-message", { method: "POST", body: JSON.stringify(data) }),
  createCampaign: (data: { name: string; segmentId: string; message: string; channel: string }) =>
    apiRequest<Campaign>("/api/campaigns", { method: "POST", body: JSON.stringify(data) }),
  launchCampaign: (id: string) => apiRequest<{ campaignId: string; queued: number; dispatchFailures: number }>(`/api/campaigns/${id}/launch`, { method: "POST" }),
  getCampaign: (id: string) => apiRequest<CampaignDetail>(`/api/campaigns/${id}`),
  getCampaignStats: (id: string) => apiRequest<CampaignStatsData>(`/api/campaigns/${id}/stats`),
  getCampaignInsights: (id: string) => apiRequest<{ insight: string }>(`/api/campaigns/${id}/insights`),
  createCustomer: (data: { name: string; email: string; phone: string; city: string; tier: string; totalSpend?: number }) =>
    apiRequest<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) }),
  bulkCreateCustomers: (customers: Array<{ name: string; email: string; phone: string; city: string; tier: string; totalSpend?: number }>) =>
    apiRequest<{ count: number; skipped: number }>("/api/customers/bulk", { method: "POST", body: JSON.stringify({ customers }) }),
  getStores: () => apiRequest<Store[]>("/api/stores"),
  createStore: (name: string) => apiRequest<Store>("/api/stores", { method: "POST", body: JSON.stringify({ name }) }),
  quickLaunchCampaign: (data: { segmentQuery: string; segmentName: string; segmentDescription?: string; channel: string; goal: string }) =>
    apiRequest<{ campaign: Campaign; segment: Segment; queued: number }>("/api/campaigns/quick-launch", {
      method: "POST",
      body: JSON.stringify(data)
    })
};
