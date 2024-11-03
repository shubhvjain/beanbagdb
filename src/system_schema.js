export const schema_schema = {
  name: "schema",
  description:"Meta-schema or the schema for defining other schemas",
  system_generated:true,
  version:0.56,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      system_generated:{
        type:"boolean",
        default:false
      },
      version: {
        type: "number",
        minimum: 0,
        default: 1,
        description:"This is an optional field.To be used primarily for system schemas"
      }, 
      name: {
        type: "string",
        minLength: 4,
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
            description:"Fields that makes each document unique in the schema.Leave it blank if you do not need it. You can still be able to distinguish documents using the link field and the document id."
          },
          non_editable_fields: {
            type: "array",
            default: [],
            items: {
              type: "string",
            },
            maxItems: 50,
            minItems:0,
            description:"The list of fields whose values are added when the document is created but cannot be edited later in future."
          },
          encrypted_fields: {
            type: "array",
            default: [],
            items: {
              type: "string",
            },
            maxItems: 50,
            description:"Once set, all the data in this field will be encrypted before storing it in the database. Encryption key must be provided during the time of BeanBagDB initialization and must be managed by the user as it is NOT stored in the database"
          }
        },
        required :["primary_keys","non_editable_fields","encrypted_fields"]
      },
    },
    required: ["name","description","schema", "settings"],
  },
  settings: {
    primary_keys: ["name"],
    non_editable_fields:[],
    encrypted_fields:[]
  },
};

export const system_schemas = {
  keys: {
    system_generated:true,
    version:0.53,
    description:"To store user defined key. this can include anything like API tokens etc. There is a special method to fetch this. The values are encrypted",
    name: "system_key",
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
        },
      },
    },
    settings: {
      primary_keys: ["name"],
      encrypted_fields:["value"],
      non_editable_fields:[]
    },
  },
  settings: {
    version:0.5,
    system_generated:true,
    description:"The system relies on these settings for proper functioning or enabling optional features.",
    name: "system_setting",
    schema: {
      required:["name","value"],
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
          type: ["string", "number", "boolean", "array"] 
        },
        on_update_array:{
          type:"string",
          default:"replace",
          description:"Special operation only for updating Arrays. Either replace it or append new elements to it. Cannot be edited",
          enum:["replace","append"],
        }
      },
    },
    settings: {
      primary_keys: ["name"],
      non_editable_fields: ["name"],
      encrypted_fields:[]
    },
  },
  edges_constraints:{
    name:"system_edge_constraint",
    system_generated:true,
    version:0.5,
    description: "To define edge constraints for simple directed graph of records.",
    schema:{
      type: "object",
      additionalProperties: true,
      required:["node1","node2","edge_type"],
      properties: {
        node1: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          pattern: "^(\\*|(\\*-[a-zA-Z0-9_-]+)(,[a-zA-Z0-9_-]+)*|[a-zA-Z0-9_-]+(,[a-zA-Z0-9_-]+)*)$"
        },
        node2: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          pattern: "^(\\*|(\\*-[a-zA-Z0-9_-]+)(,[a-zA-Z0-9_-]+)*|[a-zA-Z0-9_-]+(,[a-zA-Z0-9_-]+)*)$"
        },
        name:{
          type: "string",
          minLength: 1,
          maxLength: 500,
          pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
        },
        label:{
          type: "string",
          maxLength: 500,
        },
        note:{
          type: "string",
          maxLength: 5000,
        },
        max_from_node1:{
          type:"number",
          default: -1,
        },
        max_to_node2:{
          type:"number",
          default: -1,
        }
      }
    },
    settings: {
      primary_keys: ["name"],
      non_editable_fields:["name"],
      encrypted_fields:[]
    },
  },
  edges:{
    name:"system_edge",
    system_generated:true,
    version:0.5,
    description: "To define edges in the simple directed graph of records.",
    schema:{
      type: "object",
      additionalProperties: true,
      required:["node1","node2","edge_type"],
      properties: {
        node1: {
          type: "string",
        },
        node2: {
          type: "string",
        },
        edge_name:{
          type: "string",
        }
      }
    },
    settings: {
      primary_keys: ["node1","node2","edge_type"],
      non_editable_fields:["edge_type"],
      encrypted_fields:[]
    },
  },
  media:{
    name:"system_media",
    system_generated:true,
    version:0.5,
    description: "To store images as Base64",
    schema:{
      type: "object",
      additionalProperties: true,
      required:["imageBase64","caption","source"],
      properties: {
        imageBase64: {
          type: "string",
          "media": {
            "binaryEncoding": "base64"
          }
        },
        caption: {
          type: "string",
        },
        source:{
          type: "string",
        }
      }
    },
    settings: {
      primary_keys: ["caption"],
      non_editable_fields:[],
      encrypted_fields:[]
    },
  }
};

// this is not stored in the DB. only for validating the metadata during doc update
export const editable_metadata_schema = {
  additionalProperties: false,
  type:"object",
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