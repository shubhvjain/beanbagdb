const SDB = require("./index.js")

class BeanBagDB_CouchDB extends SDB {
  constructor(db_url,db_name,encryption_key){
    const cdb = require("nano")(db_url)
    const doc_obj = {
      name: db_name,
      encryption_key: encryption_key,
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
          return results // of the form {docs:[],...}
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

module.exports = BeanBagDB_CouchDB