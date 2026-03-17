import axios from "axios";

const BASE = "https://api.binance.com/api/v3";

export interface TickerPrice {
    symbol: string;
    price: number;
}

export interface Stats24h {
    symbol: string;
    lastPrice: number;
    priceChangePercent: number;
    highPrice: number;
    lowPrice: number;
}

export async function fetchPrice(symbol: string): Promise<TickerPrice> {
    const { data } = await axios.get(`${BASE}/ticker/price`, {
        params: { symbol: symbol.toUpperCase() },
    });
    return { symbol: data.symbol, price: parseFloat(data.price) };
}

export async function fetch24hStats(symbol: string): Promise<Stats24h> {
    const { data } = await axios.get(`${BASE}/ticker/24hr`, {
        params: { symbol: symbol.toUpperCase() },
    });
    return {
        symbol: data.symbol,
        lastPrice: parseFloat(data.lastPrice),
        priceChangePercent: parseFloat(data.priceChangePercent),
        highPrice: parseFloat(data.highPrice),
        lowPrice: parseFloat(data.lowPrice),
    };
}