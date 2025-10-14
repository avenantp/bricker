-- =====================================================
-- INITIAL SCHEMA WITH SUBSCRIPTION MANAGEMENT
-- =====================================================
-- This schema includes the base schema PLUS all subscription
-- management enhancements from migrations S.1.1 through S.1.5
-- Generated: 2025-01-15
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

