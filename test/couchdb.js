import {BeanBagDB}  from '../src/index.js';
import crypto from 'crypto' 
// const SDB = require("beanbagdb")

import Ajv  from 'ajv';
import nano from "nano";  

export class BeanBagDB_CouchDB extends BeanBagDB {
  constructor(db_url,db_name,encryption_key){
    //const cdb = import("nano")(db_url)
    const cdb = nano(db_url)
    const doc_obj = {
      db_name:"couchdb",
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
        encrypt: async (text, encryptionKey) => {
          const encoder = new TextEncoder();
          const data = encoder.encode(text); // Encode the text into bytes
  
          // Ensure the encryption key is of valid length (16, 24, or 32 bytes for AES-GCM)
          const keyBytes = encoder.encode(encryptionKey);
          if (
            keyBytes.length !== 16 &&
            keyBytes.length !== 24 &&
            keyBytes.length !== 32
          ) {
            throw new Error("Encryption key must be 16, 24, or 32 bytes long.");
          }
  
          // Convert encryptionKey to CryptoKey
          const key = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "AES-GCM" },
            false,
            ["encrypt"]
          );
  
          // Create a random initialization vector (IV)
          const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
  
          // Encrypt the data
          const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
          );
  
          // Convert encrypted data and IV to base64 for storage
          const encryptedArray = new Uint8Array(encrypted);
          const encryptedText = btoa(String.fromCharCode(...encryptedArray));
          const ivText = btoa(String.fromCharCode(...iv));
  
          return ivText + ":" + encryptedText; // Store IV and encrypted text together
        },
        decrypt: async (encryptedText, encryptionKey) => {
          const [ivText, encryptedData] = encryptedText.split(":");
  
          // Convert IV and encrypted data from base64 to byte arrays
          const iv = Uint8Array.from(atob(ivText), (c) => c.charCodeAt(0));
          const encryptedArray = Uint8Array.from(atob(encryptedData), (c) =>
            c.charCodeAt(0)
          );
  
          const encoder = new TextEncoder();
  
          // Convert encryptionKey to CryptoKey
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(encryptionKey),
            { name: "AES-GCM" },
            false,
            ["decrypt"]
          );
  
          // Decrypt the data
          const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encryptedArray
          );
  
          // Convert decrypted data back to a string
          const decoder = new TextDecoder();
          return decoder.decode(decrypted);
        },
        ping : ()=>{
          // @TODO ping the database to check connectivity when class is ready to use
        },
        validate_schema: (schema_obj, data_obj)=>{
          const ajv = new Ajv({code: {esm: true},strict:false,useDefaults:true})  // options can be passed, e.g. {allErrors: true}
          const data_copy = {...data_obj}
          const validate = ajv.compile(schema_obj);
          const valid = validate(data_copy);
  
          return {valid,validate,data:data_copy}
        }
      }
    }
    super(doc_obj)
  }
}

  
