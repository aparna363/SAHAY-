-- SAHAY Disaster Relief & Compensation Database Schema
-- Compatible with PostgreSQL + PostGIS Extension

-- 1. Relief Norms Configuration Table (Official Government Assistance Rules)
CREATE TABLE IF NOT EXISTS relief_norms (
  id SERIAL PRIMARY KEY,
  fund_source VARCHAR(100) DEFAULT 'State Disaster Response Fund (SDRF) / NDRF',
  assistance_category VARCHAR(100) NOT NULL,
  damage_category VARCHAR(100) NOT NULL,
  norm_description TEXT,
  maximum_amount NUMERIC(12, 2) NOT NULL,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial official SDRF / NDRF relief norms if empty
INSERT INTO relief_norms (assistance_category, damage_category, norm_description, maximum_amount)
SELECT * FROM (VALUES
  ('Immediate Relief', 'Emergency household assistance', 'Immediate gratuitous relief for displaced families for emergency supplies, clothing and utensils', 10000.00),
  ('Immediate Relief', 'Temporary shelter assistance', 'Emergency transitional shelter or rental subsidy for vulnerable families', 15000.00),
  ('Immediate Relief', 'Essential household items', 'Ex-gratia grant for loss of essential household goods and clothing', 8000.00),
  ('Immediate Relief', 'Food/basic necessities', 'Emergency food kit and nutritional support assistance', 5000.00),
  ('Damage Assistance', 'House damage - Fully Destroyed (Permanent House)', 'Ex-gratia assistance for completely destroyed or washed-away permanent concrete/brick house structure', 130000.00),
  ('Damage Assistance', 'House damage - Fully Destroyed (Temporary / Traditional House)', 'Ex-gratia assistance for completely destroyed temporary, mud or thatched house structure', 95000.00),
  ('Damage Assistance', 'House damage - Severely Damaged', 'Assistance for structural repairs of severely damaged residential premises', 40000.00),
  ('Damage Assistance', 'House damage - Partially Damaged', 'Assistance for minor structural repair and desilting of affected houses', 15000.00),
  ('Damage Assistance', 'Agricultural/crop loss', 'Input subsidy for rain-fed and irrigated crop losses (>33% damage) per hectare', 25000.00),
  ('Damage Assistance', 'Livestock loss - Large milch animals', 'Compensation for loss of milch cattle / buffalo (max 3 animals per family)', 37500.00),
  ('Damage Assistance', 'Livestock loss - Small animals', 'Compensation for loss of goat / sheep / pig per animal', 4000.00),
  ('Damage Assistance', 'Livestock loss - Poultry', 'Assistance for commercial/backyard poultry bird losses per bird', 100.00),
  ('Damage Assistance', 'Livelihood loss', 'Artisan/handloom/small vendor inventory and equipment restoration grant', 20000.00),
  ('Death / Injury Assistance', 'Death/ex-gratia assistance', 'Ex-gratia compensation paid to next of kin of deceased disaster victim', 400000.00),
  ('Death / Injury Assistance', 'Injury-related assistance', 'Financial assistance for grievous injuries requiring hospitalisation', 60000.00),
  ('Recovery Assistance', 'Housing recovery', 'Post-disaster long-term reconstruction assistance grant', 250000.00),
  ('Recovery Assistance', 'Livelihood recovery', 'Self-employment / micro-enterprise rejuvenation grant', 50000.00)
) AS v(assistance_category, damage_category, norm_description, maximum_amount)
WHERE NOT EXISTS (SELECT 1 FROM relief_norms LIMIT 1);

-- 2. Relief Claims Table
CREATE TABLE IF NOT EXISTS relief_claims (
  id SERIAL PRIMARY KEY,
  claim_id VARCHAR(50) NOT NULL UNIQUE,
  citizen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
  
  -- Disaster Information
  disaster_type VARCHAR(100) NOT NULL,
  disaster_date DATE NOT NULL,
  
  -- Applicant Details
  relationship_to_affected VARCHAR(100) DEFAULT 'Self',
  affected_family_members INTEGER DEFAULT 1,
  vulnerable_person_category TEXT[] DEFAULT '{}',
  
  -- Assistance Category
  assistance_category VARCHAR(100) NOT NULL,
  
  -- General Damage Assessment
  damage_type VARCHAR(100),
  damage_severity VARCHAR(50) DEFAULT 'Partially Damaged', -- 'Partially Damaged', 'Severely Damaged', 'Fully Destroyed'
  damage_description TEXT,
  current_condition VARCHAR(100), -- 'Habitable', 'Partially Habitable', 'Not Habitable', 'Completely Destroyed'
  estimated_loss NUMERIC(12, 2) DEFAULT 0.00,
  
  -- Conditional: House Damage
  house_ownership VARCHAR(50), -- 'Owned', 'Rented', 'Leased', 'Other'
  house_type VARCHAR(50),      -- 'Concrete/RCC', 'Brick/Masonry', 'Mud/Traditional', 'Temporary', 'Other'
  house_rooms INTEGER,
  house_damage_level VARCHAR(50), -- 'Partial', 'Severe', 'Complete'
  affected_area NUMERIC(10, 2),   -- Square metres
  habitability_status VARCHAR(50),-- 'Safe to occupy', 'Partially safe', 'Unsafe', 'Completely destroyed'
  is_displaced BOOLEAN DEFAULT FALSE,
  current_accommodation VARCHAR(100), -- 'Relief Camp', 'Relative house', 'Temporary shelter', 'Other'
  
  -- Conditional: Crop Loss
  crop_type VARCHAR(100),
  agricultural_land_type VARCHAR(100),
  total_crop_area NUMERIC(10, 2),    -- Hectares
  affected_crop_area NUMERIC(10, 2), -- Hectares
  crop_stage VARCHAR(50),            -- 'Newly planted', 'Growing', 'Flowering', 'Fruiting', 'Ready for harvest', 'Harvested'
  crop_loss_percentage NUMERIC(5, 2),
  
  -- Conditional: Livestock Loss
  livestock_type VARCHAR(100),
  livestock_lost INTEGER DEFAULT 0,
  livestock_injured INTEGER DEFAULT 0,
  
  -- Conditional: Death / Ex-gratia
  deceased_person_name VARCHAR(255),
  legal_heir_relationship VARCHAR(100),
  
  -- Location Details (PostGIS + Geographic Points)
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  affected_location GEOGRAPHY(Point, 4326),
  district VARCHAR(100) NOT NULL,
  locality VARCHAR(255),
  location_verified BOOLEAN DEFAULT TRUE,
  is_in_hazard_zone BOOLEAN DEFAULT FALSE,
  hazard_zone_notes TEXT,
  
  -- Secure Bank / Payment Details
  bank_account_holder VARCHAR(255),
  bank_name VARCHAR(255),
  masked_account_number VARCHAR(50), -- Always masked e.g. 'XXXXXX4821'
  ifsc_code VARCHAR(20),
  account_hash VARCHAR(255),
  
  -- Financial Review & Approvals (Driven strictly by PostgreSQL DB)
  requested_amount NUMERIC(12, 2) DEFAULT 0.00,
  approved_amount NUMERIC(12, 2) DEFAULT 0.00,
  
  -- Status Progression Workflow
  -- SUBMITTED -> UNDER_FIELD_VERIFICATION -> FIELD_VERIFIED -> UNDER_REVIEW -> APPROVED / REJECTED -> PAYMENT_PROCESSING -> DISBURSED -> COMPLETED
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  payment_status VARCHAR(50) DEFAULT 'NOT_INITIATED', -- 'NOT_INITIATED', 'PROCESSING', 'DISBURSED', 'FAILED', 'RETURNED'
  transaction_reference VARCHAR(100),
  disbursed_at TIMESTAMP,
  
  -- Reviewer Remarks
  rejection_reason TEXT,
  field_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  field_remarks TEXT,
  collector_remarks TEXT,
  
  -- Citizen Declaration
  declaration_accepted BOOLEAN DEFAULT FALSE,
  penalty_warning_accepted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial & Filter Indexes
CREATE INDEX IF NOT EXISTS idx_relief_claims_citizen_id ON relief_claims(citizen_id);
CREATE INDEX IF NOT EXISTS idx_relief_claims_status ON relief_claims(status);
CREATE INDEX IF NOT EXISTS idx_relief_claims_district ON relief_claims(district);
CREATE INDEX IF NOT EXISTS idx_relief_claims_incident_id ON relief_claims(incident_id);
CREATE INDEX IF NOT EXISTS idx_relief_claims_claim_id ON relief_claims(claim_id);

-- PostGIS Spatial Index for location queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    CREATE INDEX IF NOT EXISTS idx_relief_claims_location ON relief_claims USING GIST(affected_location);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback if PostGIS GIST syntax varies
END $$;

-- 3. Supporting Documents & Evidence Table
CREATE TABLE IF NOT EXISTS relief_claim_evidence (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES relief_claims(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  evidence_type VARCHAR(100) DEFAULT 'damage_photo', -- 'damage_photo', 'ownership_doc', 'crop_doc', 'livestock_doc', 'other'
  description TEXT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relief_evidence_claim_id ON relief_claim_evidence(claim_id);

-- 4. Complete Audit Trail & Status History Table
CREATE TABLE IF NOT EXISTS relief_claim_status_history (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES relief_claims(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  remarks TEXT,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relief_status_history_claim ON relief_claim_status_history(claim_id);

-- 5. AI Damage Analysis Assessment Table (Decision Support Only)
CREATE TABLE IF NOT EXISTS relief_claim_ai_assessment (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES relief_claims(id) ON DELETE CASCADE,
  assessment_type VARCHAR(100) DEFAULT 'DAMAGE_SEVERITY',
  predicted_damage VARCHAR(50) NOT NULL, -- 'PARTIAL', 'SEVERE', 'TOTAL'
  confidence_score NUMERIC(5, 2) NOT NULL,
  model_version VARCHAR(50) DEFAULT 'sahay-damage-vision-v2.4',
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relief_ai_claim ON relief_claim_ai_assessment(claim_id);

-- 6. Configurable Relief Approval Rules (Administrative authority thresholds)
CREATE TABLE IF NOT EXISTS relief_approval_rules (
  id SERIAL PRIMARY KEY,
  assistance_category VARCHAR(100) NOT NULL,
  disaster_type VARCHAR(100) DEFAULT 'ALL',
  authority_level VARCHAR(50) DEFAULT 'COLLECTOR', -- 'COLLECTOR', 'STATE'
  maximum_amount NUMERIC(12, 2) NOT NULL,
  requires_state_review BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial approval rules if empty
INSERT INTO relief_approval_rules (assistance_category, disaster_type, authority_level, maximum_amount, requires_state_review)
SELECT * FROM (VALUES
  ('Immediate Relief', 'ALL', 'COLLECTOR', 50000.00, FALSE),
  ('Damage Assistance', 'ALL', 'COLLECTOR', 150000.00, FALSE),
  ('Damage Assistance', 'ALL', 'STATE', 1000000.00, TRUE),
  ('Death / Injury Assistance', 'ALL', 'COLLECTOR', 100000.00, FALSE),
  ('Death / Injury Assistance', 'ALL', 'STATE', 500000.00, TRUE),
  ('Recovery Assistance', 'ALL', 'COLLECTOR', 100000.00, FALSE),
  ('Recovery Assistance', 'ALL', 'STATE', 500000.00, TRUE)
) AS v(assistance_category, disaster_type, authority_level, maximum_amount, requires_state_review)
WHERE NOT EXISTS (SELECT 1 FROM relief_approval_rules LIMIT 1);

-- 7. Collector & State Approval History Table
CREATE TABLE IF NOT EXISTS relief_approval_history (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES relief_claims(id) ON DELETE CASCADE,
  approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approver_role VARCHAR(50) NOT NULL,
  decision VARCHAR(50) NOT NULL, -- 'APPROVED', 'REJECTED', 'REVERIFICATION_REQUESTED', 'FORWARDED_TO_STATE'
  amount NUMERIC(12, 2) DEFAULT 0.00,
  remarks TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relief_approval_history_claim ON relief_approval_history(claim_id);

-- 8. Relief Disbursements & DBT Payment Processing Table
CREATE TABLE IF NOT EXISTS relief_disbursements (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES relief_claims(id) ON DELETE CASCADE,
  approved_amount NUMERIC(12, 2) NOT NULL,
  disbursed_amount NUMERIC(12, 2) NOT NULL,
  transaction_reference VARCHAR(100) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'DIRECT_BENEFIT_TRANSFER_DBT',
  payment_status VARCHAR(50) DEFAULT 'DISBURSED', -- 'PENDING', 'PROCESSING', 'DISBURSED', 'FAILED'
  bank_name VARCHAR(255),
  masked_account_number VARCHAR(50),
  ifsc_code VARCHAR(50),
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relief_disbursements_claim ON relief_disbursements(claim_id);

-- 9. Dedicated Field Verifications Table
CREATE TABLE IF NOT EXISTS relief_verifications (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES relief_claims(id) ON DELETE CASCADE,
  officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  inspection_started_at TIMESTAMP,
  inspection_completed_at TIMESTAMP,
  verification_status VARCHAR(50) DEFAULT 'ASSIGNED', -- 'ASSIGNED', 'IN_PROGRESS', 'VERIFIED', 'REVERIFICATION_REQUESTED'
  applicant_verified BOOLEAN DEFAULT TRUE,
  location_verified BOOLEAN DEFAULT TRUE,
  officer_latitude NUMERIC(10, 6),
  officer_longitude NUMERIC(10, 6),
  gps_accuracy_meters NUMERIC(6, 2) DEFAULT 5.00,
  distance_from_reported_meters NUMERIC(10, 2) DEFAULT 0.00,
  damage_observed TEXT,
  verified_damage_severity VARCHAR(50),
  verified_loss_estimate NUMERIC(12, 2) DEFAULT 0.00,
  recommended_assistance NUMERIC(12, 2) DEFAULT 0.00,
  officer_remarks TEXT,
  reverification_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relief_verifications_claim ON relief_verifications(claim_id);

-- 10. Ensure new operational columns on relief_claims
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS taluk VARCHAR(100);
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS village VARCHAR(100);
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS verified_loss NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS assigned_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'MEDIUM';
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS reverification_reason TEXT;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS reverification_instructions TEXT;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS reverification_evidence_required TEXT;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS is_state_review_required BOOLEAN DEFAULT FALSE;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS forwarded_to_state_at TIMESTAMP;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS payment_processing_at TIMESTAMP;

-- 11. Ensure field evidence tracking columns on relief_claim_evidence
ALTER TABLE relief_claim_evidence ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'CITIZEN';
ALTER TABLE relief_claim_evidence ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
ALTER TABLE relief_claim_evidence ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
ALTER TABLE relief_claim_evidence ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE relief_claim_evidence ADD COLUMN IF NOT EXISTS officer_name VARCHAR(255);

-- 12. Ensure SDRF Norms and Calculation Audit Columns
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS norm_code VARCHAR(50);
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS norm_title VARCHAR(255);
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS property_type VARCHAR(100) DEFAULT 'ALL';
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS geographic_zone VARCHAR(50) DEFAULT 'ALL';
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS min_damage_percentage NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS max_damage_percentage NUMERIC(5, 2) DEFAULT 100;
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS rate_per_unit NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Unit';
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS max_units NUMERIC(10, 2);
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS maximum_ceiling NUMERIC(12, 2);
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS rule_version VARCHAR(50) DEFAULT 'SDRF-2023-26-v2.1';
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS statutory_reference VARCHAR(255);
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS eligibility_conditions TEXT;
ALTER TABLE relief_norms ADD COLUMN IF NOT EXISTS calculation_formula VARCHAR(100) DEFAULT 'RATE_MULTIPLIED_BY_QUANTITY';

ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS sdrf_norm_id INTEGER;
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS sdrf_norm_code VARCHAR(50);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS sdrf_rule_version VARCHAR(50);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS damage_category VARCHAR(100);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS damage_percentage NUMERIC(5, 2);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS property_type VARCHAR(100);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS geographic_zone VARCHAR(50);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS affected_quantity NUMERIC(10, 2);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS affected_unit VARCHAR(50);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS prescribed_rate NUMERIC(12, 2);
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS calculation_basis TEXT;
ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS sdrf_assessment_details JSONB DEFAULT '{}'::jsonb;

ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_norm_reference VARCHAR(100);
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_rule_version VARCHAR(50);
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_calculation_summary TEXT;
ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_assessment_details JSONB DEFAULT '{}'::jsonb;

