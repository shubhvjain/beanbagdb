
import { get_pdb_doc } from './pouchdb.js';
import { throws, strictEqual } from "assert";
import {BeanBagDB}  from '../src/index.js';

(async()=>{

  // let schema_docs_invalid = [
  //   {
  //     name: "",
  //     description: "",
  //     schema: {},
  //     settings: {},
  //   }
  //   ]
  let doc_obj = get_pdb_doc("test_database_27","qwertyuiopaqwsde1254")
  let database1 = new BeanBagDB(doc_obj);
  // await database.ready()
  // let a = await database.create("schema",schema_docs_invalid[0])

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


  await database1.ready(); // Ensure the database is ready before running tests
 
  try {
    //console.log(test_schema)
    let a = await database1.create("schema",test_schema)

  } catch (error) {
    console.log("error in before")
    console.log(error)
  }

  const book1 = {
    title: "Harry Potter",
    author: "J.K. Rowling",
    isbn: "9780439139601",
    publicationYear: 1999,
    genre: "Fantasy",
    publisher: "ABC DEF",
    secret: "Super secret 1"
};

let d 
  try {
    d = await database1.create("book", book1,{link:"sample1"});   
    console.log(d)
    let rec = await database1.read({"_id":d._id});   
    console.log(rec)

    let e = await database1.create("book", {...book1,title:"Something"},{link:"sample1"});   
    console.log(e)

  } catch (error) {
    console.log(error)
    throw error
  }

})()