-- SAHAY PostgreSQL Database Schema
-- Database Name: sahay_db

-- 1. Users Table (Profile Information)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'rescue_team', 'collector')),
  district VARCHAR(100) NOT NULL,
  panchayat VARCHAR(100),
  designation VARCHAR(100),
  department_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Separate Login Table (Authentication Credentials)
CREATE TABLE IF NOT EXISTS login (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_or_email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'rescue_team', 'collector')),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_login_phone_email ON login(phone_or_email);
CREATE INDEX IF NOT EXISTS idx_login_user_id ON login(user_id);
