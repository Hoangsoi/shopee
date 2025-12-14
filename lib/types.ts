// Common TypeScript types and interfaces for the application

// User types
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  agent_code?: string;
  role: 'user' | 'admin';
  wallet_balance: number;
  commission: number;
  is_frozen: boolean;
  vip_level: number;
  created_at: Date | string;
  updated_at?: Date | string;
}

export interface UserPublic {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin';
  created_at: Date | string;
}

// Category types
export interface Category {
  id: number;
  name: string;
  slug: string;
  discount_percent: number;
  icon?: string;
  sort_order?: number;
  is_active: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Product types
export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  category_id?: number;
  category_name?: string;
  discount_percent?: number;
  is_featured: boolean;
  is_active: boolean;
  stock: number;
  sales_count?: number;
  rating?: number;
  created_at: Date | string;
  updated_at?: Date | string;
}

// Order types
export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_method?: string;
  shipping_address?: string;
  notes?: string;
  item_count?: number;
  commission?: number;
  created_at: Date | string;
  updated_at?: Date | string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// Transaction types
export interface Transaction {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  bank_account_id?: number;
  bank_name?: string;
  account_number?: string;
  created_at: Date | string;
  updated_at?: Date | string;
}

// Cart types
export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  product?: Product;
}

// Bank Account types
export interface BankAccount {
  id: number;
  user_id: number;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  created_at: Date | string;
  updated_at?: Date | string;
}

// Notification types
export interface Notification {
  id: number;
  content: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Banner types
export interface Banner {
  id: number;
  image_url: string;
  title?: string;
  link_url?: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Settings types
export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  updated_at: Date | string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}

// Database column types (for dynamic column checking)
export interface DatabaseColumn {
  column_name: string;
  data_type: string;
  character_maximum_length?: number;
}

// JWT Token types
export interface JWTPayload {
  userId: number;
  identifier?: string;
  email?: string;
  role?: string;
}

// Rate Limit types
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}
