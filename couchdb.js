const SDB = require("./index.js")
class InfoDB_CouchDB extends SDB.InfoDB {
  constructor(db_url,db_name){
    const cdb = require("nano")(db_url)
    const doc_obj = {
      name: db_name,
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
    super(doc_obj)
  }
}

module.exports = InfoDB_CouchDB