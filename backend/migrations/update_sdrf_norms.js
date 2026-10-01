const pool = require('../db');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting SDRF Norms & Verification Schema Migration...');

    // 1. Alter relief_norms table to support rich government SDRF rule configuration
    await client.query(`
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
    `);

    // 2. Alter relief_verifications table for SDRF assessment tracking
    await client.query(`
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
    `);

    // 3. Alter relief_claims table for SDRF norm references
    await client.query(`
      ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_norm_reference VARCHAR(100);
      ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_rule_version VARCHAR(50);
      ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_calculation_summary TEXT;
      ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS sdrf_assessment_details JSONB DEFAULT '{}'::jsonb;
    `);

    console.log('✓ Table columns verified and expanded');

    // 4. Seed or Upsert Official Government SDRF Norms
    const sdrfNorms = [
      {
        norm_code: 'SDRF-HOUSE-PUCCA-FULL-PLAINS',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Fully Destroyed / Severely Damaged Pucca House (Plains)',
        property_type: 'Pucca / Concrete / Brick',
        geographic_zone: 'Plains',
        min_damage_percentage: 75,
        max_damage_percentage: 100,
        rate_per_unit: 120000.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 120000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(i) - Plains',
        eligibility_conditions: 'Complete structural collapse or damage >= 75% rendering permanent house uninhabitable in plain areas.',
        norm_description: 'Ex-gratia relief for fully destroyed or washed-away permanent concrete/brick residential house in plain areas.'
      },
      {
        norm_code: 'SDRF-HOUSE-PUCCA-FULL-HILLS',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Fully Destroyed / Severely Damaged Pucca House (Hilly Areas)',
        property_type: 'Pucca / Concrete / Brick',
        geographic_zone: 'Hilly',
        min_damage_percentage: 75,
        max_damage_percentage: 100,
        rate_per_unit: 130000.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 130000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(i) - Hilly Areas',
        eligibility_conditions: 'Complete collapse or damage >= 75% due to landslides or floods in designated hilly/high-altitude terrain.',
        norm_description: 'Ex-gratia assistance for completely destroyed pucca house located in hilly/mountainous terrain.'
      },
      {
        norm_code: 'SDRF-HOUSE-KUTCHA-FULL-PLAINS',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Fully Destroyed Kutcha / Traditional House (Plains)',
        property_type: 'Kutcha / Mud / Traditional / Wood',
        geographic_zone: 'Plains',
        min_damage_percentage: 75,
        max_damage_percentage: 100,
        rate_per_unit: 80000.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 80000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(ii) - Plains',
        eligibility_conditions: 'Total collapse >= 75% of mud, thatch, or bamboo/timber structure in plain areas.',
        norm_description: 'Ex-gratia grant for fully destroyed kutcha/mud house in plain areas.'
      },
      {
        norm_code: 'SDRF-HOUSE-KUTCHA-FULL-HILLS',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Fully Destroyed Kutcha / Traditional House (Hilly Areas)',
        property_type: 'Kutcha / Mud / Traditional / Wood',
        geographic_zone: 'Hilly',
        min_damage_percentage: 75,
        max_damage_percentage: 100,
        rate_per_unit: 95000.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 95000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(ii) - Hilly Areas',
        eligibility_conditions: 'Total collapse >= 75% in designated hilly terrain.',
        norm_description: 'Ex-gratia grant for fully destroyed kutcha house in designated hilly terrain.'
      },
      {
        norm_code: 'SDRF-HOUSE-PUCCA-PARTIAL-SEVERE',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Severely Damaged Pucca House (Substantial Structural Repair)',
        property_type: 'Pucca / Concrete / Brick',
        geographic_zone: 'ALL',
        min_damage_percentage: 40,
        max_damage_percentage: 74,
        rate_per_unit: 40000.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 40000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(iii)',
        eligibility_conditions: 'Major structural damage between 40% and 74%, roof/wall failure requiring substantial civil restoration.',
        norm_description: 'Structural repair assistance for severely damaged permanent residential house.'
      },
      {
        norm_code: 'SDRF-HOUSE-KUTCHA-PARTIAL-SEVERE',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Severely Damaged Kutcha House',
        property_type: 'Kutcha / Mud / Traditional / Wood',
        geographic_zone: 'ALL',
        min_damage_percentage: 40,
        max_damage_percentage: 74,
        rate_per_unit: 25000.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 25000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(iv)',
        eligibility_conditions: 'Substantial structural wall/roof failure between 40% and 74%.',
        norm_description: 'Repair assistance for severely damaged kutcha residential structure.'
      },
      {
        norm_code: 'SDRF-HOUSE-PUCCA-PARTIAL-MINOR',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Partially Damaged Pucca House (Minor Repair & Desilting)',
        property_type: 'Pucca / Concrete / Brick',
        geographic_zone: 'ALL',
        min_damage_percentage: 15,
        max_damage_percentage: 39,
        rate_per_unit: 15000.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 15000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(v)',
        eligibility_conditions: 'Verified partial damage between 15% and 39%, water inundation, desilting, or plaster crack repairs.',
        norm_description: 'Assistance for partial damage repair and desilting of permanent houses.'
      },
      {
        norm_code: 'SDRF-HOUSE-KUTCHA-PARTIAL-MINOR',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Partially Damaged Kutcha House (Minor Repair)',
        property_type: 'Kutcha / Mud / Traditional / Wood',
        geographic_zone: 'ALL',
        min_damage_percentage: 15,
        max_damage_percentage: 39,
        rate_per_unit: 6500.00,
        unit: 'House',
        max_units: 1,
        maximum_ceiling: 6500.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(vi)',
        eligibility_conditions: 'Verified damage between 15% and 39% for mud/traditional dwellings.',
        norm_description: 'Minor repair assistance for partially damaged kutcha dwellings.'
      },
      {
        norm_code: 'SDRF-HOUSE-HUT-FULL',
        assistance_category: 'Damage Assistance',
        damage_category: 'House Damage',
        norm_title: 'Completely Destroyed Hut / Temporary Shack',
        property_type: 'Slum Hut / Temporary Shack',
        geographic_zone: 'ALL',
        min_damage_percentage: 50,
        max_damage_percentage: 100,
        rate_per_unit: 8000.00,
        unit: 'Hut',
        max_units: 1,
        maximum_ceiling: 8000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 3(a)(vii)',
        eligibility_conditions: 'Complete destruction of temporary hut/shack occupied by vulnerable low-income families.',
        norm_description: 'Ex-gratia rebuilding grant for completely damaged hut/shack.'
      },
      {
        norm_code: 'SDRF-CROP-RAINFED',
        assistance_category: 'Damage Assistance',
        damage_category: 'Agricultural / Crop Loss',
        norm_title: 'Input Subsidy for Rainfed Crop Loss',
        property_type: 'Rainfed Land',
        geographic_zone: 'ALL',
        min_damage_percentage: 33,
        max_damage_percentage: 100,
        rate_per_unit: 8500.00,
        unit: 'Hectare',
        max_units: 2.0,
        maximum_ceiling: 17000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 4(a)',
        eligibility_conditions: 'Verified crop yield loss >= 33% due to drought, flood, or pest attack on rainfed land. Statutory ceiling 2 hectares per farmer.',
        norm_description: 'Input subsidy for rain-fed crop loss (minimum 33% damage threshold).'
      },
      {
        norm_code: 'SDRF-CROP-IRRIGATED',
        assistance_category: 'Damage Assistance',
        damage_category: 'Agricultural / Crop Loss',
        norm_title: 'Input Subsidy for Irrigated Crop Loss',
        property_type: 'Irrigated Land',
        geographic_zone: 'ALL',
        min_damage_percentage: 33,
        max_damage_percentage: 100,
        rate_per_unit: 17000.00,
        unit: 'Hectare',
        max_units: 2.0,
        maximum_ceiling: 34000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 4(b)',
        eligibility_conditions: 'Verified crop yield loss >= 33% on irrigated agricultural land. Statutory ceiling 2 hectares per farmer.',
        norm_description: 'Agricultural input subsidy for irrigated crop loss (minimum 33% damage threshold).'
      },
      {
        norm_code: 'SDRF-CROP-PERENNIAL',
        assistance_category: 'Damage Assistance',
        damage_category: 'Agricultural / Crop Loss',
        norm_title: 'Input Subsidy for Perennial / Plantation Crops',
        property_type: 'Perennial / Plantation Crops',
        geographic_zone: 'ALL',
        min_damage_percentage: 33,
        max_damage_percentage: 100,
        rate_per_unit: 22500.00,
        unit: 'Hectare',
        max_units: 2.0,
        maximum_ceiling: 45000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 4(c)',
        eligibility_conditions: 'Verified damage >= 33% to perennial, plantation, or commercial crops. Statutory ceiling 2 hectares.',
        norm_description: 'Subsidy for perennial horticultural and plantation crops (minimum 33% loss).'
      },
      {
        norm_code: 'SDRF-LIVE-MILCH-LARGE',
        assistance_category: 'Damage Assistance',
        damage_category: 'Livestock Loss',
        norm_title: 'Loss of Large Milch Animals (Cow / Buffalo)',
        property_type: 'Milch Cattle / Buffalo',
        geographic_zone: 'ALL',
        min_damage_percentage: 100,
        max_damage_percentage: 100,
        rate_per_unit: 37500.00,
        unit: 'Animal',
        max_units: 3.0,
        maximum_ceiling: 112500.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 5(a)',
        eligibility_conditions: 'Verified death/wash-away of large milch animal with veterinary officer post-mortem or certification. Max 3 animals per household.',
        norm_description: 'Replacement assistance for loss of milch cow or buffalo (max 3 animals per family).'
      },
      {
        norm_code: 'SDRF-LIVE-SMALL',
        assistance_category: 'Damage Assistance',
        damage_category: 'Livestock Loss',
        norm_title: 'Loss of Small Animals (Sheep / Goat / Pig)',
        property_type: 'Goat / Sheep / Pig',
        geographic_zone: 'ALL',
        min_damage_percentage: 100,
        max_damage_percentage: 100,
        rate_per_unit: 4000.00,
        unit: 'Animal',
        max_units: 30.0,
        maximum_ceiling: 120000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 5(b)',
        eligibility_conditions: 'Verified mortality of small livestock. Maximum 30 animals per family.',
        norm_description: 'Compensation for small livestock loss per animal.'
      },
      {
        norm_code: 'SDRF-LIVE-POULTRY',
        assistance_category: 'Damage Assistance',
        damage_category: 'Livestock Loss',
        norm_title: 'Loss of Poultry Birds',
        property_type: 'Commercial / Backyard Poultry',
        geographic_zone: 'ALL',
        min_damage_percentage: 100,
        max_damage_percentage: 100,
        rate_per_unit: 100.00,
        unit: 'Bird',
        max_units: 100.0,
        maximum_ceiling: 10000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 5(c)',
        eligibility_conditions: 'Loss of domestic or backyard poultry. Maximum ceiling ₹10,000 per family unit.',
        norm_description: 'Ex-gratia relief for poultry bird mortality due to disaster.'
      },
      {
        norm_code: 'SDRF-FISH-BOAT-FULL',
        assistance_category: 'Damage Assistance',
        damage_category: 'Fisheries / Boat & Craft Loss',
        norm_title: 'Fully Damaged Fishing Boat / Craft',
        property_type: 'Boat / Fishing Craft (Fully Damaged)',
        geographic_zone: 'ALL',
        min_damage_percentage: 75,
        max_damage_percentage: 100,
        rate_per_unit: 30000.00,
        unit: 'Craft',
        max_units: 1.0,
        maximum_ceiling: 30000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 6(a)',
        eligibility_conditions: 'Verified complete destruction or loss of traditional/motorized fishing craft.',
        norm_description: 'Replacement grant for fully damaged fishing boat or catamaran.'
      },
      {
        norm_code: 'SDRF-FISH-NET-PARTIAL',
        assistance_category: 'Damage Assistance',
        damage_category: 'Fisheries / Boat & Craft Loss',
        norm_title: 'Damaged / Lost Fishing Net & Gear',
        property_type: 'Net / Fishing Gear (Partially Damaged)',
        geographic_zone: 'ALL',
        min_damage_percentage: 25,
        max_damage_percentage: 100,
        rate_per_unit: 10000.00,
        unit: 'Net Set',
        max_units: 1.0,
        maximum_ceiling: 10000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 6(b)',
        eligibility_conditions: 'Loss or partial destruction of fishing nets and operational gear.',
        norm_description: 'Assistance for repair/replacement of damaged fishing nets.'
      },
      {
        norm_code: 'SDRF-ARTISAN-EQUIP',
        assistance_category: 'Damage Assistance',
        damage_category: 'Handicrafts / Artisans / Micro-Enterprise',
        norm_title: 'Artisan Equipment & Tool Restoration',
        property_type: 'Artisan Equipment / Raw Materials',
        geographic_zone: 'ALL',
        min_damage_percentage: 33,
        max_damage_percentage: 100,
        rate_per_unit: 15000.00,
        unit: 'Artisan Unit',
        max_units: 1.0,
        maximum_ceiling: 15000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 7(a)',
        eligibility_conditions: 'Registered or verified traditional artisan/handloom/potter whose tools were destroyed.',
        norm_description: 'Ex-gratia assistance to artisans for replacement of damaged tools and equipment.'
      },
      {
        norm_code: 'SDRF-CLOTHING-UTENSILS',
        assistance_category: 'Immediate Relief',
        damage_category: 'Immediate Gratuitous Relief / Essential Items',
        norm_title: 'Loss of Clothing & Household Utensils',
        property_type: 'Family Household',
        geographic_zone: 'ALL',
        min_damage_percentage: 0,
        max_damage_percentage: 100,
        rate_per_unit: 10000.00,
        unit: 'Family Unit',
        max_units: 1.0,
        maximum_ceiling: 10000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 2(a)',
        eligibility_conditions: 'Families whose houses have been washed away or submerged causing loss of clothing and utensils.',
        norm_description: 'Immediate relief grant for lost personal clothing and essential cooking utensils.'
      },
      {
        norm_code: 'SDRF-EMERGENCY-RATIONS',
        assistance_category: 'Immediate Relief',
        damage_category: 'Immediate Gratuitous Relief / Essential Items',
        norm_title: 'Emergency Food Supplies & Dry Rations',
        property_type: 'Family Household',
        geographic_zone: 'ALL',
        min_damage_percentage: 0,
        max_damage_percentage: 100,
        rate_per_unit: 5000.00,
        unit: 'Family Unit',
        max_units: 1.0,
        maximum_ceiling: 5000.00,
        rule_version: 'SDRF-2023-26-v2.1',
        statutory_reference: 'MHA SDRF Schedule Item 2(b)',
        eligibility_conditions: 'Immediate gratuitous subsistence support for disaster-affected families without food resources.',
        norm_description: 'Gratuitous relief for emergency food provisions.'
      }
    ];

    for (const norm of sdrfNorms) {
      const existing = await client.query('SELECT id FROM relief_norms WHERE norm_code = $1', [norm.norm_code]);
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE relief_norms SET
            assistance_category = $1,
            damage_category = $2,
            norm_title = $3,
            property_type = $4,
            geographic_zone = $5,
            min_damage_percentage = $6,
            max_damage_percentage = $7,
            rate_per_unit = $8,
            unit = $9,
            max_units = $10,
            maximum_ceiling = $11,
            maximum_amount = $11,
            rule_version = $12,
            statutory_reference = $13,
            eligibility_conditions = $14,
            norm_description = $15,
            is_active = TRUE
          WHERE norm_code = $16;
        `, [
          norm.assistance_category,
          norm.damage_category,
          norm.norm_title,
          norm.property_type,
          norm.geographic_zone,
          norm.min_damage_percentage,
          norm.max_damage_percentage,
          norm.rate_per_unit,
          norm.unit,
          norm.max_units,
          norm.maximum_ceiling,
          norm.rule_version,
          norm.statutory_reference,
          norm.eligibility_conditions,
          norm.norm_description,
          norm.norm_code
        ]);
      } else {
        await client.query(`
          INSERT INTO relief_norms (
            norm_code, assistance_category, damage_category, norm_title, property_type, geographic_zone,
            min_damage_percentage, max_damage_percentage, rate_per_unit, unit, max_units, maximum_ceiling,
            maximum_amount, rule_version, statutory_reference, eligibility_conditions, norm_description, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, $14, $15, $16, TRUE);
        `, [
          norm.norm_code,
          norm.assistance_category,
          norm.damage_category,
          norm.norm_title,
          norm.property_type,
          norm.geographic_zone,
          norm.min_damage_percentage,
          norm.max_damage_percentage,
          norm.rate_per_unit,
          norm.unit,
          norm.max_units,
          norm.maximum_ceiling,
          norm.rule_version,
          norm.statutory_reference,
          norm.eligibility_conditions,
          norm.norm_description
        ]);
      }
    }

    console.log(`✓ ${sdrfNorms.length} Official Government SDRF Norms configured and synchronized in database.`);
  } catch (err) {
    console.error('❌ Migration Error:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

runMigration().then(() => {
  console.log('✨ Migration completed successfully.');
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
