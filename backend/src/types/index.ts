export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

export type SegmentCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tier: string;
  totalSpend: number;
};

export type CampaignStats = {
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
};

export type CampaignRecommendation = {
  title: string;
  description: string;
  suggestedSegmentQuery: string;
  suggestedChannel: string;
  suggestedGoal: string;
  estimatedAudience?: number;
};

