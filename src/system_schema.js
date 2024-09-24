export const schema_schema = {
  name: "schema",
  description:"Meta-schema or schema for defining other schemas",
  system_generated:true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      system_generated:{
        type:"boolean",
        default:false
      },
      name: {
        type: "string",
        minLength: 5,
        maxLength: 50,
        pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
        description:"This is the name of the schema.It cannot be changed later"
      },
      description:{
        type:"string",
        minLength:0,
        maxLength:1000,
        description:"A small description of what  data in this schema stores."
      },
      schema: {
        type: "object",
        additionalProperties: true,
        minProperties: 1,
        maxProperties: 50,
        description:"This must be a valid JSON Schema which will be used to validate documents created with this schema.See this https://tour.json-schema.org/",
      },
      settings: {
        type: "object",
        additionalProperties: true,
        properties: {
          primary_keys: {
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
            maxItems: 50,
          },
          encrypted_fields: {
            type: "array",
            default: [],
            items: {
              type: "string",
            },
            maxItems: 50,
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
    required: ["name","description","schema", "settings"],
  },
  settings: {
    primary_key: ["name"],
    editable_fields: ["schema", "settings","description"],
  },
};

export const system_schemas = {
  logs: {
    system_generated:true,
    description:"Schema for the log doc. Single log doc for the whole DB to log stuff about the DB",
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
      single_record: true
    },
  },
  keys: {
    system_generated:true,
    description:"To store user defined key. this can include anything like API tokens etc. There is a special method to fetch this. The values are encrypted",
    name: "system_keys",
    schema: {
      type: "object",
      additionalProperties: true,
      required:["name","value"],
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
          pattern: "^[^\n\r]*$",
          description:"Must be a single line string"
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
      primary_keys: ["name"],
      encrypted_fields:["value"]
    },
  },
  settings: {
    system_generated:true,
    description:"The system relies on these settings for proper functioning or enabling optional features.",
    name: "system_settings",
    schema: {
      required:["name","value"],
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
      primary_keys: ["name"],
      editable_fields: ["value"],
    },
  },
};

// this is not stored in the DB. only for validating the metadata during doc update
export const editable_metadata_schema = {
  additionalProperties: false,
  properties:{
    tags:{
      type:"array",
      items:{type:"string"},
      default:[],
      maxItems: 40,
    },
    link:{
      type:"string",
      minLength:2,
      maxLength:2000,
      pattern: "^[a-zA-Z0-9-]+$"
    }
  }
}