Ajv = require("ajv");
sys_sch = require("./system_schema");
const packageJson = require("../package.json");
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
   * - `api` : this is an object that must contain database specific functions. This includes :  `insert(doc)`: takes a doc and runs the db insertion function,  `update(updated_doc)` : gets the updated document and updates it in the DB,  `search(query)`: takes a query to fetch data from the DB (assuming array of JSON is returned ), `get(id)`: takes a document id and returns its content, `createIndex(filter)`: to create an index in the database based on a  filter
   * - `utils` : this includes `encrypt`, `decrypt`
   */
  constructor(db_instance) {
    const requiredFields = ["name", "encryption_key", "api","utils"];
    for (const field of requiredFields) {if (!db_instance[field]) {throw new Error(`${field} is required`);}}
    this.name = db_instance.name;
    this.encryption_key = db_instance.encryption_key;

    // @TODO check this if they have everything needed 
    this.db_api = db_instance.api;
    this.utils = db_instance.utils
    
    this._version = packageJson.version; // package version
    let theClass = this
    this.ready_check = {initialized: false,latest:false}
    console.log("Run ready() now")
  }

  /**
   * This is to check if the database is ready to be used. It it important to run this after the class is initialized.
   */
  async ready(){
    console.log("Checking...")
    // @TODO : ping the database 
    this.ready_check =  await this._check_ready_to_use()
    if(this.ready_check.initialized){
      console.log("Ready to use!")
    }
  }

  /**
   * Checks if the selected database is initialized for working with BeanBagDB. Also throws a warning if package version does not match with database version.
   * Every time a database is initialized, a setting document `beanbagdb_version` is added. If this does not exists, the database is not initialized. If it exists but does not match the current version, a warning is shown.
   * @returns {object} {initialized:boolean,latest:boolean}
   */
  async _check_ready_to_use() {
    let check = { initialized: false, latest: false };
    // @TODO this is not really fool proof. check all the required docs, they have the system_generated flag
    // what if some user mistakenly modifies or deletes some of the required docs ?
    let version_search = await this.db_api.search({selector: { schema: "system_settings", "data.name": "beanbagdb_version" }});
    if (version_search.docs.length > 0) {
      let doc = version_search.docs[0];
      check.initialized = true;
      check.latest = doc["data"]["value"] == this._version;
    }
    if (check.initialized==false) {console.warn("This database is not ready to be used. It is not initialized. Run `initialize_db()` first")}
    if ((check.latest==false) & (check.initialized==true)) {console.warn("This database is not updated with the latest version. Run `initialize_db()` again to update to the latest version")}
    return check;
  }

  /**
   * Initializes the database making it ready to be used. Typically, required to run after every time package is updated to a new version.
   * See the documentation on the architecture of the DB to understand what default schemas are required for a smooth functioning of the database
   */
  async initialize_db() {
    try {
      if (this.ready_check.initialized==false) {
        // add the   meta-schemas doc
        let schema_schema_doc = this._get_blank_doc("schema");
        schema_schema_doc.data = sys_sch.schema_schema;
        await this.db_api.insert(schema_schema_doc);
        // add system schemas
        let keys = Object.keys(sys_sch.system_schemas);
        for (let index = 0; index < keys.length; index++) {
          const element = sys_sch.system_schemas[keys[index]];
          let schema_record = this._get_blank_schema_doc("schema",sys_sch.schema_schema["schema"],element)
          await this.db_api.insert(schema_record);
        }
        // create an index
        await this.db_api.createIndex({index: { fields: ["schema", "data", "meta"] }});
        console.log("Database Indexed.")
        // create the log doc 
        const log_schema = sys_sch.system_schemas["logs"]["schema"];
        let log_doc = this._get_blank_schema_doc("system_logs",log_schema,{"logs":[{"message":`Database is initialized with version ${this._version}.`,"on":this._get_now_unix_timestamp(),"human_date":new Date().toLocaleString()}]})
        await this.db_api.insert(log_doc)
        // create the setting doc
        const setting_schema = sys_sch.system_schemas["settings"]["schema"]
        let setting_doc = this._get_blank_schema_doc("system_settings",setting_schema,{"name":"beanbagdb_version","value":this._version,"user_editable":false})
        await this.db_api.insert(setting_doc)
        // finally update the flags
        this.ready_check.initialized = true;
        this.ready_check.latest = true;
        console.log("Database initialized");
      } else {
        console.log("Database already initialized")
        if (!this.ready_check.latest) {
          // update to latest schema
          this._update_system_schema();
        }else{
          console.log("Database already up to date")
        }
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Adds indexes for all the schemas in the data base. This is important to make search faster. This must be done every time a new schema is introduced in the database
   */
  async update_indexes(){
    let all_schemas_docs = await this.db_api.search({"selector":{"schema":"schema"}})
    let indexes = []
    all_schemas_docs.docs.map(item=>{Object.keys(item.data.schema.properties).map(key=>{indexes.push("data."+key)})})
    await this.db_api.createIndex({index: { fields: indexes }});
  }

  /**
   * Validates a data object against a provided JSON schema
   * It relies on the Ajv package to make the validation.
   * @param {Object} schema_obj - The JSON schema object to validate against
   * @param {Object} data_obj - The data object to validate
   * @throws {Error} If the data object does not conform to the schema
   */
  validate_data(schema_obj, data_obj) {
    const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
    const validate = ajv.compile(schema_obj);
    const valid = validate(data_obj);
    if (!valid) {
      console.log(validate.errors);
      throw new Error(validate.errors);
    }
  }

  /**
   * Returns the current Unix timestamp in seconds.
   * @returns {number}
   */
  _get_now_unix_timestamp(){
    return Math.floor(Date.now() / 1000); // divide by 1000 (Date.now gives ms) to convert to seconds. 1 s = 1000 ms
  }

  /**
   * Generates a black database json object. All objects in the database follow the same structure
   * @param {string} schema_name
   * @returns {object}
   */
  _get_blank_doc(schema_name) {
    if (!schema_name) {throw new Error("Schema name not provided for the blank doc")}
    let doc = {
      data: {},
      meta: {
        createdOn: this._get_now_unix_timestamp(),
        tags: [],
      },
      schema: schema_name,
    };
    return doc;
  }

  /**
   * Generates a blank schema doc ready to be inserted to the database. Note that no validation is done. This is for internal use
   * @param {string} schema_name 
   *  @param {Object} schema_object 
   * @param {Object} data 
   * @returns {Object}
   */
  _get_blank_schema_doc(schema_name,schema_object,data){
    this.validate_data(schema_object,data)
    let obj =  this._get_blank_doc(schema_name)
    obj["data"] = data
    return obj
  }

  /**
   * To update the system schema or reset to a stable version to ensure functioning of the BeanBagDB
   */
  async _update_system_schema() {
    console.log("Todo")
  }

  async log(stuff) {
    // incomplete
    let log_obj = await this.get_doc("system_logs", {});
    stuff["on"] = this.get_now_unix_timestamp();
    log_obj["data"]["logs"].push(stuff);
    let a = await this.update_data(
      log_obj["_id"],
      log_obj["_rev"],
      "setting",
      log_obj["data"]
    );
  }

  //**  Get documents ***/
  /**
   * Returns a document with the provided ID
   * @param {string} doc_id
   * @returns {object}
   */
  async get(doc_id) {
    let doc = await this.db_api.get(doc_id);
    return doc;
  }

  /**
   * Fetches a document based on a given schema and primary key. 
   * In case schema has a single record, leave the primary_key blank `[]`
   * Can also be used to get special system docs such as settings 
   * @param {string} schema_name
   * @param {Array} primary_key
   * @returns object
   */
  async get_doc(schema_name, primary_key) {
    // incomplete
    let schemaSearch = await this.db_api.search({
      selector: { schema: "schema", "data.name": schema_name },
    });
    if (schema.docs.length == 0) {
      throw new Error("Schema not found");
    }
    let schema = schemaSearch.docs[0]["data"];

    // let doc = await this.db.get(doc_id);
    return doc;
  }

  //** Search document  */

  /**
   * Searches for documents in the database for the specified query. The query are Mango queries.
   * One field is mandatory : Schema
   * E.g 
   * @param {Object} criteria 
   */
  async search(criteria) {
    if (!criteria["selector"]["schema"]) {
      throw new Error("The search criteria must contain the schema");
    }
    const results = await this.db_api.search(criteria)
    return results
  }

  /**
   * Inserts a doc for the given schema 
   * @param {String} schema e.g "contact"
   * @param {Object} data e.g {"name":"","mobile":""...}
   * @param {Object} settings (optional)
   */
  async insert(schema,data,settings={}){
    try {
      let doc_obj = await this._insert_pre_checks(schema,data,settings)
      console.log(doc_obj)
      let new_rec = await this.db_api.insert(doc_obj)
      return { id: new_rec["id"] }
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  /**
   * Checks if the new document is valid and ready to be inserted in the DB.
   * List of checks:
   * - fetch the schema object and validate the data object against the schema
   * - check if the doc with same primary keys already exists
   * - replace encrypted fields with encrypted values 
   * - return the doc
   */
  async _insert_pre_checks(schema,data,settings={}){
    // schema search 
    let sch_search = await this.search({"selector":{"schema":"schema","data.name":schema}})
    if(sch_search.docs.length==0){throw new Error("Invalid Schema")}
    let schemaDoc = sch_search.docs[0]["data"]
    // validate data
    this.validate_data(schemaDoc.schema,data)

    // special checks for special docs 
    // @TODO : for schema dos: settings fields must be in schema field

    // duplicate check 
    if(schemaDoc.settings["primary_keys"] && schemaDoc.settings["primary_keys"].length>0 ){
      let primary_obj = {"schema":schema}
      schemaDoc.settings["primary_keys"].map(ky=>{primary_obj["data."+ky] = data[ky]})
      console.log(primary_obj)
      let prim_search = await this.search({"selector":primary_obj}) 
      console.log(prim_search)
      if(prim_search.docs.length>0){throw new Error("Doc already exists")}
    }
    // encrypt if required 
    let new_data = {...data}
    if(schemaDoc.settings["encrypted_fields"] && schemaDoc.settings["encrypted_fields"].length>0 ){
      schemaDoc.settings["encrypted_fields"].forEach(itm=>{
        new_data[itm] = this.utils.encrypt(data[itm],this.encryption_key)
      })
    }
    // generate the doc object for data
    let doc_obj = this._get_blank_doc(schema)
    doc_obj["data"] = new_data
    return doc_obj
  }

  

  filterObject(obj, fields) {
    return fields.reduce((filteredObj, field) => {
      if (Object.prototype.hasOwnProperty.call(obj, field)) {
        filteredObj[field] = obj[field];
      }
      return filteredObj;
    }, {});
  }

  //**  Update data  */

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

  
}

module.exports = BeanBagDB;
