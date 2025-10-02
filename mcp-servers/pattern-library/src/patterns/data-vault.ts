export const dataVaultPatterns = {
  hub: {
    id: 'dv_hub',
    name: 'Data Vault Hub',
    category: 'data_vault',
    description: 'Core business entity with unique business key',
    databricks_optimizations: {
      liquid_clustering: ['{entity}_hub_key'],
      delta_features: ['change_data_feed', 'deletion_vectors'],
      partitioning: {
        columns: ['load_date'],
        strategy: "date_trunc('day', load_date)",
      },
    },
    structure: {
      required_columns: [
        {
          name: '{entity}_hub_key',
          type: 'BIGINT',
          description: 'Surrogate key (sequence or hash)',
          constraint: 'GENERATED ALWAYS AS IDENTITY',
        },
        {
          name: '{entity}_business_key',
          type: 'STRING',
          description: 'Natural business key',
          constraint: 'NOT NULL',
        },
        {
          name: 'load_date',
          type: 'TIMESTAMP',
          description: 'When record loaded',
          constraint: 'NOT NULL DEFAULT CURRENT_TIMESTAMP()',
        },
        {
          name: 'record_source',
          type: 'STRING',
          description: 'Source system identifier',
          constraint: 'NOT NULL',
        },
      ],
      constraints: [
        {
          type: 'primary_key',
          columns: ['{entity}_hub_key'],
        },
        {
          type: 'unique',
          columns: ['{entity}_business_key'],
        },
      ],
    },
    jinja_template: `CREATE TABLE {{ catalog }}.{{ schema }}.hub_{{ entity_name }}
(
  {{ entity_name }}_hub_key BIGINT GENERATED ALWAYS AS IDENTITY,
  {{ entity_name }}_business_key STRING NOT NULL,
  load_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  record_source STRING NOT NULL,
  CONSTRAINT pk_hub_{{ entity_name }} PRIMARY KEY({{ entity_name }}_hub_key),
  CONSTRAINT uk_hub_{{ entity_name }} UNIQUE({{ entity_name }}_business_key)
)
USING DELTA
CLUSTER BY ({{ entity_name }}_hub_key)
PARTITIONED BY (DATE(load_date))
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.enableDeletionVectors' = 'true'
);`,
  },

  link: {
    id: 'dv_link',
    name: 'Data Vault Link',
    category: 'data_vault',
    description: 'Many-to-many relationship between hubs',
    databricks_optimizations: {
      liquid_clustering: ['link_key'],
      delta_features: ['change_data_feed'],
      partitioning: {
        columns: ['load_date'],
        strategy: "date_trunc('day', load_date)",
      },
    },
    structure: {
      required_columns: [
        {
          name: 'link_key',
          type: 'BIGINT',
          description: 'Surrogate key for link',
          constraint: 'GENERATED ALWAYS AS IDENTITY',
        },
        {
          name: 'load_date',
          type: 'TIMESTAMP',
          description: 'When record loaded',
          constraint: 'NOT NULL DEFAULT CURRENT_TIMESTAMP()',
        },
        {
          name: 'record_source',
          type: 'STRING',
          description: 'Source system identifier',
          constraint: 'NOT NULL',
        },
      ],
      dynamic_columns: '{entity}_hub_key for each linked hub',
    },
    jinja_template: `CREATE TABLE {{ catalog }}.{{ schema }}.link_{{ link_name }}
(
  link_key BIGINT GENERATED ALWAYS AS IDENTITY,
  {% for hub in hubs %}
  {{ hub }}_hub_key BIGINT NOT NULL,
  {% endfor %}
  load_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  record_source STRING NOT NULL,
  CONSTRAINT pk_link_{{ link_name }} PRIMARY KEY(link_key),
  CONSTRAINT uk_link_{{ link_name }} UNIQUE({% for hub in hubs %}{{ hub }}_hub_key{% if not loop.last %}, {% endif %}{% endfor %})
  {% for hub in hubs %}
  , CONSTRAINT fk_link_{{ link_name }}_{{ hub }} FOREIGN KEY({{ hub }}_hub_key) REFERENCES {{ catalog }}.{{ schema }}.hub_{{ hub }}({{ hub }}_hub_key)
  {% endfor %}
)
USING DELTA
CLUSTER BY (link_key)
PARTITIONED BY (DATE(load_date))
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);`,
  },

  satellite: {
    id: 'dv_satellite',
    name: 'Data Vault Satellite',
    category: 'data_vault',
    description: 'Descriptive attributes with history tracking',
    databricks_optimizations: {
      liquid_clustering: ['{parent}_hub_key', 'load_date'],
      delta_features: ['change_data_feed'],
      partitioning: {
        columns: ['load_date'],
        strategy: "date_trunc('day', load_date)",
      },
    },
    structure: {
      required_columns: [
        {
          name: '{parent}_hub_key',
          type: 'BIGINT',
          description: 'Foreign key to parent hub',
          constraint: 'NOT NULL',
        },
        {
          name: 'load_date',
          type: 'TIMESTAMP',
          description: 'Effective date of this version',
          constraint: 'NOT NULL',
        },
        {
          name: 'load_end_date',
          type: 'TIMESTAMP',
          description: 'End date of this version',
        },
        {
          name: 'hash_diff',
          type: 'STRING',
          description: 'Hash of attribute values for change detection',
          constraint: 'NOT NULL',
        },
        {
          name: 'record_source',
          type: 'STRING',
          description: 'Source system identifier',
          constraint: 'NOT NULL',
        },
      ],
      dynamic_columns: 'Descriptive attributes from source',
    },
    jinja_template: `CREATE TABLE {{ catalog }}.{{ schema }}.sat_{{ satellite_name }}
(
  {{ parent }}_hub_key BIGINT NOT NULL,
  load_date TIMESTAMP NOT NULL,
  load_end_date TIMESTAMP,
  hash_diff STRING NOT NULL,
  record_source STRING NOT NULL,
  {% for attr in attributes %}
  {{ attr.name }} {{ attr.type }}{% if attr.nullable %} NULL{% endif %},
  {% endfor %}
  CONSTRAINT pk_sat_{{ satellite_name }} PRIMARY KEY({{ parent }}_hub_key, load_date),
  CONSTRAINT fk_sat_{{ satellite_name }} FOREIGN KEY({{ parent }}_hub_key) REFERENCES {{ catalog }}.{{ schema }}.hub_{{ parent }}({{ parent }}_hub_key)
)
USING DELTA
CLUSTER BY ({{ parent }}_hub_key, load_date)
PARTITIONED BY (DATE(load_date))
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);`,
  },
};
