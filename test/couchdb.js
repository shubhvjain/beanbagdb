// const crypto = require('crypto');
// const SDB = require("beanbagdb")

import Ajv  from 'ajv';
import nano from "nano";  
import BeanBagDB  from '../src/index.js';

export class BeanBagDB_CouchDB extends BeanBagDB {
  constructor(db_url,db_name,encryption_key){
    //const cdb = import("nano")(db_url)
    const cdb = nano(db_url)
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
        },
        delete: async (doc_id)=>{
          const data = await cdb.get(id)
          await cdb.destroy(data._id,data._rev)
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
        },
        validate_schema: (schema_obj, data_obj)=>{
          const ajv = new Ajv({code: {esm: true}})  // options can be passed, e.g. {allErrors: true}
          const validate = ajv.compile(schema_obj);
          const valid = validate(data_obj);
          return {valid,validate}
        }
      }
    }
    super(doc_obj)
  }
}

  
