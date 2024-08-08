Ajv = require("ajv");
sys_sch = require("./system_schema")
const packageJson = require('./package.json');
/**
 * This the core class. it is not very useful in itself but can be used to generate a sub class for a specific database for eg CouchDB.
 * It takes a db_instance argument, which , this class relies on perform  CRUD operations on the data.
 * Why have a "dumb" class ? : So that the core functionalities remains in a single place and the multiple Databases can be supported. 
 */
class BeanBagDB {
  /**
  * @param {object} db_instance - Database object
  * db_instance object contains 3 main keys :
  * - `name` : the name of the local database
  * - `encryption_key`: this is required for encrypting documents  
  * - `api` : this is an object that must contain database specific functions. This includes 
  *   - `insert(doc)`: takes a doc and runs the db insertion function
  *   - `update(updated_doc)` : gets the updated document and updates it in the DB
  *   - `search(query)`: takes a query to fetch data from the DB (assuming array of JSON is returned ) 
  *   - `get(id)`: takes a document id and returns its content 
  *   - `createIndex(filter)`: to create an index in the database based on a  filter 
  */
  constructor(db_instance) {
    if (!db_instance["name"]) {
      throw new Error("Database name is required");
    }
    this.init_class();
    this.db = db_instance.api 
  }
  init_class() {
    // run from the constructor to initialize the class with required internal variables
    // 
    
    const version = packageJson.version;

    console.log(`Current version: ${version}`);

    this.valid_system_settings = sys_sch.schema;
    this.valid_schema_doc_schema = {
    };
    
  }
  /**
   * Initializes the database making it ready to be used. Typically, required to run after every time package is updated to a new version.
   * See the documentation on the architecture of the DB to understand what default schemas are required for a smooth functioning of the database
   */
  async initialize_db() {
    try {
      await this.log({ message: "Database created" });
      await this.db.createIndex({
        index: { fields: ["schema", "data", "meta"] },
      });
      let tag_doc = await this.get_setting_doc("tags");
      let web_setting = await this.get_setting_doc("web_settings");
      let sample_schema = await this.insert("schema_doc", this.sample_schema);
      await this.log({ message: "Database initialized" });
      //let b = await this.db.allDocs({ include_docs: true });
      //console.log(b);
    } catch (error) {
      console.log(error);
      //let b = await this.db.allDocs({ include_docs: true });
      //console.log(b);
      throw error;
    }
  }

  async log(stuff) {
    let log_obj = await this.get_setting_doc("db_system_log");
    stuff["added_on"] = this.get_now_unix_timestamp();
    log_obj["data"]["logs"].push(stuff);
    let a = await this.update_data(
      log_obj["_id"],
      log_obj["_rev"],
      "setting",
      log_obj["data"]
    );
  }

  async get_setting_doc(setting_name) {
    try {
      if (Object.keys(this.valid_system_settings).indexOf(setting_name) == -1) {
        throw new Error(
          "Invalid setting name provided. Valid setting names are :" +
            Object.keys(this.valid_system_settings)
        );
      }

      let query = {
        selector: { schema: "setting", data: { name: setting_name } },
      };
      // console.log(query)
      let search = await this.db.search(query);
      if (search["docs"].length == 0) {
        // generate a new doc and return it
        let setting_details = this.valid_system_settings[setting_name];
        //console.log(setting_details);
        let blank_data = { ...setting_details["settings"]["default_data"] };
        blank_data["name"] = setting_name;
        let blank_record = this.get_blank_doc("setting");
        blank_record["data"] = blank_data;
        blank_record["meta"]["system"] = true;
        // console.log(blank_record);
        let new_id = await this.insert_doc(blank_record);
        let a = await this.get(new_id["id"]);
        return a;
      } else {
        return search["docs"][0];
      }
    } catch (error) {
      console.log(error);
    }
  }

  async get_schema_doc(schema_name, second = "") {
    // the schema_doc is of the forms  : {schema,setting,name}
    const system_schemas = {
      setting: () => {
        if (second == "") {
          throw new Error(
            "when fetching setting schema, second argument (key name) is required "
          );
        }
        let s_data = this.valid_system_settings[second];
        s_data["name"] = "setting";
        s_data["schema"]["properties"]["name"] = {
          type: "string",
          minLength: 4,
          maxLength: 50,
          pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
        };
        s_data["schema"]["required"] = ["name"];
        s_data["settings"]["primary_key"] = ["name"];
        return s_data;
      },
      schema_doc: () => {
        return { ...this.valid_schema_doc_schema };
      },
      conflict_doc: () => {
        return;
      },
    };

    if (system_schemas[schema_name]) {
      return system_schemas[schema_name]();
    } else {
      let s_doc = await this.db.search({
        selector: { schema: "schema_doc", "data.name": schema_name },
      });
      if (s_doc["docs"].length == 0) {
        throw new Error("Schema not defined in the database");
      }
      return s_doc["docs"][0]["data"];
    }
  }

  validate_data(schema_obj, data_obj) {
    const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
    const validate = ajv.compile(schema_obj);
    const valid = validate(data_obj);
    if (!valid) {
      console.log(validate.errors);
      throw new Error(validate.errors);
    }
  }

  async search(criteria) {
    if (!criteria["schema"]) {
      throw new Error("The search criteria must contain the schema");
    }
  }

  async duplicate_doc_check(schema_obj, data_obj) {
    let doc_obj = { schema: { $eq: schema_obj["name"] } };
    schema_obj["settings"]["primary_key"].forEach((element) => {
      doc_obj["data." + element] = { $eq: data_obj[element] };
    });
    let doc_check = { selector: doc_obj };
    let docs_found = await this.db.search(doc_check);
    console.log(doc_check, docs_found);
    if (docs_found["docs"].length > 0) {
      throw new Error("Document already exists");
    }
  }
  validate_new_schema_object(schema_name, record_data) {
    // check if the name is not from the system defined schemas , check the values of settings fields etc....
    // also editable_fields must not be blank
    return;
  }

  async insert_pre_check(schema_name, record_data) {
    // read schema
    let secondArg = "";
    if (schema_name == "setting") {
      secondArg = record_data["name"];
    }
    let opt = { allow: false, errors: [] };
    //console.log(secondArg);
    let schemaDoc = await this.get_schema_doc(schema_name, secondArg);
    // validate data
    // console.log(record_data);
    this.validate_data(schemaDoc["schema"], record_data);
    // todo generate a new doc with default values when validating obj
    if (schema_name == "schema_doc") {
      this.validate_new_schema_object(schema_name, record_data);
    }
    // check if already exists
    await this.duplicate_doc_check(schemaDoc, record_data);
  }
  async insert_doc(data) {
    try {
      await this.insert_pre_check(data["schema"], data["data"]);
      this.validate_doc_object(data);
      let new_rec = await this.db.insert(data);
      // console.log(new_rec)
      return { id: new_rec["id"] };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async insert(schema_name, data) {
    try {
      await this.insert_pre_check(schema_name, data);
      let new_record = this.get_blank_doc(schema_name);
      new_record["data"] = data;
      this.validate_doc_object(new_record);
      let new_rec = await this.db.insert(new_record);
      return { id: new_rec["id"] };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  

  async get(doc_id) {
    let doc = await this.db.get(doc_id);
    return doc;
  }

  async load_doc(doc_id) {
    let d = await this.get(doc_id);
    let s = await this.get_schema_doc(d["schema"]);
    return {
      doc: d,
      schema: s,
    };
  }

  async load_editor_settings() {
    let tags = await this.get_setting_doc("tags");

    let schemas = await this.db.search({ selector: { schema: "schema_doc" } });

    return { tags: tags["data"], schemas: schemas["docs"] };
  }

  filterObject(obj, fields) {
    return fields.reduce((filteredObj, field) => {
      if (Object.prototype.hasOwnProperty.call(obj, field)) {
        filteredObj[field] = obj[field];
      }
      return filteredObj;
    }, {});
  }

  async update_data(
    doc_id,
    rev_id,
    schema_name,
    data_updates,
    save_conflict = true
  ) {
    // making a big assumption here : primary key fields cannot be edited
    // so updating the doc will not generate primary key conflicts
    let secondArg = "";
    if (schema_name == "setting") {
      secondArg = data_updates["name"];
    }
    let schema = await this.get_schema_doc(schema_name, secondArg);
    let full_doc = await this.get(doc_id);
    // generate a new object based on which fields are allowed to be updated
    // TODO what if no editable fields exists
    let allowed_updates = this.filterObject(
      data_updates,
      schema["settings"]["editable_fields"]
    );
    let updated_data = { ...full_doc["data"], ...allowed_updates };
    // validate the new data
    this.validate_data(schema["schema"], updated_data);
    full_doc["data"] = updated_data;
    // new data must be validated against the schema
    if (full_doc["_rev"] != rev_id) {
      // throw error , save conflicting doc separately by default
      if (save_conflict) {
        // save conflicting doc todo
      }
    }
    let up = await this.db.update(full_doc);
    return up;
  }
  async update_metadata(doc_id, rev_id, schema_name, meta_updates) {}

  async delete(doc_id) {}

  get_now_unix_timestamp() {
    const currentTimeMilliseconds = Date.now();
    return Math.floor(currentTimeMilliseconds / 1000);
  }

  get_blank_doc(schema_name) {
    let doc = {
      data: {},
      meta: {
        createdOn: this.get_now_unix_timestamp(),
        tags: [],
      },
      schema: schema_name,
    };
    return doc;
  }
  validate_doc_object(obj) {
    let doc_schema = {
      type: "object",
      required: ["schema", "data", "meta"],
      properties: {
        data: {
          type: "object",
          additionalProperties: true,
        },
        schema: {
          type: "string",
        },
        meta: {
          type: "object",
          additionalProperties: true,
        },
      },
    };
    const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
    const validate = ajv.compile(doc_schema);
    const valid = validate(obj);
    if (!valid) {
      console.log(validate.errors);
      throw new Error(validate.errors);
    }
    return;
  }
  get_metadata_schema() {
    let records_meta_schema = {
      type: "object",
      title: "Doc metadata",
      properties: {},
    };
  }
}

module.exports.BeanBagDB = BeanBagDB;
