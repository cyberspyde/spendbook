/*
  # Spendbook Database Schema

  1. New Tables
    - `users` - Telegram users who can record expenses
    - `categories` - Expense categories
    - `expenses` - Individual expense records
    - `deposits` - Deposit requests and approvals
    - `admin_sessions` - Simple admin authentication tracking

  2. Security
    - Basic table structure without RLS (local PostgreSQL)
    - Indexes for performance on frequently queried columns

  3. Features
    - Complete expense tracking with categories
    - Deposit request workflow
    - Admin session management
    - Comprehensive reporting data structure
*/

-- Users table for Telegram users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories for expenses
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_uz VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deposits table for deposit requests
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by VARCHAR(255)
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Insert default categories
INSERT INTO categories (name, name_uz, color) VALUES
('Food', 'Oziq-ovqat', '#10B981'),
('Transport', 'Transport', '#3B82F6'),
('Utilities', 'Kommunal xizmatlar', '#F59E0B'),
('Entertainment', 'Ko''ngilochar', '#EF4444'),
('Health', 'Sogʻliqni saqlash', '#8B5CF6'),
('Shopping', 'Xaridlar', '#EC4899'),
('Other', 'Boshqa', '#6B7280')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);