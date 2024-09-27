import * as sys_sch from "./system_schema.js";
/**
 * This the core class. it is not very useful in itself but can be used to generate a sub class for a specific database for eg CouchDB.
 * It takes a db_instance argument, which , this class relies on perform  CRUD operations on the data.
 * Why have a "dumb" class ? : So that the core functionalities remains in a single place and the multiple Databases can be supported.
 * Naming convention :  
 * - user facing methods : verbs with underscores, no camel case 
 * - internal methods (uses the this object) only to be used within the class : name starts with underscore (_)
 * - util methods : these can also be used by the user,  this object not accessed, : name starts with util_
 */
export class BeanBagDB {
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
    this.util_check_required_fields(["name", "encryption_key", "api", "utils","db_name"],db_instance)
    this.util_check_required_fields(["insert", "update", "delete", "search","get","createIndex"],db_instance.api)
    this.util_check_required_fields(["encrypt", "decrypt","ping","validate_schema"],db_instance.utils)

    if(db_instance.encryption_key.length<20){throw new Error("encryption_key must have at least 20 letters")}
    // db name should not be blank, 

    this.encryption_key = db_instance.encryption_key;
    this.db_name = db_instance.db_name // couchdb,pouchdb etc...
    this.db_api = db_instance.api;
    this.utils = db_instance.utils;

    this.meta = {
      database_name : db_instance.name,
      backend_database : this.db_name,
      beanbagdb_version_db : null
    }
    
    this._version = this._get_current_version()
    // latest indicated if the DB was initialized with the latest version or not. 
    this.active =  false 

    console.log("Run ready() now");
    
    this.plugins = {}
    
    this.error_codes = {
      not_active : "Database is not ready. Run ready() first",
      schema_not_found:"Schema not found"
    } 
  }

  async metadata(){
    // returns system data 
    return {
      ... this.meta,
      beanbagdb_version_code : this._version,
      ready_to_use : this.active 
    }
    // todo : doc count, schema count, records for each schema, size of the database, 
  }

  /**
   * This is to check if the database is ready to be used. It it important to run this after the class is initialized.
   */
  async ready() {
    // TODO Ping db
    let check = { initialized: false, latest: false ,db_version:null};
    let version_search = await this.db_api.search({
      selector: { schema: "system_settings", "data.name": "beanbagdb_version" },
    });
    if (version_search.docs.length > 0) {
      let doc = version_search.docs[0];
      this.active  = doc["data"]["value"] == this._version;
      this.meta.beanbagdb_version_db = doc["data"]["value"]
    }
    if(this.active){
      console.log("Ready")
    }else{
      await this.initialize_db()
    }
  }



  /**
   * Initializes the database making it ready to be used. Typically, required to run after every time package is updated to a new version.
   * See the documentation on the architecture of the DB to understand what default schemas are required for a smooth functioning of the database
   */
  async initialize_db() {
    // this works on its own but is usually called by ready automatically if required 

    // check for schema_scehma : if yes, check if latest and upgrade if required, if no create a new schema doc
    let logs = ["init started"]
    try {
      let schema = await  this.get_schema_doc("schema")
      if (schema["data"]["version"] != sys_sch.schema_schema.version){
        logs.push("old schema_schema v "+schema["data"]["version"])
        let full_doc  = await this.db_api.get(schema["_id"])
        full_doc["data"] =  {...sys_sch.schema_schema}
        full_doc["meta"]["updated_on"] = this._get_now_unix_timestamp()
        await this.db_api.update(full_doc)
        logs.push("new schema_schema v "+sys_sch.schema_schema.version)
      }

    } catch (error) {
     console.log(error)
     if (error.message==this.error_codes.schema_not_found) {
      console.log("...adding new ")
        // inserting new schema_schema doc
        let schema_schema_doc = this._get_blank_doc("schema");
        schema_schema_doc.data = sys_sch.schema_schema;
        await this.db_api.insert(schema_schema_doc);
        logs.push("init schema_schema v "+sys_sch.schema_schema.version)
     }
    }

    let keys = Object.keys(sys_sch.system_schemas);
    for (let index = 0; index < keys.length; index++) {
      const schema_name = sys_sch.system_schemas[keys[index]]["name"] 
      const schema_data = sys_sch.system_schemas[keys[index]];
      try {
        // console.log(schema_name)
        let schema1 = await  this.get_schema_doc(schema_name)
        if (schema1["data"]["version"] != schema_data.version){
          logs.push("old "+schema_name+" v "+schema1["data"]["version"])
          let full_doc  = await this.db_api.get(schema1["_id"])
          full_doc["data"] =  {...schema_data}
          full_doc["meta"]["updated_on"] = this._get_now_unix_timestamp()
          await this.db_api.update(full_doc)
          logs.push("new "+schema_name+" v "+schema_data.version)
        }
      } catch (error) {
        console.log(error)
        if (error.message==this.error_codes.schema_not_found) {
          // inserting new schema doc
          let new_schema_doc = this._get_blank_schema_doc("schema",sys_sch.schema_schema["schema"],schema_data);
          await this.db_api.insert(new_schema_doc);
          logs.push("init "+schema_name+" v "+schema_data.version)
        }
      }
    }
    // store the logs in the log_doc ,  generate it for the first time 
    // console.log(logs)
    if(logs.length>1){
      // version needs to be updated in the object as well as settings and must be logged
      logs.push("Init done")
      
      await this.insert_or_update_setting("system_logs",{value:{text:logs.join(","),added:this._get_now_unix_timestamp()},"on_update_array":"append"})
      await this.insert_or_update_setting("beanbagdb_version",{value:this._version})
      // await this.insert_or_update_setting("system_logs",{value:{text:"This is just a test.",added:this._get_now_unix_timestamp()}})

      this.meta.beanbagdb_version_db = this._version
      this.active = true
    }else{
      // no new updates were done 
      console.log("already updated. nothing is required to be done. continue")
    }
  }
  async insert_or_update_setting(name,new_data,schema={}){
    // TODO implement schema check
    if(!new_data){throw new Error("No data provided")}
    if(!new_data.value){throw new Error("No value provided")}

    let doc_search = await this.db_api.search({"selector":{"schema":"system_settings","data.name":name}})
    if(doc_search.docs.length>0){
      // doc already exists, check schema and update it : if it exists then it's value already exists and can be 
      let doc = {...doc_search.docs[0]}
      if(Array.isArray(doc.data.value)){
          let append_type = doc.data.on_update_array
          if(append_type=="append"){
            doc["data"]["value"].push(new_data.value)
          }else if(append_type=="update"){
            doc["data"]["value"] = new_data.value
          }else{
            throw new Error("Invalid on update array value")
          }
        }else{
          doc["data"]["value"]  = new_data.value
        }
        // finally update it 
        doc["meta"]["updated_on"] = this._get_now_unix_timestamp()
        await this.db_api.update(doc)
        return doc
      
    }else{
      // doc does not exists, generate a new one 
      let new_val= {value:new_data.value}

      if (new_data.on_update_array){
        // this indicates the provided value is initial value inside the array
        new_val.value = [new_data.value]
        new_val.on_update_array = new_data.on_update_array
      }
      let new_doc = this._get_blank_doc("system_settings")
      new_doc["data"] = {
        "name": name,
        ...new_val
      }
      let d = await this.db_api.insert(new_doc)
      return d
    }
  }


  /**
   * Adds indexes for all the schemas in the data base. This is important to make search faster. This must be done every time a new schema is introduced in the database
   */
  async update_indexes() {
    this._check_ready_to_use()
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
      throw new ValidationError(validate.errors);
    }
  }

  validate_schema_object(schema_doc){
    let errors = [{"message":"Schema validation errors "}]
    if(!schema_doc["schema"]["type"]){
      errors.push({message:"Schema must have the field schema.'type' which can only be 'object' "})
    }else{
      if(schema_doc["schema"]["type"]!="object"){
        errors.push({message:"The schema.'type' value  is invalid.Only 'object' allowed"})
      }
    }
    if(!schema_doc["schema"]["properties"]){
      errors.push({message:"The schema.'properties' object does not exists"})
    }else{
      if(typeof(schema_doc["schema"]["properties"])!="object"){
        errors.push({message:"Invalid schema.properties. It must be an object and must have atleast one field inside."})
      }
      if(Object.keys(schema_doc["schema"]["properties"]).length==0){
        errors.push({message:"You must define at least one property"})
      }
    }

    if(!schema_doc["schema"]["additionalProperties"]){
      errors.push({message:"The schema.'additionalProperties' field is required"})
    }else{
      if(typeof(schema_doc["schema"]["additionalProperties"])!="boolean"){
        errors.push({message:"Invalid schema.additionalProperties. It must be a boolean value"})
      }
    }

    const allKeys = Object.keys(schema_doc["schema"]["properties"])
    if(schema_doc["settings"]["primary_keys"].length>0){
      // check if all keys belong to the schema and are not of type object
      let all_pk_exist = schema_doc["settings"]["primary_keys"].every(item=>allKeys.includes(item)&&schema_doc["schema"]["properties"][item]["type"]!="object"&&schema_doc["schema"]["properties"][item]["type"]!="array")
      
      if(!all_pk_exist){
        errors.push({message:"Primary keys invalid. All keys must be defined in the schema and must be non object"})
      }
    }


    if(schema_doc["settings"]["non_editable_fields"].length>0){
      // check if all keys belong to the schema
      let all_ne_exist = schema_doc["settings"]["non_editable_fields"].every(item=>allKeys.includes(item))
      if(!all_ne_exist){
        errors.push({message:"Non editable fields invalid. All fields must be defined in the schema "})
      }
    }

    if(schema_doc["settings"]["encrypted_fields"].length>0){
      // check if all keys belong to the schema and are only string
      let all_enc_exist = schema_doc["settings"]["encrypted_fields"].every(item=>allKeys.includes(item)&&schema_doc["schema"]["properties"][item]["type"]=="string")
      if(!all_enc_exist){
        errors.push({message:"Invalid encrypted fields. All fields must be defined in the schema and must be string "})
      }

      // check : primary keys cannot be encrypted
      let all_enc_no_pk = schema_doc["settings"]["encrypted_fields"].every(item=>!schema_doc["settings"]["primary_keys"].includes(item))
      if(!all_enc_no_pk){
        errors.push({message:"Invalid encrypted fields.Primary key fields cannot be encrypted "})
      }
    }
  
    /// cannot encrypt primary field keys 
    if(errors.length>1){
      throw new ValidationError(errors)
    }
  }

  /**
   * Returns a document with the provided ID
   * @param {String} doc_id - the doc Id (not the primary key)
   * @param {Boolean} include_schema - whether to include the schema doc as well 
   * @returns {Object} {doc} or {doc,schema}
   */
  async get(doc_id,include_schema=false) {
    this._check_ready_to_use()
    let doc = await this.db_api.get(doc_id);
    let schema = await this.get_schema_doc(doc.schema);
    doc = this._decrypt_doc(schema["data"], doc);
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
    // console.log(schemaSearch)
    if (schemaSearch.docs.length == 0) {
      throw new Error(this.error_codes.schema_not_found);
    }
    return schemaSearch.docs[0];
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
    this._check_ready_to_use()
    let schema_doc = await this.get_schema_doc(schema_name);
    let s_doc = schema_doc["data"];
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
    this._check_ready_to_use()
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
    //console.log("here in insert")
    this._check_ready_to_use()
    try {
      let doc_obj = await this._insert_pre_checks(schema, data, settings);
      let new_rec = await this.db_api.insert(doc_obj);
      return { id: new_rec["id"] };
    } catch (error) {
      // console.log(error);
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
    this._check_ready_to_use()
    // making a big assumption here : primary key fields cannot be edited
    // so updating the doc will not generate primary key conflicts
    let req_data = await this.get(doc_id,true);
    let schema = req_data.schema 
    let full_doc = req_data.doc // await this.get(doc_id)["doc"];

    // @TODO fix this : what to do if the rev id does not match 
    // if (full_doc["_rev"] != rev_id) {
    //   // throw error , save conflicting doc separately by default
    //   if (save_conflict) {
    //     // save conflicting doc todo
    //   }
    // }

    // update new value depending on settings.editable_fields (if does not exists, all fields are editable)
    let all_fields = Object.keys(schema.schema.properties)
    let unedit_fields = schema.settings["non_editable_fields"]
    let edit_fields = all_fields.filter(item=>!unedit_fields.includes(item))

    // now generate the new doc with updates 
    let allowed_updates = this._filterObject(updates.data,edit_fields);
    let updated_data = { ...full_doc.data, ...allowed_updates };

    this.validate_data(schema.schema, updated_data);

    // primary key check if multiple records can  be created 
    if(schema.settings["single_record"]==false && schema.settings["primary_keys"].length>0){
      let pri_fields = schema.settings["primary_keys"]
      let search_criteria = {schema:schema.name}
      pri_fields.map(itm=>{search_criteria["data."+itm] = updated_data[itm]})
      let search = await this.search({selection:search_criteria})
      if(search.docs.length>0){
        if(search.docs.length==1){
          let thedoc  = search.docs[0]
          if(thedoc["_id"]!=doc_id){
            throw new DocUpdateError([{message:"Update not allowed. Document with the same primary key already exists"}])
          }
        }
        else{
          throw new Error("There is something wrong with the schema primary keys")
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
    this._check_ready_to_use()
    await this.db_api.delete(doc_id)
  }


  async load_plugin(plugin_name,plugin_module){
    this._check_ready_to_use()
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

  //////// Internal methods ////////

  _get_current_version(){
    // current version is the sum of versions of all system defined schemas 
    let sum = sys_sch.schema_schema.version
    let keys = Object.keys(sys_sch.system_schemas).map(item=>{
      sum = sum+  sys_sch.system_schemas[item].version
    })
    if(sum == NaN){
      throw Error("Error in system schema version numbers")
    }
    return sum 
  }

  _check_ready_to_use(){
    if(!this.active){
      throw new Error(this.error_codes.not_active)
    }
  }


  _generate_random_link(){
    const dictionary = ['rain', 'mars', 'banana', 'earth', 'kiwi', 'mercury', 'fuji', 'hurricane', 'matterhorn', 'snow', 'saturn', 'jupiter', 'peach', 'wind', 'pluto', 'apple', 'k2', 'storm', 'venus', 'denali', 'cloud', 'sunshine', 'mango', 'drizzle', 'pineapple', 'aconcagua', 'gasherbrum', 'apricot', 'neptune', 'fog', 'orange', 'blueberry', 'kilimanjaro', 'uranus', 'grape', 'storm', 'montblanc', 'lemon', 'chooyu', 'raspberry', 'cherry', 'thunder', 'vinson', 'breeze', 'elbrus', 'everest', 'parbat', 'makalu', 'nanga', 'kangchenjunga', 'lightning', 'cyclone', 'comet', 'asteroid', 'pomegranate', 'nectarine', 'clementine', 'strawberry', 'tornado', 'avalanche', 'andes', 'rockies', 'himalayas', 'pyrenees', 'carpathians', 'cascade', 'etna', 'vesuvius', 'volcano', 'tundra', 'whirlwind', 'iceberg', 'eclipse', 'zephyr', 'tropic', 'monsoon', 'aurora'];
    return Array.from({ length: 4 }, () => dictionary[Math.floor(Math.random() * dictionary.length)]).join('-');
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
        created_on: this._get_now_unix_timestamp(),
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

  ////// Utility methods 
  util_check_required_fields(requiredFields,obj){
    for (const field of requiredFields) {
      if (!obj[field]) {throw new Error(`${field} is required`);}
    }
  }
}


export class ValidationError extends Error {
  constructor(errors = []) {
    // Create a message based on the list of errors
    //console.log(errors)
    let error_messages = errors.map(item=>` ${(item.instancePath||" ").replace("/","")} ${item.message} `)
    let message = `Validation failed with ${errors.length} error(s): ${error_messages.join(",")}`;
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;  // Store the list of errors
  }
}

export class DocUpdateError extends Error {
  constructor(errors=[]){
    let error_messages  = errors.map(item=>`${item.message}`)
    let message = `Error in document update. ${error_messages.join(",")}`
    super(message)
    this.name = "DocUpdateError";
    this.errors = errors
  }
}

export class DocInsertError extends Error {
  constructor(errors=[]){
    let error_messages  = errors.map(item=>`${item.message}`)
    let message = `Error in document insert. ${error_messages.join(",")}`
    super(message)
    this.name = "DocInsertError";
    this.errors = errors
  }
}

export class DocNotFoundError extends Error {
  constructor(errors=[]){
    let error_messages  = errors.map(item=>`${item.message}`)
    let message = `Error in fetching document. Criteria : ${error_messages.join(",")}`
    super(message)
    this.name = "DocNotFoundError";
    this.errors = errors
  }
}
