// to test database operations. assuming the class is initialized successfully 
// to test initialization of the BeanBagDB class 
import { get_pdb_doc } from './pouchdb.js';
import { throws, strictEqual,rejects } from "assert";
import BeanBagDB  from '../src/index.js';



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




describe("Testing creation of schema docs", async () => {
  let schema_docs_invalid = [
    {
      name: "",
      description: "",
      schema: {},
      settings: {},
    },
    {
      name: "nos",
      description: "",
      schema: {},
      settings: {},
    },
    {
      name: "contact",
      description: "",
      schema: {},
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {},
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "abc":"something"
      },
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"something",
      },
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
      },
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":"something"
      },
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{}
      },
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}}
      },
      settings: {},
    },
    {
      name: "contact",
      description: "This can be left blank",
      schema: {
        "type":"object",
        "properties":{"name":{"type":"string"}},
        "additionalProperties":"no"
      },
      settings: {},
    },
    // {
    //   name: "contact",
    //   description: "This can be left blank",
    //   schema: {
    //     "type":"object",
    //     "properties":{"name":{"type":"string"}},
    //     "additionalProperties":true
    //   },
    //   settings: {},
    // },
  ];

  let doc_obj = get_pdb_doc("test_database_25", "qwertyuiopaqwsde1254");
  let database = new BeanBagDB(doc_obj);
  database.initialize_db();
  database.ready();
  // schema_docs_invalid.forEach(doc=>{})
  for (let index = 0; index < schema_docs_invalid.length; index++) {
    const element = schema_docs_invalid[index];

    it("throws error", async () => {
      await rejects(
        async () => {
          await database.insert("schema", element);
        },
        Error
      );
    });

  }
  
});

