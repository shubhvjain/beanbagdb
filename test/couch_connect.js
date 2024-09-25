import * as cdb from "./couchdb.js"
import "dotenv/config"





(async()=>{

  let db = new cdb.BeanBagDB_CouchDB(process.env.cdburl, process.env.cdbname, process.env.secret)  
  
  //db.initialize_db()
  await db.ready()
   console.log(await db.metadata())
  let test_schema = {
    "name":"contact_list",
    "description":"My contact book",
    "schema":{},
    "settings":{}
  }

  //let sch = await  db.insert("schema",test_schema,{"link":"test1"})
  //console.log(sch)


})();



