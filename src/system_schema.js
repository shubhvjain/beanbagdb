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
      version: 1,
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
              svg_icon25: {
                type: "string",
                title: "SVG Icon for schema",
                default: "human",
                description:
                  "The height and width should be 25px",
              }
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
        svg_icon25:"<svg xmlns='http://www.w3.org/2000/svg' width='25' height='16' fill='currentColor' class='bi bi-database-fill-gear' viewBox='0 0 16 16'><path d='M8 1c-1.573 0-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4s.875 1.755 1.904 2.223C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777C13.125 5.755 14 5.007 14 4s-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1'/><path d='M2 7v-.839c.457.432 1.004.751 1.49.972C4.722 7.693 6.318 8 8 8s3.278-.307 4.51-.867c.486-.22 1.033-.54 1.49-.972V7c0 .424-.155.802-.411 1.133a4.51 4.51 0 0 0-4.815 1.843A12 12 0 0 1 8 10c-1.573 0-3.022-.289-4.096-.777C2.875 8.755 2 8.007 2 7m6.257 3.998L8 11c-1.682 0-3.278-.307-4.51-.867-.486-.22-1.033-.54-1.49-.972V10c0 1.007.875 1.755 1.904 2.223C4.978 12.711 6.427 13 8 13h.027a4.55 4.55 0 0 1 .23-2.002m-.002 3L8 14c-1.682 0-3.278-.307-4.51-.867-.486-.22-1.033-.54-1.49-.972V13c0 1.007.875 1.755 1.904 2.223C4.978 15.711 6.427 16 8 16c.536 0 1.058-.034 1.555-.097a4.5 4.5 0 0 1-1.3-1.905m3.631-4.538c.18-.613 1.048-.613 1.229 0l.043.148a.64.64 0 0 0 .921.382l.136-.074c.561-.306 1.175.308.87.869l-.075.136a.64.64 0 0 0 .382.92l.149.045c.612.18.612 1.048 0 1.229l-.15.043a.64.64 0 0 0-.38.921l.074.136c.305.561-.309 1.175-.87.87l-.136-.075a.64.64 0 0 0-.92.382l-.045.149c-.18.612-1.048.612-1.229 0l-.043-.15a.64.64 0 0 0-.921-.38l-.136.074c-.561.305-1.175-.309-.87-.87l.075-.136a.64.64 0 0 0-.382-.92l-.148-.045c-.613-.18-.613-1.048 0-1.229l.148-.043a.64.64 0 0 0 .382-.921l-.074-.136c-.306-.561.308-1.175.869-.87l.136.075a.64.64 0 0 0 .92-.382zM14 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0'/></svg>"
      },
    },
    {
      system_generated: true,
      version: 1,
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
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-key-fill" viewBox="0 0 16 16"><path d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/></svg>`
      },
    },
    {
      version: 1,
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
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-gear-fill" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/></svg>`
      },
    },
    {
      name: "system_edge_constraint",
      title: "Edge constraint",
      system_generated: true,
      active: true,
      version: 1,
      description:
        "To define edge constraints for simple directed graph of records.",
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["node1", "node2", "name"],
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
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-node-plus-fill" viewBox="0 0 16 16"><path d="M11 13a5 5 0 1 0-4.975-5.5H4A1.5 1.5 0 0 0 2.5 6h-1A1.5 1.5 0 0 0 0 7.5v1A1.5 1.5 0 0 0 1.5 10h1A1.5 1.5 0 0 0 4 8.5h2.025A5 5 0 0 0 11 13m.5-7.5v2h2a.5.5 0 0 1 0 1h-2v2a.5.5 0 0 1-1 0v-2h-2a.5.5 0 0 1 0-1h2v-2a.5.5 0 0 1 1 0"/></svg>`
      },
    },
    {
      name: "system_edge",
      title: "Edge in the system graph",
      active: true,
      system_generated: true,
      version: 1,
      description: "To define edges in the simple directed graph of records.",
      schema: {
        type: "object",
        additionalProperties: true,
        required: ["node1", "node2", "edge_name"],
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
          note:{
            type:"string",
            default:" "
          }
        },
      },
      settings: {
        primary_keys: ["node1", "node2", "edge_name"],
        non_editable_fields: ["edge_type"],
        encrypted_fields: [],
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-diagram-2-fill" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H11a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 5 7h2.5V6A1.5 1.5 0 0 1 6 4.5zm-3 8A1.5 1.5 0 0 1 4.5 10h1A1.5 1.5 0 0 1 7 11.5v1A1.5 1.5 0 0 1 5.5 14h-1A1.5 1.5 0 0 1 3 12.5zm6 0a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 9 12.5z"/></svg>`
      },
    },
    {
      name: "system_media",
      title: "Media content",
      active: true,
      system_generated: true,
      version: 1,
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
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-file-image" viewBox="0 0 16 16"><path d="M8.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/><path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8l-2.083-2.083a.5.5 0 0 0-.76.063L8 11 5.835 9.7a.5.5 0 0 0-.611.076L3 12z"/></svg>`
      },
    },
    {
      name: "system_log",
      system_generated: true,
      title: "System log",
      active: true,
      version: 1,
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
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z"/><path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/><path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/></svg>`
      },
    },
    {
      name: "system_script",
      system_generated: true,
      title: "Executable script",
      active: true,
      version: 1,
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
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-braces-asterisk" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.114 8.063V7.9c1.005-.102 1.497-.615 1.497-1.6V4.503c0-1.094.39-1.538 1.354-1.538h.273V2h-.376C2.25 2 1.49 2.759 1.49 4.352v1.524c0 1.094-.376 1.456-1.49 1.456v1.299c1.114 0 1.49.362 1.49 1.456v1.524c0 1.593.759 2.352 2.372 2.352h.376v-.964h-.273c-.964 0-1.354-.444-1.354-1.538V9.663c0-.984-.492-1.497-1.497-1.6M14.886 7.9v.164c-1.005.103-1.497.616-1.497 1.6v1.798c0 1.094-.39 1.538-1.354 1.538h-.273v.964h.376c1.613 0 2.372-.759 2.372-2.352v-1.524c0-1.094.376-1.456 1.49-1.456v-1.3c-1.114 0-1.49-.362-1.49-1.456V4.352C14.51 2.759 13.75 2 12.138 2h-.376v.964h.273c.964 0 1.354.444 1.354 1.538V6.3c0 .984.492 1.497 1.497 1.6M7.5 11.5V9.207l-1.621 1.621-.707-.707L6.792 8.5H4.5v-1h2.293L5.172 5.879l.707-.707L7.5 6.792V4.5h1v2.293l1.621-1.621.707.707L9.208 7.5H11.5v1H9.207l1.621 1.621-.707.707L8.5 9.208V11.5z"/></svg>`
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
      default : {
        primary_keys: [],
        non_editable_fields: [],
        encrypted_fields: [],
        svg_icon25:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-file-earmark" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/></svg>`
      }
    }
  },
};
