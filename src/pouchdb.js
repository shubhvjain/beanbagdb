const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
const crypto = require('crypto');
const SDB = require("./index.js")

class BeanBagDB_PouchDB extends SDB {
  constructor(db_url,db_name,encryption_key){
    const pdb = new PouchDB(db_name);
    const doc_obj = {
      name: db_name,
      encryption_key: encryption_key,
      api:{
       insert: async (doc)=>{
        const result = await pdb.post(doc)
        return result
       },
       // delete: ()=>{db1.destroy},
        update: async (doc)=>{
          const result = await pdb.put(doc)
          return result
        },
        search: async (query)=>{
          const results = await pdb.find(query)
          return results // of the form {docs:[],...}
        },
        get: async (id)=>{
          const data = await pdb.get(id)
          return data
        },
        delete:async (id)=>{
          const doc = await pdb.get(id)
          const resp = await pdb.remove(doc)
          return resp 
        },
        createIndex: async (filter)=>{
          const data = await pdb.createIndex(filter)
          return data
        }
      },
      utils:{
        encrypt:  (text,encryptionKey)=>{
          const key = crypto.scryptSync(encryptionKey, 'salt', 32); // Derive a 256-bit key
          const iv = crypto.randomBytes(16); // Initialization vector
          const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
          let encrypted = cipher.update(text, 'utf8', 'hex');
          encrypted += cipher.final('hex');          
          return iv.toString('hex') + ':' + encrypted; // Prepend the IV for later use
        },
        decrypt :  (encryptedText, encryptionKey)=>{
          const key = crypto.scryptSync(encryptionKey, 'salt', 32); // Derive a 256-bit key
          const [iv, encrypted] = encryptedText.split(':').map(part => Buffer.from(part, 'hex'));
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        },
        ping : ()=>{
          // @TODO ping the database to check connectivity when class is ready to use
        }
      }
    }
    super(doc_obj)
  }
}

module.exports = BeanBagDB_PouchDB