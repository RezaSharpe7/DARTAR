export enum UserRole {
  OWNER = 'Business Owner',
  STAFF = 'Staff',
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'audio' | 'document';
    url: string; // Base64 or Blob URL
    name?: string;
  }[];
}

export interface SaleRecord {
  id: string;
  item: string;
  amount: number;
  time: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  date: string;
}

export interface DashboardData {
  dailySales: number;
  dailyExpenses: number;
  netIncome: number;
  salesTrend: { name: string; sales: number; expenses: number }[];
  topProducts: { name: string; value: number }[];
  alerts: string[];
  benchmarks?: {
    grossMargin: { you: number; sector: number };
    restockFrequency: { you: number; sector: number };
  };
}