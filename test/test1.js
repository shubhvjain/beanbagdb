require('dotenv').config()
const SDB = require("../index.js")
const cdb = require("nano")(process.env.cdburl)
const doc_obj = {
  name: process.env.cdbname,
  api:{
   insert: async (doc)=>{
    const result = await cdb.insert(doc)
    return result
   },
   // delete: ()=>{db1.destroy}, 
    update: async (doc)=>{
      const result = await cdb.insert(doc)
      return result
    },
    search: async (query)=>{
      const results = await cdb.find(query)
      return results
    },
    get: async (id)=>{
      const data = await cdb.get(id)
      return data
    },
    createIndex: async (filter)=>{
      const data = await cdb.createIndex(filter)
      return data
    }
  }
}

let db = new SDB.BeanBagDB(doc_obj)
try {
  // db.initialize_db()
} catch (error) {
  console.log(error)
}
