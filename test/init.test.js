// to test initialization of the BeanBagDB class 
import { get_pdb_doc } from './pouchdb.js';
import { throws, strictEqual } from "assert";
import {BeanBagDB}  from '../src/index.js';

/**
 * Initial setup
 * database is the global var where the beanbag class is initialized
 */

const test_set1 = [
  ["name", "sample"],
  ["encryption_key", "sample_key"],
  ["utils", {}],
  ["api", {}],
];
const test_obj = { name: "bla", encryption_key: "1234567890opuityerqwas" };
const full_util = {util: { encrypt: () => {}, decrypt: () => {}, ping: () => {} , validate_schema:()=>{}},}
const full_api = {api: { update: () => {}, delete: () => {}, get: () => {}, search: () => {}, createIndex: () => {}}}
const test_set_api = [
  [
    "api.insert missing",
    {
      ...test_obj,
      ...full_util,
      api: {update: () => {}, delete: () => {}, get: () => {}, search: () => {}, createIndex: () => {}},
    },
  ],
  [
    "api.update missing",
    {
      ...test_obj,
      ...full_util,
      api: {insert: () => {}, delete: () => {}, get: () => {},search: () => {},createIndex: () => {}},
    },
  ],
  [
    "api.delete missing",
    {
      ...test_obj,
      ...full_util,
      api: { insert: () => {}, update: () => {}, get: () => {}, search: () => {}, createIndex: () => {}},
    },
  ],
  [
    "api.get missing",
    {
      ...test_obj,
      ...full_util,
      api: { insert: () => {}, update: () => {}, delete: () => {}, search: () => {}, createIndex: () => {}}
    },
  ],
  [
    "api.search missing",
    {
      ...test_obj,
      ...full_util,
      api: { insert: () => {}, update: () => {}, delete: () => {}, get: () => {}, createIndex: () => {}}
    },
  ],
  [
    "api.createIndex missing",
    {
      ...test_obj,
      ...full_util,
      api: { insert: () => {}, update: () => {}, delete: () => {}, get: () => {}, search: () => {}},
    },
  ],
  [
    "util.encrypt missing",
    { ...test_obj, ...full_api, util: { decrypt: () => {}, ping: () => {}, validate_schema:()=>{} } },
  ],
  [
    "util.decrypt missing",
    { ...test_obj, ...full_api, util: { encrypt: () => {}, ping: () => {}, validate_schema:()=>{} } },
  ],
  [
    "util.validate_schema missing",
    { ...test_obj, ...full_api, util: { encrypt: () => {}, ping: () => {}, decrypt: () => {} } },
  ],
  [
    "util.ping missing",
    {
      ...test_obj,
      ...full_api,
      util: { encrypt: () => {}, decrypt: () => {} ,validate_schema:()=>{}},
    },
  ],
];

let database;

describe("Tests initialization of the BeanBagDB class without no init object", async () => {
  it("Throws error", () => {
    throws(() => {
      database = new BeanBagDB();
    }, Error);
  });
});

describe("Tests initialization of the BeanBagDB class with incomplete init object", async () => {
  /*
   * Proper object : {name,encryption_key,api:{insert,updated,delete,search,get,createIndex},utils:{encrypt,decrypt,ping}}
   */
  it("Blank object throw error", () => {
    throws(() => {
      database = new BeanBagDB({});
    }, Error);
  });
  it("some invalid field throws error", () => {
    throws(() => {
      database = new BeanBagDB({ dbname: "sample" });
    }, Error);
  });
  test_set1.forEach((item) => {
    it(`only ${item[0]} throws error`, () => {
      throws(() => {
        let key = item[0];
        database = new BeanBagDB({ key: item[1] });
      }, Error);
    });
  });
  test_set_api.forEach((item) => {
    it(`${item[0]} throws error`, () => {
      throws(() => {
        let obj = { ...item[1] };
        database = new BeanBagDB(obj);
      }, Error);
    });
  });
});

describe("Successful database class init", async () => {
  it("global database variable not yet initialized", () => {
    strictEqual(
      database instanceof BeanBagDB,
      false,
      "The variable is not yet initialized"
    );
  });

  it("DB init successful", () => {
    let doc_obj = get_pdb_doc("test_database_24","qwertyuiopaqwsde1254")
    database = new BeanBagDB(doc_obj);
    strictEqual(
      database instanceof BeanBagDB,
      true,
      "The variable is initialized successfully"
    );
  });
});

/**
 * process is : create a new obj with all required inputs, run ready() , then initialize_db , then ready to perform operations
 *
 * to test:
 * - no object
 * - incomplete objects and inner objects
 * - good example
 *
 * initialized by ready not called ,
 */
