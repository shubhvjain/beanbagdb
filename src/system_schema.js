export const default_app = {
  app_id: "beanbagdb_system",
  meta: {
    name: "beanbagdb_system",
    description:
      "This is the default system app required for proper functioning of the database",
  },
  schemas: [
    {
      name: "schema",
      active: true,
      description: "Meta-schema or the schema for defining other schemas",
      system_generated: true,
      version: 0.88,
      title: "Schema document",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          system_generated: {
            title: "System generated schema",
            type: "boolean",
            default: false,
          },
          active: {
            title:"Active",
            description:  "This indicates where new documents can be created using this schema or not. Old documents can still be edited",
            type: "boolean",
            default: false,
          },
          version: {
            type: "number",
            title: "Version",
            minimum: 0,
            default: 1,
            description:
              "This is an optional field.To be used primarily for system schemas",
          },
          name: {
            type: "string",
            title: "Name",
            minLength: 4,
            maxLength: 50,
            pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
            description:
              "This is the name of the schema.It cannot be changed later",
          },
          title: {
            type: "string",
            title: "Title",
            minLength: 0,
            maxLength: 1000,
            description: "A title to display with records.",
          },
          description: {
            type: "string",
            title: "About",
            minLength: 0,
            maxLength: 1000,
            description:
              "A small description of what  data in this schema stores.",
          },
          schema: {
            type: "object",
            title: "JSON Schema specification",
            additionalProperties: true,
            minProperties: 1,
            maxProperties: 50,
            description:
              "This must be a valid JSON Schema which will be used to validate documents created with this schema.See this https://tour.json-schema.org/",
            default: {},
          },
          settings: {
            type: "object",
            title: "Additional Settings",
            additionalProperties: true,
            properties: {
              primary_keys: {
                title: "Primary key",
                type: "array",
                default: [],
                items: {
                  type: "string",
                },
                maxItems: 10,
                description:
                  "Fields that makes each document unique in the schema.Leave it blank if you do not need it. You can still be able to distinguish documents using the link field and the document id.",
              },
              non_editable_fields: {
                type: "array",
                title: "Non editable fields",
                default: [],
                items: {
                  type: "string",
                },
                maxItems: 50,
                minItems: 0,
                description:
                  "The list of fields whose values are added when the document is created but cannot be edited later in future.",
              },
              encrypted_fields: {
                type: "array",
                title: "List of fields encrypted",
                default: [],
                items: {
                  type: "string",
                },
                maxItems: 50,
                description:
                  "Once set, all the data in this field will be encrypted before storing it in the database. Encryption key must be provided during the time of BeanBagDB initialization and must be managed by the user as it is NOT stored in the database",
              },
              display_fields: {
                type: "array",
                title: "List of fields to show in short view",
                default: [],
                items: {
                  type: "string",
                },
                maxItems: 50,
                description:
                  "These fields will be used when a record is displayed in short",
              },
              install_source: {
                type: "string",
                title: "Installation source",
                default: "human",
                description:
                  "Describes how this schema was installed in database. This is determined by the system. By default the value is human. Possible value: name of the app , where it was cloned from etc...",
              },
            },
            required: [
              "primary_keys",
              "non_editable_fields",
              "encrypted_fields",
            ],
          },
        },
        required: ["name", "description", "schema", "settings", "title"],
      },
      settings: {
        primary_keys: ["name"],
        non_editable_fields: ["system_generated"],
        encrypted_fields: [],
        display_fields: ["name", "version", "description", "title", "active"],
      },
    },
    {
      system_generated: true,
      version: 0.63,
      description:
        "To store user defined key. this can include anything like API tokens etc. There is a special method to fetch this. The values are encrypted",
      name: "system_key",
      title: "System key",
      active: true,
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["name", "value"],
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
            description: "Must be a single line string",
          },
          note: {
            type: "string",
            minLength: 1,
            maxLength: 5000,
          },
        },
      },
      settings: {
        primary_keys: ["name"],
        encrypted_fields: ["value"],
        non_editable_fields: [],
      },
    },
    {
      version: 0.67,
      system_generated: true,
      description:
        "The system relies on these settings for proper functioning or enabling optional features.",
      name: "system_setting",
      title: "System Setting",
      active: true,
      schema: {
        required: ["name", "value"],
        type: "object",
        additionalProperties: true,
        properties: {
          name: {
            type: "string",
            minLength: 5,
            maxLength: 1000,
            pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
          },
          value: {
            type: ["array", "object"],
          },
        },
      },
      settings: {
        primary_keys: ["name"],
        non_editable_fields: ["name"],
        encrypted_fields: [],
      },
    },
    {
      name: "system_edge_constraint",
      title: "Edge constraint",
      system_generated: true,
      active: true,
      version: 0.52,
      description:
        "To define edge constraints for simple directed graph of records.",
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["node1", "node2", "edge_type"],
        properties: {
          node1: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            pattern:
              "^(\\*|(\\*-[a-zA-Z0-9_-]+)(,[a-zA-Z0-9_-]+)*|[a-zA-Z0-9_-]+(,[a-zA-Z0-9_-]+)*)$",
          },
          node2: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            pattern:
              "^(\\*|(\\*-[a-zA-Z0-9_-]+)(,[a-zA-Z0-9_-]+)*|[a-zA-Z0-9_-]+(,[a-zA-Z0-9_-]+)*)$",
          },
          name: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
          },
          label: {
            type: "string",
            maxLength: 500,
          },
          note: {
            type: "string",
            maxLength: 5000,
          },
          max_from_node1: {
            type: "number",
            default: -1,
          },
          max_to_node2: {
            type: "number",
            default: -1,
          },
        },
      },
      settings: {
        primary_keys: ["name"],
        non_editable_fields: ["name"],
        encrypted_fields: [],
      },
    },
    {
      name: "system_edge",
      title: "Edge in the system graph",
      active: true,
      system_generated: true,
      version: 0.52,
      description: "To define edges in the simple directed graph of records.",
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["node1", "node2", "edge_type"],
        properties: {
          node1: {
            type: "string",
          },
          node2: {
            type: "string",
          },
          edge_name: {
            type: "string",
          },
        },
      },
      settings: {
        primary_keys: ["node1", "node2", "edge_type"],
        non_editable_fields: ["edge_type"],
        encrypted_fields: [],
      },
    },
    {
      name: "system_media",
      title: "Media content",
      active: true,
      system_generated: true,
      version: 0.62,
      description: "To store images as Base64",
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["imageBase64", "caption", "source"],
        properties: {
          imageBase64: {
            type: "string",
            media: {
              binaryEncoding: "base64",
            },
          },
          caption: {
            type: "string",
          },
          source: {
            type: "string",
          },
        },
      },
      settings: {
        primary_keys: ["caption"],
        non_editable_fields: [],
        encrypted_fields: [],
      },
    },
    {
      name: "system_log",
      system_generated: true,
      title: "System log",
      active: true,
      version: 0.52,
      description: "To define edges in the simple directed graph of records.",
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["text"],
        properties: {
          text: {
            type: "string",
          },
          data: {
            type: "object",
            additionalProperties: true,
          },
          app: {
            type: "string",
          },
          time: {
            type: "string",
          },
        },
      },
      settings: {
        primary_keys: [],
        non_editable_fields: [],
        encrypted_fields: [],
      },
    },
    {
      name: "system_script",
      system_generated: true,
      title: "Executable script",
      active: true,
      version: 0.1,
      description: "To create scripts that implement some logic. Can run both on browser and client.",
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["script","type","version"],
        properties: {
          type: {
            type: "string",
            default:"JS"
          },
          name: {
            type: "string",
            default:"script-name",
            pattern: "^[a-zA-Z0-9\\-]+$"
          },
          script: {
            type: "string",
            description:"The script",
            default:""
          },
          usage:{
            type:"string",
            description:"Documentation",
            default:" "
          },
          version :{
            type:"number",
            default:0.1
          },
          log_execution:{
            type:"boolean",
            default:false
          }
        },
      },
      settings: {
        primary_keys: ["name"],
        non_editable_fields: [],
        encrypted_fields: [],
      },
    },
  ],
  records: [],
};

// this is not stored in the DB. only for validating the metadata during doc update
export const editable_metadata_schema = {
  additionalProperties: false,
  type: "object",
  properties: {
    tags: {
      type: "array",
      items: { type: "string" },
      default: [],
      maxItems: 40,
    },
    link: {
      type: "string",
      minLength: 2,
      maxLength: 2000,
      pattern: "^[a-zA-Z0-9-]+$",
    },
    title:{
      type:"string",
      maxLength:10000
    }
  },
};

export const app_data_schema = {
  additionalProperties: true,
  type: "object",
  required: ["app_id"],
  properties: {
    app_id: {
      type: "string",
    },
    meta: {
      type: "object",
      additionalProperties: true,
    },
    schemas: {
      type: "array",
      minItems: 1,
      // each schema must have a version 
    },
    records: {
      type: "array",
      // each record must have a version 
      default:[]
    },
    default_setting:{
      type: "object",
      additionalProperties:true,
      default : {}
    }
  },
};
