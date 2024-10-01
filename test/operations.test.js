// to test database operations. assuming the class is initialized successfully 
// to test initialization of the BeanBagDB class 
import { get_pdb_doc } from './pouchdb.js';
import { throws, strictEqual,rejects } from "assert";
import {BeanBagDB,ValidationError}  from '../src/index.js';

let database   // this is the global db object

describe("Successful database class init (required for further testing) ", async () => {
  it("DB init successful", () => {
    let doc_obj = get_pdb_doc("test_database_25","qwertyuiopaqwsde1254")
    database = new BeanBagDB(doc_obj);
    strictEqual(
      database instanceof BeanBagDB,
      true,
      "The variable is initialized successfully"
    );
  });
});

describe("Schema doc insertion gives errors when", async () => {
  let schema_docs_invalid = [
    [ "name missing",
       {
      name: "",
      description: "",
      schema: {},
      settings: {},
    }],
    ["name is too short ",
      {
      name: "nos",
      description: "",
      schema: {},
      settings: {},
    }],
    ["schema is blank",
      {
      name: "contact",
      description: "",
      schema: {},
      settings: {},
    }],
    ["schema object missing",
      {
      name: "contact",
      description: "This can be left blank",
      settings: {},
    }],
    [
      "no schema.type",{
      name: "contact",
      description: "This can be left blank",
      schema: {
        "abc":"something"
      },
      settings: {},
    }],
    ["schema.type is invalid",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"something",
      },
      settings: {},
    }],
    ["schema.properties is missing",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
      },
      settings: {},
    }],
    ["schema.properties is invalid",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":"something"
      },
      settings: {},
    }],
    ["schema.properties are missing/blank object",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{}
      },
      settings: {},
    }],
    ["schema.additionalProperties is missing",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}}
      },
      settings: {},
    }],
    ["schema.additionalProperties is invalid",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":"no"
      },
      settings: {},
    }],
    [
      "setting is missing",{
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":true
      }
    }],
    [
      "setting is invalid",{
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":true
      },
      settings:"none"
    }],
    // ["settings.primary_keys is missing",
    //   {
    //   name: "contact",
    //   description: "This can be left blank",
    //   schema: {
    //     "type":"object",
    //     "properties":{"name":{"type":"string"}},
    //     "additionalProperties":true
    //   },
    //   settings: {
    //   },
    // }],
    ["settings.primary_keys is invalid",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:"name"
      },
    }],
    ["settings.non_editable_fields is invalid",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:"all"
      },
    }],
    ["settings.single_record is invalid",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:[],
        single_record:"no"
      },
    }],
    ["settings.encrypted_fields is invalid",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:[],
        single_record:false,
        encrypted_fields:"none"
      },
    }],
    ["settings.primary_keys fields are not defined in schema",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name1"],
        non_editable_fields:[],
        single_record:false,
        encrypted_fields:"none"
      },
    }],
    ["settings.primary_keys field is an object",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"object"},"address":{type:"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:[],
        single_record:false,
        encrypted_fields:[]
      },
    }],
    ["settings.non_editable_fields not defined in the schema",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"},"address":{type:"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:["mobile"],
        single_record:false,
        encrypted_fields:[]
      },
    }],
    ["settings.encrypted_fields not defined in the schema",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"},"address":{type:"object"},"secret":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:["mobile"],
        single_record:false,
        encrypted_fields:["password"]
      },
    }],
    ["settings.encrypted_fields is not a string",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"},"address":{type:"object"},"secret":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:["mobile"],
        single_record:false,
        encrypted_fields:["address"]
      },
    }],
    ["settings.encrypted_fields is a primary key",
      {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"},"address":{type:"object"},"secret":{"type":"string"}},
        "additionalProperties":true
      },
      settings: {
        primary_keys:["name"],
        non_editable_fields:["mobile"],
        single_record:false,
        encrypted_fields:["name"]
      },
    }]
  ];


  before(async () => {
    let doc_obj = get_pdb_doc("test_database_25", "qwertyuiopaqwsde1254");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    console.log("Ready for more tests...");
  });

  schema_docs_invalid.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      await rejects(
        async () => {
          await database.create("schema", element[1]);
        },
        ValidationError
      );
    });
  });  
  
});

