// to test initialization of the BeanBagDB class. using in memory pouch db for testing to avoid additional setup.
const PouchDB = require("pouchdb");
PouchDB.plugin(require("pouchdb-find"));
const crypto = require('crypto');
const db_name = "test_database_24"
const pdb = new PouchDB(db_name);
const doc_obj = {
  name: db_name,
  encryption_key: "qwertyuiopaqwsde1254",
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
    encrypt: (text, encryptionKey) => {
      const key = crypto.scryptSync(encryptionKey, "salt", 32); // Derive a 256-bit key
      const iv = crypto.randomBytes(16); // Initialization vector
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      return iv.toString("hex") + ":" + encrypted; // Prepend the IV for later use
    },
    decrypt: (encryptedText, encryptionKey) => {
      const key = crypto.scryptSync(encryptionKey, "salt", 32); // Derive a 256-bit key
      const [iv, encrypted] = encryptedText
        .split(":")
        .map((part) => Buffer.from(part, "hex"));
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    },
    ping: () => {
      // @TODO ping the database to check connectivity when class is ready to use
    },
  },
}

the_correct_object = {};

const assert = require("assert");

const BeanBagDB = require("../src/index");

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
const full_util = {util: { encrypt: () => {}, decrypt: () => {}, ping: () => {} },}
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
    { ...test_obj, ...full_api, util: { decrypt: () => {}, ping: () => {} } },
  ],
  [
    "util.decrypt missing",
    { ...test_obj, ...full_api, util: { encrypt: () => {}, ping: () => {} } },
  ],
  [
    "util.ping missing",
    {
      ...test_obj,
      ...full_api,
      util: { encrypt: () => {}, decrypt: () => {} },
    },
  ],
];

let database;

describe("Tests initialization of the BeanBagDB class without no init object", async () => {
  it("Throws error", () => {
    assert.throws(() => {
      database = new BeanBagDB();
    }, Error);
  });
});

describe("Tests initialization of the BeanBagDB class with incomplete init object", async () => {
  /*
   * Proper object : {name,encryption_key,api:{insert,updated,delete,search,get,createIndex},utils:{encrypt,decrypt,ping}}
   */
  it("Blank object throw error", () => {
    assert.throws(() => {
      database = new BeanBagDB({});
    }, Error);
  });
  it("some invalid field throws error", () => {
    assert.throws(() => {
      database = new BeanBagDB({ dbname: "sample" });
    }, Error);
  });
  test_set1.forEach((item) => {
    it(`only ${item[0]} throws error`, () => {
      assert.throws(() => {
        let key = item[0];
        database = new BeanBagDB({ key: item[1] });
      }, Error);
    });
  });
  test_set_api.forEach((item) => {
    it(`${item[0]} throws error`, () => {
      assert.throws(() => {
        let obj = { ...item[1] };
        database = new BeanBagDB(obj);
      }, Error);
    });
  });
});

describe("Successful database class init", async () => {
  it("global database variable not yet initialized", () => {
    assert.strictEqual(
      database instanceof BeanBagDB,
      false,
      "The variable is not yet initialized"
    );
  });

  it("DB init successful", () => {
    database = new BeanBagDB(doc_obj);
    assert.strictEqual(
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
