const schemas = {
  // this is to define the schema of all user defined schemas
  system_schema_structure: {
    name: "schema_doc",
    schema: {
      type: "object",
      additionalProperties: true,
      properties: {
        name: {
          type: "string",
          minLength: 5,
          maxLength: 50,
          pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
        },
        properties: {
          type: "object",
          additionalProperties: true,
          minProperties: 1,
          maxProperties: 20,
        },
        settings: {
          type: "object",
          additionalProperties: true,
          properties: {
            primary_key: {
              type: "array",
              default: [],
              items: {
                type: "string",
              },
              maxItems: 10,
            },
            editable_fields: {
              type: "array",
              default: [],
              items: {
                type: "string",
              },
              maxItems: 20,
            },
            single_record: {
              type: "boolean",
              default: false,
              description:
                "If set, only a single records with this schema will be allowed to insert in the database",
            },
          },
        },
      },
      required: ["name", "schema", "settings"],
    },
    settings: {
      primary_key: ["name"],
      editable_fields: ["schema", "settings"],
    },
  },
  system_logs: {},
  system_tags: {},
  system_secrets: {},
  system_keys: {},
  system_relations: {},
  system_scripts: {},
  system_settings: {},
};

const sample_schemas = {};

module.exports.schemas = schemas;
module.exports.sample_schemas = sample_schemas;

this.sample_schema = {
  name: "my_contact",
  schema: {
    title: "People",
    type: "object",
    properties: {
      name: {
        type: "string",
      },
      emails: {
        type: "array",
        items: {
          type: "string",
          format: "email",
        },
      },
      phones: {
        type: "array",
        items: {
          type: "string",
        },
      },
      address: {
        type: "string",
      },
      notes: {
        type: "string",
      },
      birth_date: {
        type: "string",
        format: "date",
      },
      company: {
        type: "string",
      },
      website: {
        type: "string",
        format: "uri",
      },
      socialMedia: {
        type: "object",
        properties: {
          twitter: { type: "string" },
          facebook: { type: "string" },
          linkedin: { type: "string" },
        },
      },
      gender: {
        type: "string",
        enum: ["male", "female", "other"],
      },
      maritalStatus: {
        type: "string",
        enum: ["single", "married", "divorced", "widowed", "other"],
      },
      hobbies: {
        type: "array",
        items: {
          type: "string",
        },
      },
      languages: {
        type: "array",
        items: {
          type: "string",
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            year: { type: "integer" },
          },
          required: ["degree", "institution", "year"],
        },
      },
      skills: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    required: ["name"],
  },
  settings: {
    primary_key: ["name"],
  },
};
