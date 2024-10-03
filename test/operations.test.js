// to test database operations. assuming the class is initialized successfully
// to test initialization of the BeanBagDB class
import { get_pdb_doc } from "./pouchdb.js";
import assert, { throws, strictEqual, rejects } from "assert";
import { BeanBagDB, DocCreationError, EncryptionError, ValidationError } from "../src/index.js";

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

// Then either:
const expect = chai.expect;

let database; // this is the global db object
let database1
let database2

describe("Successful database class init (required for further testing) ", async () => {
  it("DB init successful", () => {
    let doc_obj = get_pdb_doc("test_database_25", "qwertyuiopaqwsde1254");
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
    [
      "name missing",
      {
        name: "",
        description: "",
        schema: {},
        settings: {},
      },
    ],
    [
      "name is too short ",
      {
        name: "nos",
        description: "",
        schema: {},
        settings: {},
      },
    ],
    [
      "schema is blank",
      {
        name: "contact",
        description: "",
        schema: {},
        settings: {},
      },
    ],
    [
      "schema object missing",
      {
        name: "contact",
        description: "This can be left blank",
        settings: {},
      },
    ],
    [
      "no schema.type",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          abc: "something",
        },
        settings: {},
      },
    ],
    [
      "schema.type is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "something",
        },
        settings: {},
      },
    ],
    [
      "schema.properties is missing",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
        },
        settings: {},
      },
    ],
    [
      "schema.properties is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: "something",
        },
        settings: {},
      },
    ],
    [
      "schema.properties are missing/blank object",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: {},
        },
        settings: {},
      },
    ],
    [
      "schema.additionalProperties is missing",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        settings: {},
      },
    ],
    [
      "schema.additionalProperties is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: "no",
        },
        settings: {},
      },
    ],
    [
      "setting is missing",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
      },
    ],
    [
      "setting is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
        settings: "none",
      },
    ],
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
    [
      "settings.primary_keys is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
        settings: {
          primary_keys: "name",
        },
      },
    ],
    [
      "settings.non_editable_fields is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: "all",
        },
      },
    ],
    [
      "settings.single_record is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: [],
          single_record: "no",
        },
      },
    ],
    [
      "settings.encrypted_fields is invalid",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: [],
          single_record: false,
          encrypted_fields: "none",
        },
      },
    ],
    [
      "settings.primary_keys fields are not defined in schema",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name1"],
          non_editable_fields: [],
          single_record: false,
          encrypted_fields: "none",
        },
      },
    ],
    [
      "settings.primary_keys field is an object",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "object" }, address: { type: "string" } },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: [],
          single_record: false,
          encrypted_fields: [],
        },
      },
    ],
    [
      "settings.non_editable_fields not defined in the schema",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: { name: { type: "string" }, address: { type: "string" } },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: ["mobile"],
          single_record: false,
          encrypted_fields: [],
        },
      },
    ],
    [
      "settings.encrypted_fields not defined in the schema",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            address: { type: "object" },
            secret: { type: "string" },
          },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: ["mobile"],
          single_record: false,
          encrypted_fields: ["password"],
        },
      },
    ],
    [
      "settings.encrypted_fields is not a string",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            address: { type: "object" },
            secret: { type: "string" },
          },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: ["mobile"],
          single_record: false,
          encrypted_fields: ["address"],
        },
      },
    ],
    [
      "settings.encrypted_fields is a primary key",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            address: { type: "object" },
            secret: { type: "string" },
          },
          additionalProperties: true,
        },
        settings: {
          primary_keys: ["name"],
          non_editable_fields: ["mobile"],
          single_record: false,
          encrypted_fields: ["name"],
        },
      },
    ],
  ];

  before(async () => {
    let doc_obj = get_pdb_doc("test_database_25", "qwertyuiopaqwsde1254");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    console.log("Ready for more tests...");
  });

  schema_docs_invalid.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      await rejects(async () => {
        await database.create("schema", element[1]);
      }, ValidationError);
    });
  });
});

describe("Doc insertion tests", async () => {
  let schema_docs_invalid = [
    [
      "error when title empty",
      {
        title: "",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
      },
    ],
    [
      "error , author empty ",
      {
        title: "Harry Potter",
        author: "",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
      },
    ],
    [
      "error incorrect isbn length",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "123456",
        publicationYear: 1999,
        genre: "Fantasy",
      },
    ],
    [
      "error when incorrect pub date incorrect",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 2050,
        genre: "Fantasy",
      },
    ],
    [
      "no schema.type",
      {
        name: "contact",
        description: "This can be left blank",
        schema: {
          abc: "something",
        },
        settings: {},
      },
    ],
    [
      "error with incorrect genre",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Unknown Genre",
      },
    ],
    [
      "error empty publisher ",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        publisher: "",
      },
    ],
    [
      "error incorrect page no",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        pages: 0,
      },
    ],
    [
      "error when language incorrect",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        language: 123,
      },
    ],
    [
      "error with additional data",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        unknownField: "Some data",
      },
    ],
    [
      "error when pub_date in not year",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: "1999",
        genre: "Fantasy",
      },
    ],
    [
      "error when required author field is missing",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        genre: "Fantasy",
      },
    ],
    [
      "error when required genre is missing",
      {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
      },
    ],
    [
      "error when author name is not string",
      {
        title: "Harry Potter",
        author: ["J.K. Rowling"],
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
      },
    ],
  ];

  const test_schema = {
    name:"book",
    description:"Test schema 1",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        title: {
          type: "string",
          minLength: 1,
          description: "The title of the book",
        },
        author: {
          type: "string",
          minLength: 1,
          description: "The author of the book",
        },
        isbn: {
          type: "string",
          pattern: "^(97(8|9))?\\d{9}(\\d|X)$",
          description: "The ISBN of the book, can be 10 or 13 digits",
        },
        publicationYear: {
          type: "integer",
          minimum: 1450,
          maximum: 2024,
          description:
            "The year the book was published (between 1450 and 2024)",
        },
        genre: {
          type: "string",
          enum: [
            "Fiction",
            "Non-Fiction",
            "Science",
            "History",
            "Fantasy",
            "Biography",
            "Children",
            "Mystery",
            "Horror",
          ],
          description: "The genre of the book",
        },
        language: {
          type: "string",
          description: "The language of the book",
          default: "English",
        },
        publisher: {
          type: "string",
          description: "The publisher of the book",
          minLength: 1,
        },
        pages: {
          type: "integer",
          minimum: 1,
          description: "The number of pages in the book",
        },
      },
      required: ["title", "author", "isbn", "publicationYear", "genre"],
      additionalProperties: false,
    },
    settings : {
      primary_keys:['title','author'],
      encrypted_fields:[],
      non_editable_fields:[],
      single_record:false
    }
  }

  before(async () => {
    // adding a schema
    let doc_obj = get_pdb_doc("test_database_26", "qwertyuiopaqwsde1254");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    try {
      //console.log(test_schema)
      let a = await database.create("schema",test_schema)
      console.log("Ready for more tests...");  
    } catch (error) {
      console.log("error in before")
      console.log(error)
    }
  })

  const book1 = {
    title: "Harry Potter",
    author: "J.K. Rowling",
    isbn: "9780439139601",
    publicationYear: 1999,
    genre: "Fantasy",
    publisher: "ABC DEF"
}
  
  it(`when inserting the book schema again, must throw error`, async () => {
    await rejects(async () => {
      try {
        await database.create("schema", test_schema);   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocCreationError);
  })

  schema_docs_invalid.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      await rejects(async () => {
        await database.create("schema", element[1]);
      }, ValidationError);
    })
  })

  it('successfully inserts a book doc', async () => {
    await expect(database.create("book", book1)).to.eventually.have.property("_id");
  });


  let invalid_meta = [
    ["invalid field",{tabs:[]}],
    ["invalid tags",{tags:"a,b,c"}],
    ["invalid link",{link:{'1':1}}],
  ]

  invalid_meta.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      let bd = {...book1}
      bd.title = bd.title+" "+index
      await rejects(async () => {
        await database.create("schema",bd,element[1]);
      }, ValidationError);
    })
  })
  
  it('successfully inserts a book doc with a link', async () => {
    let bd = {...book1}
    bd.title = bd.title+" test1"
    let new_rec = await database.create("book", bd,{link:"sample1"})
    assert(new_rec.meta.link=="sample1")
  });

  it(`throw error when inserting the book with same link again`, async () => {
    await rejects(async () => {
      try {
        let bd = {...book1}
        bd.title = bd.title+" test1234"
        await database.create("book", bd,{link:"sample1"});   
      } catch (error) {
        console.log(error)
        console.log("22222")
        throw error
      }
    }, DocCreationError);
  })


  it('successfully inserts a book doc with tags', async () => {
    let bd = {...book1}
    bd.title = bd.title+" test2"
    let tags1 = ["tag1"]
    let new_rec = await database.create("book", bd,{tags:tags1})
    assert(new_rec.meta.tags===tags1)
  });

  it(`throw error when no schema provided`, async () => {
    await rejects(async () => {
      try {
        let bd = {...book1}
        bd.title = bd.title+" test1234"
        await database.create("", bd,{link:"sample1"});   
      } catch (error) {
        console.log(error)
        console.log("22222")
        throw error
      }
    }, DocCreationError);
  })
  
  it(`throw error when no data provided`, async () => {
    await rejects(async () => {
      try {
        let bd = {...book1}
        bd.title = bd.title+" test1234"
        await database.create("book",{},{link:"sample1"});   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocCreationError);
  })
 

})

describe("Doc insertion tests with encryption", async () => {
  const test_schema = {
    name:"book",
    description:"Test schema 1",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        title: {
          type: "string",
          minLength: 1,
          description: "The title of the book",
        },
        author: {
          type: "string",
          minLength: 1,
          description: "The author of the book",
        },
        isbn: {
          type: "string",
          pattern: "^(97(8|9))?\\d{9}(\\d|X)$",
          description: "The ISBN of the book, can be 10 or 13 digits",
        },
        publicationYear: {
          type: "integer",
          minimum: 1450,
          maximum: 2024,
          description:
            "The year the book was published (between 1450 and 2024)",
        },
        genre: {
          type: "string",
          enum: [
            "Fiction",
            "Non-Fiction",
            "Science",
            "History",
            "Fantasy",
            "Biography",
            "Children",
            "Mystery",
            "Horror",
          ],
          description: "The genre of the book",
        },
        language: {
          type: "string",
          description: "The language of the book",
          default: "English",
        },
        publisher: {
          type: "string",
          description: "The publisher of the book",
          minLength: 1,
        },
        pages: {
          type: "integer",
          minimum: 1,
          description: "The number of pages in the book",
        },
        secret: {
          type: "string",
          description: "Super secret related to the book",
          minLength: 1,
        },
      },
      required: ["title", "author", "isbn", "publicationYear", "genre"],
      additionalProperties: false,
    },
    settings : {
      primary_keys:['title','author'],
      encrypted_fields:['secret'],
      non_editable_fields:[],
      single_record:false
    }
  };

  before(async () => {
    // adding a schema
    let doc_obj_orig = get_pdb_doc("test_database_27", "qwertyuiopaqwsde1254");
    let doc_obj_dupl = get_pdb_doc("test_database_27", "qwertyuiopaqwsde12545");
    database1 = new BeanBagDB(doc_obj_orig);
    await database1.ready(); // Ensure the database is ready before running tests
    console.log(database1.encryption_key)
    database2 = new BeanBagDB(doc_obj_dupl);
    await database2.ready(); // Ensure the database is ready before running tests
    try {
      //console.log(test_schema)
      let a = await database1.create("schema",test_schema)
    } catch (error) {
      console.log("error in before")
      console.log(error)
    }
  });

  it(`when inserting the book schema again in db1, must throw error`, async () => {
    await rejects(async () => {
      try {
        await database1.create("schema", test_schema);   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocCreationError);
  });

  it(`when inserting the book schema again in db2 , must throw error`, async () => {
    await rejects(async () => {
      try {
        await database2.create("schema", test_schema);   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocCreationError);
  });

  it('successfully inserts a book doc with some secret', async () => {
    const book1 = {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        publisher: "ABC DEF",
        secret: "Super secret 1"
    }
    await expect(database1.create("book", book1)).to.eventually.have.property("_id");
  });

  it('gives error when inserting the same doc again', async () => {
    const book1 = {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        publisher: "ABC DEF",
        secret: "Super secret 1"
    };
    await rejects(async () => {
      try {
        await database1.create("book", book1);   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocCreationError);
  })

  it('fetches the doc and the encrypted field is returned successfully', async () => {
    const book1 = {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        publisher: "ABC DEF",
        secret: "Super secret 1"
    };
    let data = await database1.read({schema:"book",data:{"title":book1.title,"author":book1.author}})
    //console.log(data)
    assert(data.doc.data.secret == book1.secret) 
  })
  
  it('should throw encryption error when using the incorrect key', async () => {
    const book1 = {
        title: "Harry Potter",
        author: "J.K. Rowling",
        isbn: "9780439139601",
        publicationYear: 1999,
        genre: "Fantasy",
        publisher: "ABC DEF",
        secret: "Super secret 1"
    }

    await rejects(async () => {
      try {
        let d = await database2.read({schema:"book",data:{"title":book1.title,"author":book1.author}});   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, EncryptionError)
  })

})
