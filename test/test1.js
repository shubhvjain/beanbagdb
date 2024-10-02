// // require("dotenv").config();
// import 'dotenv/config'
// // import * as cbbdb from "../src/couchdb.js"
// // const cbbdb = require("../src/couchdb.js");
// // const pbbdb = require("../src/pouchdb.js");
// import BeanBagDB_PouchDB from "../src/pouchdb.js";
// import BeanBagDB_CouchDB from "../src/couchdb.js";
// // const pl1  = require("./helper.js")

// (async()=>{
//   // console.log(process.env.cdburl)
//   let db = new BeanBagDB_CouchDB(process.env.cdburl, process.env.cdbname, "sample_key");
//   try {
//     await db.ready();
//     await db.initialize_db();
//     await db.update_indexes()
//   } catch (error) {
//     console.log(error);
//   }
// })()

// async function main1() {
//   let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  
//   try {
//     await db.ready();
//     await db.initialize_db();
//     await db.update_indexes()
//   } catch (error) {
//     console.log(error);
//   }
// }

// async function main2() {
//   let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
//   await db.ready();
//   // await db.update_indexes()
//   sample_setting_docs = [
//     {
//       name: "sample1",
//       value: "sample thing here",
//     },
//     {
//       name: "no_value",
//     },
//     {
//       value: "incorrect name",
//     },
//     {
//       name: "sample1",
//       value: "sample thing here",
//     },
//     {
//       name: "sample1",
//       value: "primary key check",
//     },
//     {
//       name: "Sample2",
//       value: "normal insert",
//     },
//     {
//       value: "No name provided",
//     },
//   ];
//   let t = sample_setting_docs.length
//   for (let i = 0; i < t; i++) {
//     try {
//       let newid =  await db.insert("system_settings",sample_setting_docs[i])
//       console.log(newid)
//     } catch (error) {
//       console.log("Error "+i)
//       console.error(error)
//       continue
//     }
//   }
// }

// async function main3() {
//   let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
//   await db.ready();
//   // await db.update_indexes()
//   sample_setting_docs = [
//     {
//       name: "sample1",
//       value: "sample thing here",
//     },
//     {
//       name: "sample2",
//       value: "sample thing here again",
//     },
   
//     {
//       name: "sample1",
//       value: "sample thing here again",
//     },
//   ];
//   let t = sample_setting_docs.length
//   for (let i = 0; i < t; i++) {
//     try {
//       let newid =  await db.insert("system_keys",sample_setting_docs[i])
//       console.log(newid)
//     } catch (error) {
//       console.log("Error "+i)
//       console.error(error)
//       continue
//     }
//   }
// }


// async function main4(){
//   let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
//   await db.ready();
//   let doc1 = await db.get("e94b5eebe6b3c6dab8e2508d5908717c")
//   console.log(doc1)
//   let doc2 = await db.get_doc("system_keys",{"name":"sample2"})
//   console.log(doc2)
//   let doc3 = await db.get_doc("system_logs")
//   console.log(doc3)
// }

// async function main5(){
//   let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
//   await db.ready();
//   let id = "e94b5eebe6b3c6dab8e2508d5908717c"
//   let rec_1 = await db.get(id)
//   let rec1 = rec_1.doc
//   console.log(rec1)
//   let rec1u = await db.update(id,"",{data:{"value":"secret key updated"},meta:{tags:["testing1","testing2","money"]}})
//   console.log(rec1u)
//   let r1 = await db.get(id)
//   console.log(r1)
// }

// async function main6(){
//   let db = new pbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
//   await db.ready()
//   //await db.initialize_db()

// }

// // main1().then(() => {console.log("Bye.");}).catch();

// // main3().then(() => {console.log("Bye.");}).catch();

// // main4().then(() => {console.log("Bye.");}).catch();

// // main5().then(() => {console.log("Bye.");}).catch();

// // main6().then(() => {console.log("Bye.");}).catch();


// // (async ()=>{
// //   let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
// //   await db.ready();
// //   db.load_plugin("sample",pl1)
// // })();

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
    d = await database1.create("book", book1);   
    console.log(d)
  } catch (error) {
    console.log(error)
    throw error
  }


  try {
    let rec = await database1.read({"_id":d._id});   
    console.log(rec)
  } catch (error) {
    console.log(error)
    throw error
  }


})()