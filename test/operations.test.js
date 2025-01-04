// to test database operations. assuming the class is initialized successfully
// to test initialization of the BeanBagDB class
import { get_pdb_doc } from "./pouchdb.js";
import assert, { throws, strictEqual, rejects } from "assert";
import { BeanBagDB, DocCreationError, EncryptionError, ValidationError,DocNotFoundError, DocUpdateError } from "../src/index.js";

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

// Then either:
const expect = chai.expect;

let database; // this is the global db object
let database1
let database2

let good_book_schema_1  = {
  name:"book",
  active:true,
  description:"Test schema 1",
  title:"Book",
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
  }
}

const record_good_book1 = {
  title: "Harry Potter",
  author: "J.K. Rowling",
  isbn: "9780439139601",
  publicationYear: 1999,
  genre: "Fantasy",
  publisher: "ABC DEF"
}

let good_book_schema_2 =  {
  name:"book",
  title:"Book",
  active:true,
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
  }
};
const record_good_book2 = {
  title: "Harry Potter",
  author: "J.K. Rowling",
  isbn: "9780439139601",
  publicationYear: 1999,
  genre: "Fantasy",
  publisher: "ABC DEF",
  secret: "Super secret 1"
}

describe("Successful database class init (required for further testing) ", async () => {
  it("DB init successful", () => {
    let doc_obj = get_pdb_doc("test_database_25", "qwertyuiopaqwsde12542323");
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
        title:"",
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
        title:"",
        settings: {},
      },
    ],
    [
      "schema is blank",
      {
        name: "contact",
        description: "",
        schema: {},
        title:"",
        settings: {},
      },
    ],
    [
      "schema object missing",
      {
        name: "contact",
        description: "This can be left blank",
        title:"something",
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
    [
      "title missing",
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
    let doc_obj = get_pdb_doc("test_database_25", "qwertyuiopaqwsde12544343");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    console.log("Ready for more tests...");
  });

  schema_docs_invalid.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      await rejects(async () => {
        await database.create({schema: "schema", data: element[1]});
      }, ValidationError);
    });
  });
});

describe("Doc insertion tests", async () => {
  let book_docs_invalid = [
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

  

  before(async () => {
    // adding a schema
    let doc_obj = get_pdb_doc("test_database_26", "qwertyuiopaqwsde12541234");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    try {
      //console.log(test_schema)
      let a = await database.create({schema:"schema",data:good_book_schema_1})
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
        await database.create({schema:"schema",data: good_book_schema_1});   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocCreationError);
  })

  book_docs_invalid.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      await rejects(async () => {
        await database.create({schema:"book", data:element[1]});
      }, ValidationError);
    })
  })

  it('successfully inserts a book doc', async () => {
    await expect(database.create({schema:"book", data: book1})).to.eventually.have.property("_id");
  });


  let invalid_meta = [
    ["invalid meta field",{tabs:[]}],
    ["invalid meta.tags",{tags:"a,b,c"}],
    ["invalid meta.link",{link:{'1':1}}],
  ]

  invalid_meta.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      let bd = {...book1}
      bd.title = bd.title+" "+index
      await rejects(async () => {
        await database.create({schema:"book",data:bd,meta:element[1]});
      }, ValidationError);
    })
  })
  
  it('successfully inserts a book doc with a link', async () => {
    let bd = {...book1}
    bd.title = bd.title+" test1"
    let new_rec = await database.create({schema:"book", data: bd,meta:{link:"sample1"}})
    assert(new_rec.meta.link=="sample1")
  });

  it(`throw error when inserting the book with same link again`, async () => {
    await rejects(async () => {
      try {
        let bd = {...book1}
        bd.title = bd.title+" test1234"
        await database.create({schema:"book",data: bd,meta:{link:"sample1"}});   
      } catch (error) {
      //  console.log(error)
        //console.log("22222")
        throw error
      }
    }, DocCreationError);
  })


  it('successfully inserts a book doc with tags', async () => {
    let bd = {...book1}
    bd.title = bd.title+" test2"
    let tags1 = ["tag1"]
    let new_rec = await database.create({schema:"book", data:bd,meta:{tags:tags1}})
    assert(new_rec.meta.tags===tags1)
  });

  it(`throw error when no schema provided`, async () => {
    await rejects(async () => {
      try {
        let bd = {...book1}
        bd.title = bd.title+" test1234"
        await database.create({data:bd,meta:{link:"sample1"}});   
      } catch (error) {
     //   console.log(error)
        throw error
      }
    }, DocCreationError);
  })
  
  it(`throw error when no data provided`, async () => {
    await rejects(async () => {
      try {
        let bd = {...book1}
        bd.title = bd.title+" test1234"
        await database.create({schema:"book",meta:{link:"sample1"}});   
      } catch (error) {
       // console.log(error)
        throw error
      }
    }, DocCreationError);
  })
 

})

describe("Doc insertion tests with encryption", async () => {
  

  before(async () => {
    // adding a schema
    let doc_obj_orig = get_pdb_doc("test_database_27", "123456789012345612341234");
    let doc_obj_dupl = get_pdb_doc("test_database_27", "098765432109876565432345");
    database1 = new BeanBagDB(doc_obj_orig);
    await database1.ready(); // Ensure the database is ready before running tests
    console.log(database1.encryption_key)
    database2 = new BeanBagDB(doc_obj_dupl);
    await database2.ready(); // Ensure the database is ready before running tests
    try {
      console.log(good_book_schema_2)
      let a = await database1.create({schema:"schema",data:good_book_schema_2})
    } catch (error) {
      console.log("error in before")
      console.log(error)
    }
  });

  it(`when inserting the book schema again in db1, must throw error`, async () => {
    await rejects(async () => {
      try {
        await database1.create({schema:"schema",data:good_book_schema_2});   
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocCreationError);
  });

  it(`when inserting the book schema again in db2 , must throw error`, async () => {
    await rejects(async () => {
      try {
        await database2.create({schema:"schema",data:good_book_schema_2});   
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocCreationError);
  });

  it('successfully inserts a book doc with some secret', async () => {
    
      await expect(database1.create({schema:"book",data:record_good_book2})).to.eventually.have.property("_id");
  });

  it('gives error when inserting the same doc again', async () => {
    
    await rejects(async () => {
      try {
        await database1.create({schema:"book",data: record_good_book2});   
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocCreationError);
  })

  it('fetches the doc and the encrypted field is returned successfully', async () => {
   
    let data = await database1.read({schema:"book",data:{"title":record_good_book2.title,"author":record_good_book2.author}})
    //console.log(data)
    assert(data.doc.data.secret == record_good_book2.secret) 
  })
  
  it('should throw encryption error when using the incorrect key', async () => {
    await rejects(async () => {
      try {
        let d = await database2.read({schema:"book",data:{"title":record_good_book2.title,"author":record_good_book2.author}});   
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, EncryptionError)
  })

})

/**
 * read 
 */

describe("Doc read tests", async () => {
  let database3


  const meta = {
    link:"sample1"
  }
  let doc_inserted 

  before(async () => {
    // adding a schema
    let doc_obj = get_pdb_doc("test_database_28", "qwertyuiopaqwsde12544532");
    database3 = new BeanBagDB(doc_obj);
    await database3.ready(); // Ensure the database is ready before running tests
    try {
      let a = await database3.create({schema:"schema",data:good_book_schema_1})
      
      console.log("Ready for more tests...");  
    } catch (error) {
      //console.log("error in before")
      console.log(error)
    }
    try {
      doc_inserted = await database3.create({schema:"book",data:record_good_book1,meta:meta})
    } catch (error) {
      console.log(error)
    }
  })

  it('fetches the doc and the encrypted field is returned unencrypted successfully', async () => {
    let data = await database3.read({schema:"book",data:{"title":record_good_book1.title,"author":record_good_book1.author}})
    assert(data.doc.data.secret == record_good_book1.secret) 
  })


  it('read doc using _id', async () => {
    let data = await database3.read({"_id":doc_inserted._id})
    assert(data.doc.data.secret == record_good_book1.secret) 
  })

  it('read doc using link', async () => {
    let data = await database3.read({"link":meta.link})
    assert(data.doc.data.secret == record_good_book1.secret) 
  })
  
  it('read doc using primary key', async () => {
    let data = await database3.read({schema:"book",data:{title:record_good_book1.title,author:record_good_book1.author}})
    assert(data.doc.data.secret == record_good_book1.secret) 
  })

  it('throws error when  incomplete  primary key given', async () => {
    await rejects(async () => {
      try {
        let a = await database3.read({"schema":"book","data":{title:record_good_book1.title}});   
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, ValidationError);
  })

  it('error when doc does not exists by _id', async () => {
    await rejects(async () => {
      try {
        let a = await database3.read({"_id":"test"});   
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocNotFoundError);
  })

  it('error when doc does not exists by link', async () => {
    await rejects(async () => {
      try {
        let a = await database3.read({"link":"test"});   
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocNotFoundError);
  })

  it('error when doc does not exists by schema', async () => {
    await rejects(async () => {
      try {
        let a = await database3.read({"schema":"book","data":{"title":"sample","author":"sample"}});   
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocNotFoundError);
  })
  
  it('check if schema included', async () => {
    let data = await database3.read({schema:"book",data:{"title":record_good_book1.title,"author":record_good_book1.author},include_schema:true})
    assert(Object.keys(data).length==2)
  })

  it('check if schema not included', async () => {
    let data = await database3.read({schema:"book",data:{"title":record_good_book1.title,"author":record_good_book1.author},include_schema:false})
    assert(Object.keys(data).length==1)
  })
})

/**
 * update
 * - update a system doc 

 */


describe("Doc update tests", async () => {
  let database3

  const meta = {
    link:"sample1",
    tags:["tag1"]
  }
  let doc_inserted 

  before(async () => {
    // adding a schema
    let doc_obj = get_pdb_doc("test_database_29", "qwertyuiopaqwsde12456754");
    database3 = new BeanBagDB(doc_obj);
    await database3.ready(); // Ensure the database is ready before running tests
    try {
      let test_schema  = {...good_book_schema_2}
      test_schema["settings"]["non_editable_fields"] = ['pages','genre']
      test_schema["settings"]["primary_keys"] = ['title','author']
      let a = await database3.create({schema:"schema",data:test_schema})
      doc_inserted = await database3.create({schema:"book",data:record_good_book2,meta:meta})
      let b = await database3.create({schema:"book",data:{...record_good_book2,title:"HP2"},meta:{...meta,link:"sample2"}})
      //console.log(b)
      console.log("Ready for more tests...");  
    } catch (error) {
      //console.log("error in before")
      console.log(error)
    }
  })

  it('error when nothing to update ', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.update({criteria:{"_id":doc_inserted._id}})
      } catch (error) {
        console.log(error)
        throw error
      }
    }, DocUpdateError)
})

  it('update selected fields - 1 ', async () => {
    let updates = {publisher:"Something else"}
    let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{data:updates}})
    let rdata= await database3.read({_id:doc_inserted._id})
    assert(rdata.doc.data.publisher === updates.publisher )
  })

  it('update selected fields - primary key', async () => {
    let updates = {title:"Something else"}
    let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{data:updates}})
    let rdata= await database3.read({_id:doc_inserted._id})
    assert(rdata.doc.data.title === updates.title )
  })

  it('error when updating primary keys that already exists', async () => {
    let updates = {title:"HP2"}
    
    //assert(data.doc.data.secret == book1.secret) 
    await rejects(async () => {
      try {
        let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{data:updates}})
      } catch (error) {
        throw error
      }
    }, DocUpdateError)
  })

  // it('updating full doc', async () => {
  //   let updates = {title:""}
  //   let udata = await database3.update({"_id":doc_inserted._id})
  //   assert(data.doc.data.secret == book1.secret) 
  // })

  it('updating encrypted field', async () => {
    let updates = {secret:"Something else"}
    let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{data:updates}})
    let rdata= await database3.read({_id:doc_inserted._id})
    assert(rdata.doc.data.secret === updates.secret )
  })

  it('updating  meta.link', async () => {
    let updates = {title:"Something else"}
    let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{meta:{link:"this-is-new"}}})
    //console.log(udata)
    let rdata= await database3.read({_id:doc_inserted._id})
    //console.log(rdata)
    assert(rdata.doc.meta.link === "this-is-new" )
  })

    it('error updating  meta.link not valid ', async () => {
      await rejects(async () => {
        try {
          let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{meta:{link:1234}}})
        } catch (error) {
          //console.log(error)
          throw error
        }
      }, ValidationError)
  })

  it('error updating  meta.link already exists ', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{meta:{link:"sample2"}}})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocUpdateError)
})


  it('updating  meta.tags,link at the same time ', async () => {
    let updates = {tags:["something","in","the","way"],link:"something-in-the-way"}
    let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{meta:updates}})
    let rdata= await database3.read({_id:doc_inserted._id})
    assert(rdata.doc.meta.tags.join(",") == updates.tags.join(",") && rdata.doc.meta.link === updates.link )
  })

  it('updating  meta.tags ', async () => {
    let updates = {tags:["something","in","the","way","all","apologies"]}
    let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{meta:updates}})
    let rdata= await database3.read({_id:doc_inserted._id})
    assert(rdata.doc.meta.tags.join(",") == updates.tags.join(","))
  })


  it('error when updating fields that does not exists', async () => {
    await rejects(async () => {
      try {
        let updates = {text1:"sample text 1"}
        let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{data:updates}})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocUpdateError)
  })

  it('updating only non editable fields generates error', async () => {
    await rejects(async () => {
      try {
        let updates1 = {page:1234,genre:"Horror"}
        let udata = await database3.update({criteria:{"_id":doc_inserted._id},"updates":{data:updates1}})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocUpdateError)  
  })

  it('updating  non editable fields not allowed', async () => {
    let updates = {title:"HP1234",genre:"Horror"}
    let udata = await database3.update({criteria:{"_id":doc_inserted._id},updates:{data:updates}})
    let rdata= await database3.read({_id:doc_inserted._id})
    assert(rdata.doc.data.title == updates.title && rdata.doc.data.genre != updates.genre )
  })
})

/**
 * Delete doc 
 */

describe("Doc delete tests", async () => {
  let database3

  const book1 = {
    title: "Harry Potter",
    author: "J.K. Rowling",
    isbn: "9780439139601",
    publicationYear: 1999,
    genre: "Fantasy",
    publisher: "ABC DEF",
    secret:"Super secret1"
  }
  const meta = {
    link:"sample1",
    tags:["tag1"]
  }
  let doc_inserted 

  before(async () => {
    try {
      let doc_obj = get_pdb_doc("test_database_30", "qwertyuiopaqwsde45451254");
      database3 = new BeanBagDB(doc_obj);
      let test_schema  = {...good_book_schema_2}
      test_schema["settings"]["non_editable_fields"] = ['pages','genre']
      test_schema["settings"]["primary_keys"] = ['title','author']

      await database3.ready(); // Ensure the database is ready before running tests
      let a = await database3.create({schema:"schema",data:test_schema})
      doc_inserted = await database3.create({schema:"book",data:book1,meta:meta})
      let b = await database3.create({schema:"book",data:{...book1,title:"HP2"},meta:{...meta,link:"sample2"}})
      //console.log(b)
      console.log("Ready for more tests...");  
    } catch (error) {
      //console.log("error in before")
      console.log(error)
    }
  })

  it('error when doc not found ', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.delete({})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, ValidationError)
  })

  it('error when doc not found ', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.delete({_id:"1234"})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, DocNotFoundError)
  })



  it('error when deleting system schema', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.delete({"schema":"schema","criteria":{"name":"schema"}})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, Error)
  })

  it('error when deleting custom schema', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.delete({"schema":"schema","criteria":{"name":"book"}})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, Error)
  })

  it('doc deleted successfully', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.delete({"_id":doc_inserted._id})
        let del_doc = await database3.read({"_id":doc_inserted._id})
      } catch (error) {
        throw error
      }
    }, DocNotFoundError)
  })
})

// search 
describe("Doc search tests", async () => {
  let database3
  const book1 = {
    title: "Harry Potter",
    author: "J.K. Rowling",
    isbn: "9780439139601",
    publicationYear: 1999,
    genre: "Fantasy",
    publisher: "ABC DEF",
    secret:"Super secret1"
  }

  const book2 = {
    title: "Harry Potter 2",
    author: "J.K. Rowling",
    isbn: "9780439139601",
    publicationYear: 1999,
    genre: "Fantasy",
    publisher: "ABC DEF",
    secret:"Super secret1"
  }

  const meta = {
    link:"sample1",
    tags:["tag1"]
  }
  let doc_inserted 
  before(async () => {
    // adding a schema
    let doc_obj = get_pdb_doc("test_database_31", "qwertyuiopaqwsde12544545");
    database3 = new BeanBagDB(doc_obj);
    let test_schema  = {...good_book_schema_2}
    test_schema["settings"]["non_editable_fields"] = ['pages','genre']
    test_schema["settings"]["primary_keys"] = ['title','author']
    await database3.ready(); // Ensure the database is ready before running tests
    try {
      let a = await database3.create({schema:"schema",data:test_schema})
      doc_inserted = await database3.create({schema:"book",data:book1,meta:meta})
      let b = await database3.create({schema:"book",data:book2,meta:{...meta,link:"sample2"}})
      //console.log(b)
      console.log("Ready for more tests...");  
    } catch (error) {
      //console.log("error in before")
      console.log(error)
    }
  })


  it('error error with invalid query', async () => {
    await rejects(async () => {
      try {
        let udata = await database3.search({})
      } catch (error) {
        //console.log(error)
        throw error
      }
    }, ValidationError)
  })

  it('all docs', async () => {
      try {
        let udata = await database3.search({selector:{}})
        assert(udata.docs.length==12)
      } catch (error) {
        //console.log(error)
        throw error
      }
  })

  it('read docs', async () => {
    try {
      let udata = await database3.search({selector:{"schema":"book"}})
      assert(udata.docs.length==2)
    } catch (error) {
      //console.log(error)
      throw error
    }
  })

  it('read docs 2', async () => {
    try {
      let udata = await database3.search({selector:{"schema":"schema"}})
      assert(udata.docs.length==8) // schema,book,setting,key,edge,edge_constraints
    } catch (error) {
      //console.log(error)
      throw error
    }
  })

  it('read docs 3', async () => {
    try {
      let udata = await database3.search({selector:{"meta.link":"sample1"}})
      assert(udata.docs.length==1) // schema,book,setting,key
    } catch (error) {
      //console.log(error)
      throw error
    }
  })

  it('read docs 4', async () => {
    try {
      let udata = await database3.search({selector:{"schema":"book","data":{"title":"Book"}}})
      assert(udata.docs.length==0) // schema,book,setting,key
    } catch (error) {
      //console.log(error)
      throw error
    }
  })

  // it('error when deleting system schema', async () => {
  //   await rejects(async () => {
  //     try {
  //       let udata = await database3.delete({"schema":"schema","criteria":{"name":"schema"}})
  //     } catch (error) {
  //       //console.log(error)
  //       throw error
  //     }
  //   }, Error)
  // })

  // it('error when deleting custom schema', async () => {
  //   await rejects(async () => {
  //     try {
  //       let udata = await database3.delete({"schema":"schema","criteria":{"name":"book"}})
  //     } catch (error) {
  //       //console.log(error)
  //       throw error
  //     }
  //   }, Error)
  // })

})
