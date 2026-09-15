-- ============================================================
-- SAHAY: AI Disaster Copilot Database Schema
-- Conversation and message history with disaster intent metadata
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  title VARCHAR(255) DEFAULT 'Emergency Assistance',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(session_id);

CREATE TABLE IF NOT EXISTS ai_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  disaster_type VARCHAR(50),
  severity VARCHAR(20),
  requires_sos BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_disaster ON ai_messages(disaster_type);
CREATE INDEX IF NOT EXISTS idx_ai_messages_severity ON ai_messages(severity);
