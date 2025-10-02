export const kimballPatterns = {
  scd_type1: {
    id: 'kimball_scd_type1',
    name: 'Slowly Changing Dimension - Type 1',
    category: 'kimball',
    description: 'Overwrite dimension attributes on change (no history)',
    databricks_optimizations: {
      liquid_clustering: ['{dimension}_natural_key'],
      delta_features: ['change_data_feed'],
    },
    structure: {
      required_columns: [
        {
          name: '{dimension}_key',
          type: 'BIGINT',
          description: 'Surrogate key',
          constraint: 'GENERATED ALWAYS AS IDENTITY',
        },
        {
          name: '{dimension}_natural_key',
          type: 'STRING',
          description: 'Business key',
          constraint: 'NOT NULL',
        },
        {
          name: 'last_updated',
          type: 'TIMESTAMP',
          description: 'When record was last updated',
          constraint: 'NOT NULL DEFAULT CURRENT_TIMESTAMP()',
        },
      ],
    },
    jinja_template: `CREATE TABLE {{ catalog }}.{{ schema }}.dim_{{ dimension_name }}
(
  {{ dimension_name }}_key BIGINT GENERATED ALWAYS AS IDENTITY,
  {{ dimension_name }}_natural_key STRING NOT NULL,
  {% for attr in attributes %}
  {{ attr.name }} {{ attr.type }}{% if attr.nullable %} NULL{% endif %},
  {% endfor %}
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_dim_{{ dimension_name }} PRIMARY KEY({{ dimension_name }}_key),
  CONSTRAINT uk_dim_{{ dimension_name }} UNIQUE({{ dimension_name }}_natural_key)
)
USING DELTA
CLUSTER BY ({{ dimension_name }}_natural_key)
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);`,
  },

  scd_type2: {
    id: 'kimball_scd_type2',
    name: 'Slowly Changing Dimension - Type 2',
    category: 'kimball',
    description: 'Track historical changes with effective dates',
    databricks_optimizations: {
      z_order: ['{dimension}_natural_key'],
      delta_features: ['change_data_feed'],
      partitioning: {
        columns: ['effective_date'],
        strategy: "date_trunc('month', effective_date)",
      },
    },
    structure: {
      required_columns: [
        {
          name: '{dimension}_key',
          type: 'BIGINT',
          description: 'Surrogate key (unique for each version)',
          constraint: 'GENERATED ALWAYS AS IDENTITY',
        },
        {
          name: '{dimension}_natural_key',
          type: 'STRING',
          description: 'Business key',
          constraint: 'NOT NULL',
        },
        {
          name: 'effective_date',
          type: 'DATE',
          description: 'When this version became effective',
          constraint: 'NOT NULL',
        },
        {
          name: 'end_date',
          type: 'DATE',
          description: 'When this version expired (NULL for current)',
        },
        {
          name: 'is_current',
          type: 'BOOLEAN',
          description: 'Flag for current version',
          constraint: 'NOT NULL DEFAULT true',
        },
        {
          name: 'version_number',
          type: 'INT',
          description: 'Version sequence number',
          constraint: 'NOT NULL DEFAULT 1',
        },
      ],
    },
    jinja_template: `CREATE TABLE {{ catalog }}.{{ schema }}.dim_{{ dimension_name }}
(
  {{ dimension_name }}_key BIGINT GENERATED ALWAYS AS IDENTITY,
  {{ dimension_name }}_natural_key STRING NOT NULL,
  {% for attr in attributes %}
  {{ attr.name }} {{ attr.type }}{% if attr.nullable %} NULL{% endif %},
  {% endfor %}
  effective_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  version_number INT NOT NULL DEFAULT 1,
  CONSTRAINT pk_dim_{{ dimension_name }} PRIMARY KEY({{ dimension_name }}_key)
)
USING DELTA
PARTITIONED BY (effective_date)
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Optimize for lookup by natural key
OPTIMIZE {{ catalog }}.{{ schema }}.dim_{{ dimension_name }}
ZORDER BY ({{ dimension_name }}_natural_key);`,
  },

  fact_table: {
    id: 'kimball_fact',
    name: 'Fact Table',
    category: 'kimball',
    description: 'Transactional or aggregated measures with dimension references',
    databricks_optimizations: {
      liquid_clustering: ['date_key'],
      delta_features: ['change_data_feed', 'deletion_vectors'],
      partitioning: {
        columns: ['date_key'],
        strategy: 'date_key',
      },
    },
    structure: {
      required_columns: [
        {
          name: 'fact_key',
          type: 'BIGINT',
          description: 'Surrogate key for fact (optional)',
          constraint: 'GENERATED ALWAYS AS IDENTITY',
        },
        {
          name: 'date_key',
          type: 'DATE',
          description: 'Date foreign key',
          constraint: 'NOT NULL',
        },
      ],
      dynamic_columns: 'Dimension foreign keys and measures',
    },
    jinja_template: `CREATE TABLE {{ catalog }}.{{ schema }}.fact_{{ fact_name }}
(
  {% if include_fact_key %}
  fact_key BIGINT GENERATED ALWAYS AS IDENTITY,
  {% endif %}
  date_key DATE NOT NULL,
  {% for dim in dimensions %}
  {{ dim }}_key BIGINT NOT NULL,
  {% endfor %}
  {% for measure in measures %}
  {{ measure.name }} {{ measure.type }} {% if not measure.nullable %}NOT NULL{% endif %},
  {% endfor %}
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
  {% if include_fact_key %}
  , CONSTRAINT pk_fact_{{ fact_name }} PRIMARY KEY(fact_key)
  {% endif %}
  {% for dim in dimensions %}
  , CONSTRAINT fk_fact_{{ fact_name }}_{{ dim }} FOREIGN KEY({{ dim }}_key) REFERENCES {{ catalog }}.{{ schema }}.dim_{{ dim }}({{ dim }}_key)
  {% endfor %}
)
USING DELTA
CLUSTER BY (date_key)
PARTITIONED BY (date_key)
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.enableDeletionVectors' = 'true'
);`,
  },

  bridge_table: {
    id: 'kimball_bridge',
    name: 'Bridge Table',
    category: 'kimball',
    description: 'Resolve many-to-many relationships between facts and dimensions',
    databricks_optimizations: {
      liquid_clustering: ['group_key'],
      delta_features: ['change_data_feed'],
    },
    structure: {
      required_columns: [
        {
          name: 'group_key',
          type: 'BIGINT',
          description: 'Key representing the group',
          constraint: 'NOT NULL',
        },
        {
          name: 'member_key',
          type: 'BIGINT',
          description: 'Individual member within group',
          constraint: 'NOT NULL',
        },
        {
          name: 'weight_factor',
          type: 'DECIMAL(10,4)',
          description: 'Allocation percentage (optional)',
          constraint: 'DEFAULT 1.0',
        },
      ],
    },
    jinja_template: `CREATE TABLE {{ catalog }}.{{ schema }}.bridge_{{ bridge_name }}
(
  group_key BIGINT NOT NULL,
  member_key BIGINT NOT NULL,
  {% if include_weight %}
  weight_factor DECIMAL(10,4) NOT NULL DEFAULT 1.0,
  {% endif %}
  effective_date DATE NOT NULL,
  end_date DATE,
  CONSTRAINT pk_bridge_{{ bridge_name }} PRIMARY KEY(group_key, member_key, effective_date)
)
USING DELTA
CLUSTER BY (group_key)
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);`,
  },
};
