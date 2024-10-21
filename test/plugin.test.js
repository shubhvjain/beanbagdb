// to test database operations. assuming the class is initialized successfully
// to test initialization of the BeanBagDB class
import { get_pdb_doc } from "./pouchdb.js";
import assert, { throws, strictEqual, rejects } from "assert";
import { BeanBagDB, DocCreationError, EncryptionError, ValidationError,DocNotFoundError, DocUpdateError } from "../src/index.js";

import {text_command} from "../src/plugins/text_command.js"

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

// Then either:
const expect = chai.expect;

let database; // this is the global db object


describe("Testing plugin load", async () => {
  

  before(async () => {
    let doc_obj = get_pdb_doc("test_database_30", "qwertyuiopaqwsde1254");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    console.log("Ready for more tests...");
  });
  
   

  it('successfully loads the plugin', async () => {
    try {
      await database.load_plugin("txtcmd",text_command)
      chai.expect(database.plugins).to.not.be.empty
    } catch (error) {
      console.log(error)
      throw error
    }
  })

  it('successfully runs the loaded the plugin method', async () => {
    try {
      
      let command = await database["txtcmd"].parse("new/system_keys")
      console.log(command)
      assert (1 ==2) 
    } catch (error) {
      console.log(error)
      throw error
    }
  })
});


