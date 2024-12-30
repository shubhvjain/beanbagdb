
import { get_pdb_doc } from './pouchdb.js';
import { throws, strictEqual } from "assert";
import {BeanBagDB}  from '../src/index.js';
import {text_command} from "../src/plugins/text_command.js"

(async()=>{
let database; // this is the global db object
let doc_obj = get_pdb_doc("test_database_40", "qwertyuiopaqwsde1254");
database = new BeanBagDB(doc_obj);
await database.ready(); // Ensure the database is ready before running tests
// await database.load_plugin("txtcmd",text_command)
// console.log()
// let command = await database.plugins["txtcmd"].parse_and_run("new/schema")
// console.log(command)
// let command2 = await database.plugins["txtcmd"].parse_and_run("new")
// console.log(command2)
// let command3 = await database.plugins["txtcmd"].parse_and_run("open/link/thunder-kangchenjunga-mango")
// console.log(command3)
// let command4 = await database.plugins["txtcmd"].parse_and_run("tool/info")
// console.log(command4)
const test_schema = {
  name:"book",
  title:"Book",
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

try {
      //console.log(test_schema)
      let a = await database.create("schema",test_schema)
      console.log(a)
    } catch (error) {
      console.log("error in before")
      console.log(error)
    }
  

    // try {
    //   //console.log(test_schema)
    //   let a = await database.update({link:"7f82b8"},{meta:{tags:["sample"]}})
    //   console.log(a)
    // } catch (error) {
    //   console.log("error in before")
    //   console.log(error)
    // }

})()



