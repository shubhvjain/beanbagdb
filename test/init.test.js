// to test initialization of the BeanBagDB class. using in memory pouch db for testing to avoid additional setup. 
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
const assert = require('assert');
const BBDB = require("../src/index")

describe("Tests initialization of the BeanBagDB class",async()=>{
  it("Throws error with no init object",()=>{
    assert.throws(()=>{
      const db = new BBDB()
    },Error)
  })
})
