// this is a pouch db instance of beanbagdb used for testing.
import Ajv  from 'ajv';
import PouchDB from 'pouchdb';
import pouchdbFind from 'pouchdb-find';
PouchDB.plugin(pouchdbFind)
import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'crypto';


export const get_pdb_doc = (dbname,secret)=>{
const pdb = new PouchDB(dbname);
  const doc_obj = {
    name: dbname,
    db_name:"pouchdb",
    encryption_key: secret,
    api: {
      insert: async (doc) => {
        const result = await pdb.post(doc);
        return result;
      },
      // delete: ()=>{db1.destroy},
      update: async (doc) => {
        const result = await pdb.put(doc);
        return result;
      },
      search: async (query) => {
        const results = await pdb.find(query);
        return results; // of the form {docs:[],...}
      },
      get: async (id) => {
        const data = await pdb.get(id);
        return data;
      },
      delete: async (id) => {
        const doc = await pdb.get(id);
        const resp = await pdb.remove(doc);
        return resp;
      },
      createIndex: async (filter) => {
        const data = await pdb.createIndex(filter);
        return data;
      },
    },
    utils: {
      encrypt: async (text, encryptionKey) => {
        //console.log(encryptionKey)
        const key = scryptSync(encryptionKey, "salt", 32); // Derive a 256-bit key
        const iv = randomBytes(16); // Initialization vector
        const cipher = createCipheriv("aes-256-cbc", key, iv);
        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");
        //console.log("IV:", iv.toString("hex"));
        //console.log("Encrypted:", encrypted);
        return iv.toString("hex") + ":" + encrypted; // Prepend the IV for decryption
      },
      decrypt: async  (encryptedText, encryptionKey) => {
        //console.log(encryptedText, encryptionKey)
        const key = scryptSync(encryptionKey, "salt", 32); // Derive a 256-bit key
        const [ivHex, encryptedHex] = encryptedText.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const encrypted = Buffer.from(encryptedHex, "hex");
        //console.log("IV:", iv.toString("hex"));
        //console.log("Encrypted:", encrypted.toString("hex"));
        const decipher = createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      },
      ping: () => {
        // @TODO ping the database to check connectivity when class is ready to use
      },
      validate_schema: (schema_obj, data_obj)=>{
        const ajv = new Ajv({code: {esm: true},strict:false,useDefaults:true})  // options can be passed, e.g. {allErrors: true}
        const data_copy = {...data_obj}
        const validate = ajv.compile(schema_obj);
        const valid = validate(data_copy);

        return {valid,validate,data:data_copy}
      }
    },
  }
  return doc_obj
}
