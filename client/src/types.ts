export interface Alert {
    id: string;
    symbol: string;
    condition: "above" | "below";
    targetPrice: number;
    createdAt: string;
    triggered: boolean;
    triggeredAt?: string;
    triggeredPrice?: number;
}

export interface Stats24h {
    symbol: string;
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    trend: string;
    summary: string;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}