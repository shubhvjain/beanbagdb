const schema_schema = {
  name: "schema",
  schema: {
    type: "object",
    additionalProperties: true,
    properties: {
      title: {
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
};

const system_schemas = {
  logs: {
    name: "system_logs",
    schema: {
      type: "object",
      additionalProperties: true,
      properties: {
        logs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
    settings: {
      primary_key: ["name"],
      single_record: true
    },
  },
  keys: {
    name: "system_keys",
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
        value: {
          type: "string",
          minLength: 5,
          maxLength: 5000,
          pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
        },
        note: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
        },
      },
    },
    settings: {
      primary_key: ["name"],
    },
  },
  settings: {
    name: "system_settings",
    schema: {
      type: "object",
      additionalProperties: true,
      properties: {
        name: {
          type: "string",
          minLength: 5,
          maxLength: 250,
          pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
        },
        value: {
          type: "string",
          minLength: 5,
          maxLength: 5000,
          pattern: "^[^\n\r]*$",
          description:"Must be a single line string"
        },
        user_editable: {
          type: "boolean",
          default: true,
          description:
            "Whether this setting is editable by the user or only by the system",
        },
      },
    },
    settings: {
      primary_key: ["name"],
      editable_fields: ["value"],
    },
  },
};

const sample_schema = {
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

// const sample_schemas = {};
module.exports.system_schemas = system_schemas;
module.exports.schema_schema = schema_schema;
module.exports.sample_schemas = sample_schema;
