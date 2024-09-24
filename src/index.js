import * as sys_sch from "./system_schema.js";
// import { version } from "../package.json" assert {type :"json"};
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
    // data validation checks
    this._check_required_fields(["name", "encryption_key", "api", "utils"],db_instance)
    this._check_required_fields(["insert", "update", "delete", "search","get","createIndex"],db_instance.api)
    this._check_required_fields(["encrypt", "decrypt","ping","validate_schema"],db_instance.utils)

    if(db_instance.encryption_key.length>20){throw new Error("encryption_key must have at least 20 letters")}
    // db name should not be blank, 

    this.name = db_instance.name;
    this.encryption_key = db_instance.encryption_key;

    this.db_api = db_instance.api;
    this.utils = db_instance.utils;

    this._version = "0.5.0"
    this.ready_check = { initialized: false, latest: false };
    console.log("Run ready() now");

    this.plugins = {}
  }

  /**
   * This is to check if the database is ready to be used. It it important to run this after the class is initialized.
   */
  async ready() {
    console.log("Checking...");
    // @TODO : ping the database
    // this._version = await getPackageVersion()
    this.ready_check = await this._check_ready_to_use();
    if (this.ready_check.initialized) {
      console.log("Ready to use!");
    }
  }

  check_if_ready(){
    return this.ready_check.ready 
  }

  /**
   * Initializes the database making it ready to be used. Typically, required to run after every time package is updated to a new version.
   * See the documentation on the architecture of the DB to understand what default schemas are required for a smooth functioning of the database
   */
  async initialize_db() {
    try {
      if (this.ready_check.initialized == false) {
        // add the   meta-schemas doc
        let schema_schema_doc = this._get_blank_doc("schema");
        schema_schema_doc.data = sys_sch.schema_schema;
        await this.db_api.insert(schema_schema_doc);
        // add system schemas
        let keys = Object.keys(sys_sch.system_schemas);
        for (let index = 0; index < keys.length; index++) {
          const element = sys_sch.system_schemas[keys[index]];
          let schema_record = this._get_blank_schema_doc(
            "schema",
            sys_sch.schema_schema["schema"],
            element
          );
          await this.db_api.insert(schema_record);
        }
        // create an index
        await this.db_api.createIndex({
          index: { fields: ["schema", "data", "meta"] },
        });
        console.log("Database Indexed.");
        // create the log doc
        const log_schema = sys_sch.system_schemas["logs"]["schema"];
        let log_doc = this._get_blank_schema_doc("system_logs", log_schema, {
          logs: [
            {
              message: `Database is initialized with version ${this._version}.`,
              on: this._get_now_unix_timestamp(),
              human_date: new Date().toLocaleString(),
            },
          ],
        });
        await this.db_api.insert(log_doc);
        // create the setting doc
        const setting_schema = sys_sch.system_schemas["settings"]["schema"];
        let setting_doc = this._get_blank_schema_doc(
          "system_settings",
          setting_schema,
          {
            name: "beanbagdb_version",
            value: this._version,
            user_editable: false,
          }
        );
        await this.db_api.insert(setting_doc);
        // finally update the flags
        this.ready_check.initialized = true;
        this.ready_check.latest = true;
        console.log("Database initialized");
      } else {
        console.log("Database already initialized");
        if (!this.ready_check.latest) {
          // update to latest schema
          this._update_system_schema();
        } else {
          console.log("Database already up to date");
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
  async update_indexes() {
    // @TODO check this. i don't the index created this way are actually useful in search.
    let all_schemas_docs = await this.db_api.search({
      selector: { schema: "schema" },
    });
    let indexes = [];
    all_schemas_docs.docs.map((item) => {
      Object.keys(item.data.schema.properties).map((key) => {
        indexes.push("data." + key);
      });
    });
    await this.db_api.createIndex({ index: { fields: indexes } });
  }

  /**
   * Validates a data object against a provided JSON schema
   * It relies on the Ajv package to make the validation.
   * @param {Object} schema_obj - The JSON schema object to validate against
   * @param {Object} data_obj - The data object to validate
   * @throws {Error} If the data object does not conform to the schema
   */
  validate_data(schema_obj, data_obj) {
    const {valid,validate} = this.utils.validate_schema(schema_obj, data_obj)
    //const ajv = new Ajv({code: {esm: true}})  // options can be passed, e.g. {allErrors: true}
    //const validate = ajv.compile(schema_obj);
    //const valid = validate(data_obj);
    if (!valid) {
      console.log(validate.errors);
      throw new Error(validate.errors);
    }
  }

  validate_schema_object(schema_doc){
    let errors = []
    if(!schema_doc["schema"]["type"]){
      errors.push("Schema must have the field schema.'type' which can only be 'object' ")
    }else{
      if(schema_doc["schema"]["type"]!="object"){
        errors.push("The schema.'type' value  is invalid.Only 'object' allowed")
      }
    }
    if(!schema_doc["schema"]["properties"]){
      errors.push("The schema.'properties' object does not exists")
    }else{
      if(typeof(schema_doc["schema"]["properties"])!="object"){
        errors.push("Invalid schema.properties. It must be an object and must have atleast one field inside.")
      }
      if(Object.keys(schema_doc["schema"]["properties"]).length==0){
        errors.push("You must define at least one property")
      }
    }

    if(!schema_doc["schema"]["additionalProperties"]){
      errors.push("The schema.'additionalProperties' field is required")
    }else{
      if(typeof(schema_doc["schema"]["additionalProperties"])!="boolean"){
        errors.push("Invalid schema.additionalProperties. It must be a boolean value")
      }
    }

    if(errors.length>0){
      throw new Error("Schema validation errors- "+errors.join(","))
    }
  }

  /**
   * Returns a document with the provided ID
   * @param {String} doc_id - the doc Id (not the primary key)
   * @param {Boolean} include_schema - whether to include the schema doc as well 
   * @returns {Object} {doc} or {doc,schema}
   */
  async get(doc_id,include_schema=false) {
    let doc = await this.db_api.get(doc_id);
    let schema = await this.get_schema_doc(doc.schema);
    doc = this._decrypt_doc(schema, doc);
    if(include_schema){
      return {doc,schema}
    }
    return {doc};
  }

  /**
   * Returns schema document for the given schema name s
   * @param {String} schema_name - Schema name
   */
  async get_schema_doc(schema_name) {
    let schemaSearch = await this.db_api.search({
      selector: { schema: "schema", "data.name": schema_name },
    });
    if (schemaSearch.docs.length == 0) {
      throw new Error("Schema not found");
    }
    return schemaSearch.docs[0]["data"];
  }

  /**
   * Fetches a document based on a given schema and primary key.
   * In case schema has a single record, leave the primary_key blank `[]`
   * Can also be used to get special system docs such as settings
   * @param {String} schema_name
   * @param {Object} primary_key
   * @returns object
   */
  async get_doc(schema_name, primary_key = {}) {
    let s_doc = await this.get_schema_doc(schema_name);
    let doc_obj;
    if (
      s_doc["settings"]["primary_keys"] &&
      s_doc["settings"]["primary_keys"].length > 0
    ) {
      let A = s_doc["settings"]["primary_keys"];
      let search_criteria = { schema: schema_name };
      A.forEach((itm) => {
        if (!primary_key[itm]) {
          throw new Error(
            "Incomplete Primary key set. Required field(s) : " + A.join(",")
          );
        }
        search_criteria["data." + itm] = primary_key[itm];
      });
      let s = await this.search({ selector: search_criteria });
      doc_obj = s.docs[0];
    } else {
      let s = await this.search({ selector: { schema: schema_name } });
      if (s.docs.length > 1) {
        throw new Error(
          "Invalid schema. At least one primary key must be defined or set the singleRecord option to true. "
        );
      }
      doc_obj = s.docs[0];
    }
    doc_obj = this._decrypt_doc(s_doc, doc_obj);
    return doc_obj;
  }

  /**
   * Searches for documents in the database for the specified query. The query are Mango queries.
   * One field is mandatory : Schema
   * E.g
   * @param {Object} criteria
   */
  async search(criteria) {
    if (!criteria["selector"]) {
      throw new Error("Invalid search query.");
    }
    if (!criteria["selector"]["schema"]) {
      throw new Error("The search criteria must contain the schema");
    }
    const results = await this.db_api.search(criteria);
    return results;
  }

  /**
   * Inserts a doc for the given schema
   * @param {String} schema e.g "contact"
   * @param {Object} data e.g {"name":"","mobile":""...}
   * @param {Object} settings (optional)
   */
  async insert(schema, data, meta= {},settings = {}) {
    try {
      let doc_obj = await this._insert_pre_checks(schema, data, settings);
      let new_rec = await this.db_api.insert(doc_obj);
      return { id: new_rec["id"] };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  
  

  //**  Update data  */
  /**
   * Update data and meta of a doc. 
   * 
   * - Q: Which data fields can be edited ?
   * - A: Depends on the setting.editable_fields. If this is blank, then all fields are editable.
   * - Q: Are primary key fields editable ?
   * - A: Yes. before making the update, a check is done to ensue the primary key policy is not violated 
   *
   * @param {String} doc_id
   * @param {String} rev_id
   * @param {*} schema_name
   * @param {doc_obj} updates {data:{},meta:{}}, need not be the full document, just the new values of all/some fields
   * @param {Boolean} save_conflict = true -
   * 
   */
  async update(doc_id, rev_id, updates, update_source="api",save_conflict = true) {
    // making a big assumption here : primary key fields cannot be edited
    // so updating the doc will not generate primary key conflicts
    let req_data = await this.get(doc_id,true);
    let schema = req_data.schema // await this.get_schema_doc(schema_name);
    let full_doc = req_data.doc // await this.get(doc_id)["doc"];

    // @TODO fix this : what to do if the rev id does not match 
    // if (full_doc["_rev"] != rev_id) {
    //   // throw error , save conflicting doc separately by default
    //   if (save_conflict) {
    //     // save conflicting doc todo
    //   }
    // }

    // blank check

    // update new value depending on settings.editable_fields (if does not exists, all fields are editable)
    let edit_fields = Object.keys(schema.schema.properties)
    if(schema.settings["editable_fields"]&&schema.settings["editable_fields"].length>0){
      edit_fields = schema.settings["editable_fields"]
    }

    // now generate the new doc with updates 
    let allowed_updates = this._filterObject(updates.data,edit_fields);
    let updated_data = { ...full_doc.data, ...allowed_updates };

    // validate data
    this.validate_data(schema.schema, updated_data);

    // primary key check if multiple records can  be created 
    if(schema.settings["single_record"]==false){
      if(schema.settings["primary_keys"]&&schema.settings["primary_keys"].length>0){
        let pri_fields = schema.settings["primary_keys"]
        let search_criteria = {schema:schema.name}
        pri_fields.map(itm=>{search_criteria["data."+itm] = updated_data[itm]})
        let search = await this.search({selection:search_criteria})
        if(search.docs.length>0){
          if(search.docs.length==1){
            let thedoc  = search.docs[0]
            if(thedoc["_id"]!=doc_id){
              throw new Error("Update not allowed. Document with the same primary key already exists")
            }
          }else{
            throw new Error("There is something wrong with the schema")
          }
        }
      }
    }

    // encrypt the data  

    full_doc["data"] = updated_data
    full_doc = this._encrypt_doc(schema,full_doc);
    
    if(updates.meta){
      let m_sch = sys_sch.editable_metadata_schema
      let editable_fields = Object.keys(m_sch["properties"])
      let allowed_meta = this._filterObject(updates.meta,editable_fields)
      this.validate_data(m_sch,allowed_meta)
      full_doc["meta"] = {...full_doc["meta"],...allowed_meta}
    }

    full_doc.meta["updated_on"] = this._get_now_unix_timestamp()
    full_doc.meta["updated_by"] = update_source
    let up = await this.db_api.update(full_doc);
    return up;
  }

  async delete(doc_id) {
    await this.db_api.delete(doc_id)
  }


  async load_plugin(plugin_name,plugin_module){
    this.plugins[plugin_name] = {}
    for (let func_name in plugin_module){
      if(typeof plugin_module[func_name]=='function'){
        this.plugins[plugin_name][func_name] = plugin_module[func_name].bind(null,this)
      }
    }
    // Check if the plugin has an on_load method and call it
    if (typeof this.plugins[plugin_name].on_load === 'function') {
      await this.plugins[plugin_name].on_load();
    }
  }

  //////// Helper method ////////

  _generate_random_link(){
    const dictionary = ['rain', 'mars', 'banana', 'earth', 'kiwi', 'mercury', 'fuji', 'hurricane', 'matterhorn', 'snow', 'saturn', 'jupiter', 'peach', 'wind', 'pluto', 'apple', 'k2', 'storm', 'venus', 'denali', 'cloud', 'sunshine', 'mango', 'drizzle', 'pineapple', 'aconcagua', 'gasherbrum', 'apricot', 'neptune', 'fog', 'orange', 'blueberry', 'kilimanjaro', 'uranus', 'grape', 'storm', 'montblanc', 'lemon', 'chooyu', 'raspberry', 'cherry', 'thunder', 'vinson', 'breeze', 'elbrus', 'everest', 'parbat', 'makalu', 'nanga', 'kangchenjunga', 'lightning', 'cyclone', 'comet', 'asteroid', 'pomegranate', 'nectarine', 'clementine', 'strawberry', 'tornado', 'avalanche', 'andes', 'rockies', 'himalayas', 'pyrenees', 'carpathians', 'cascade', 'etna', 'vesuvius', 'volcano', 'tundra', 'whirlwind', 'iceberg', 'eclipse', 'zephyr', 'tropic', 'monsoon', 'aurora'];
    return Array.from({ length: 4 }, () => dictionary[Math.floor(Math.random() * dictionary.length)]).join('-');
  }

  _check_required_fields(requiredFields,obj){
    for (const field of requiredFields) {
      if (!obj[field]) {throw new Error(`${field} is required`);}
    }
  }

  /**
   * 
   * @param {*} obj 
   * @param {*} fields 
   * 
   */
  _filterObject(obj, fields) {
    return fields.reduce((filteredObj, field) => {
      if (Object.prototype.hasOwnProperty.call(obj, field)) {
        filteredObj[field] = obj[field];
      }
      return filteredObj;
    }, {});
  }

  /**
   * Checks if the selected database is initialized for working with BeanBagDB. Also throws a warning if package version does not match with database version.
   * Every time a database is initialized, a setting document `beanbagdb_version` is added. If this does not exists, the database is not initialized. If it exists but does not match the current version, a warning is shown.
   * @returns {object} {initialized:boolean,latest:boolean}
   */
  async _check_ready_to_use() {
    // @TODO check if ready to use in major API methods
    let check = { initialized: false, latest: false };
    // @TODO this is not really fool proof. check all the required docs, they have the system_generated flag
    // what if some user mistakenly modifies or deletes some of the required docs ?
    let version_search = await this.db_api.search({
      selector: { schema: "system_settings", "data.name": "beanbagdb_version" },
    });
    if (version_search.docs.length > 0) {
      let doc = version_search.docs[0];
      check.initialized = true;
      check.latest = doc["data"]["value"] == this._version;
    }
    if (check.initialized == false) {
      console.warn(
        "This database is not ready to be used. It is not initialized. Run `initialize_db()` first"
      );
    }
    if ((check.latest == false) & (check.initialized == true)) {
      console.warn(
        "This database is not updated with the latest version. Run `initialize_db()` again to update to the latest version"
      );
    }
    return check;
  }

  /**
   * To update the system schema or reset to a stable version to ensure functioning of the BeanBagDB
   */
  async _update_system_schema() {
    console.log("Todo");
  }

  /**
   * Returns the current Unix timestamp in seconds.
   * divide by 1000 (Date.now gives ms) to convert to seconds. 1 s = 1000 ms
   * @returns {number}
   */
  _get_now_unix_timestamp() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Generates a blank database json object. All objects in the database follow the same structure
   * @param {string} schema_name
   * @returns {object}
   */
  _get_blank_doc(schema_name) {
    if (!schema_name) {
      throw new Error("Schema name not provided for the blank doc");
    }
    let doc = {
      data: {},
      meta: {
        createdOn: this._get_now_unix_timestamp(),
        tags: [],
        app :{},
        link : this._generate_random_link() // there is a link by default. overwrite this if user provided one but only before checking if it is unique
      },
      schema: schema_name,
    };
    return doc;
  }

  /**
   * Generates a blank schema doc ready to be inserted to the database. Note that no validation is done. This is for internal use
   * @param {string} schema_name
   * @param {Object} schema_object
   * @param {Object} data
   * @returns {Object}
   */
  _get_blank_schema_doc(schema_name, schema_object, data) {
    this.validate_data(schema_object, data);
    let obj = this._get_blank_doc(schema_name);
    obj["data"] = data;
    return obj;
  }

  /**
   * Decrypts a given document using it's schema. The list of encrypted fields : schema_obj.settings.encrypted_fields
   * @param {Object} schema_obj
   * @param {Object} doc_obj
   * @returns {Object}
   */
  _decrypt_doc(schema_obj, doc_obj) {
    if (
      schema_obj.settings["encrypted_fields"] &&
      schema_obj.settings["encrypted_fields"].length > 0
    ) {
      schema_obj.settings["encrypted_fields"].forEach((itm) => {
        doc_obj.data[itm] = this.utils.decrypt(
          doc_obj.data[itm],
          this.encryption_key
        );
      });
    }
    return { ...doc_obj };
  }

  /**
   * Encrypts a given doc using it's schema obj.
   * @param {Object} schema_obj
   * @param {Object} doc_obj
   * @returns {Object}
   */
  _encrypt_doc(schema_obj, doc_obj) {

    if (
      schema_obj.settings["encrypted_fields"] &&
      schema_obj.settings["encrypted_fields"].length > 0
    ) {
      // console.log(schema_obj,doc_obj)
      schema_obj.settings["encrypted_fields"].forEach((itm) => {
        doc_obj.data[itm] = this.utils.encrypt(
          doc_obj.data[itm],
          this.encryption_key
        );
      });
    }
    return { ...doc_obj };
  }

  /**
   * Checks if the new document is valid and ready to be inserted in the DB.
   * List of checks:
   * - fetch the schema object and validate the data object against the schema
   * - check if the doc with same primary keys already exists
   * - replace encrypted fields with encrypted values
   * - return the doc
   * @param {Object} schema
   * @param {Object} data
   */
  async _insert_pre_checks(schema, data,meta={} ,settings = {}) {
    // schema search
    let sch_search = await this.search({
      selector: { schema: "schema", "data.name": schema },
    });
    if (sch_search.docs.length == 0) {
      throw new Error("Invalid Schema");
    }
    let schemaDoc = sch_search.docs[0]["data"];
    // validate data
    this.validate_data(schemaDoc.schema, data);

    // validate meta
    this.validate_data(sys_sch.editable_metadata_schema, meta);
    
    // duplicate meta.link check
    if(meta.link){
      let link_search = await this.search({ selector: {"meta.link":meta.link} });
      console.log(link_search);
      if (link_search.docs.length > 0) {
        throw new Error("This link already exists in the database");
      }
    }

    // special checks for special docs
    // @TODO : for schema dos: settings fields must be in schema field
    if(schema=="schema"){
      //more checks are required
      this.validate_schema_object(data)
    }
    // @TODO : check if single record setting is set to true

    // duplicate check
    if (
      schemaDoc.settings["primary_keys"] &&
      schemaDoc.settings["primary_keys"].length > 0
    ) {
      let primary_obj = { schema: schema };
      schemaDoc.settings["primary_keys"].map((ky) => {
        primary_obj["data." + ky] = data[ky];
      });
      console.log(primary_obj);
      let prim_search = await this.search({ selector: primary_obj });
      console.log(prim_search);
      if (prim_search.docs.length > 0) {
        throw new Error("Doc already exists");
      }
    }
    // encrypt if required
    let new_data = { ...data };
    if (
      schemaDoc.settings["encrypted_fields"] &&
      schemaDoc.settings["encrypted_fields"].length > 0
    ) {
      schemaDoc.settings["encrypted_fields"].forEach((itm) => {
        new_data[itm] = this.utils.encrypt(data[itm], this.encryption_key);
      });
    }
    // generate the doc object for data
    let doc_obj = this._get_blank_doc(schema);
    doc_obj["data"] = new_data;
    return doc_obj;
  }
}

export default BeanBagDB;
