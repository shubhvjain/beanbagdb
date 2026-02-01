import * as sys_sch from "./system_schema.js";
/**
 * The core BeanBagDB class abstracts the database logic making it adaptable to both frontend and backend application. It is designed to be independent of any specific database allowing for integration with many databases. 
 * 
 * **Initialization** : Upon initializing the `BeanBagDB` object, the user must pass a JSON object with essential parameters such as the encryption key. Access to the database is provided through the  "api" object which should include asynchronous methods that handle basic CRUD operations and other utility functions. 
 * 
 * This class can serve a foundation for building database specific `BeanBagDb` classes. 
 * 
 * **Method types**

 * The main methods allow users to interact with the database through the BeanBagDB class. All methods follow the snake_case naming convention (lowercase letters separated by underscores).
 * 
 * The types of methods include:
 * - Setup methods: These methods are used for setting up the system, such as '{@link ready}' and '{@link initialize}'.
 * - CRUD methods: These methods handle basic database operations like '{@link create}', '{@link read}', '{@link update}', and '{@link delete}'.
 * - Search methods: Like '{@link search}' to find multiple documents based on criteria. (Note: read fetches a single document, while search fetches multiple documents matching a criteria).
 * - Plugin methods: These methods manage loading and using plugins (see {@tutorial plugins}).
 * - Utility methods: These methods don't directly interact with the database but serve specific purposes, such as returning the current UTC timestamp. These methods are prefixed with util_.
 *
 * For more details, see the {@tutorial getting-started} tutorial.
 * The class also includes internal methods intended for use within the class. These methods are not intended for external access and are prefixed with an underscore (they are not visible in the documentation, but you can check the source code).
 */
export class BeanBagDB {
  /**
   * Initializes the BeanBagDB instance.
   *
   * @param {object} db_instance - Database configuration object.
   * @param {string} db_instance.name - The name of the local database.
   * @param {string} db_instance.encryption_key - A key for encrypting documents (minimum 20 characters).
   * @param {object} db_instance.api - The API object containing database-specific CRUD operations.
   * @param {function} db_instance.api.insert - Inserts a document into the database.
   * @param {function} db_instance.api.update - Updates an existing document in the database.
   * @param {function} db_instance.api.delete - Deletes a document from the database.
   * @param {function} db_instance.api.search - Searches for documents based on a query (returns an array of JSON).
   * @param {function} db_instance.api.get - Retrieves a document by its ID.
   * @param {function} db_instance.api.createIndex - Creates an index in the database based on a filter.
   * @param {object} db_instance.utils - Utility functions for encryption and other operations.
   * @param {function} db_instance.utils.encrypt - Encrypts a document.
   * @param {function} db_instance.utils.decrypt - Decrypts a document.
   * @param {function} db_instance.utils.ping - Checks the database connection.
   * @param {function} db_instance.utils.validate_schema - Validates the database schema.
   * @param {function} db_instance.utils.compile_template - Compiles a text template with data. {}
   */
  constructor(db_instance) {
    this.util_check_required_fields(["name", "encryption_key", "api", "utils", "db_name"],db_instance)
    this.util_check_required_fields(["insert", "update", "delete", "search", "get", "createIndex"],db_instance.api)
    this.util_check_required_fields(["encrypt", "decrypt", "ping", "validate_schema","compile_template"],db_instance.utils)

    if (db_instance.encryption_key.length < 20) {
      throw new ValidationError([{ message: BeanBagDB.error_codes.key_short }]);
    }

    this.encryption_key = db_instance.encryption_key;
    this.db_name = db_instance.db_name; // couchdb,pouchdb etc...
    this.db_api = db_instance.api;
    this.utils = db_instance.utils;
    this.meta = {
      database_name: db_instance.name,
      backend_database: this.db_name,
      beanbagdb_version_db: null,
    };
    this._version = this._get_current_version();
    this.active = false;
    this.apps = {}; // this is where external apps load their scripts 
    console.log("Run ready() now");
  }

/**
 * Static property containing predefined error codes for common errors.
 * These error codes can be used throughout the class to handle specific exceptions.
 *
 * @property {Object} error_codes - An object with key-value pairs representing error codes and their messages.
 * @property {string} error_codes.key_short - The encryption key must contain at least 20 characters.
 * @property {string} error_codes.not_active - The database is not ready. Run the `ready()` method first.
 * @property {string} error_codes.schema_not_found - No schema found for the specified name.
 * @property {string} error_codes.doc_not_found - No document found for the provided search criteria.
 */
  static error_codes = {
    key_short: "The encryption key must at least contain 20 characters",
    not_active: "Database is not ready. Run ready() first",
    schema_not_found: "Schema not found",
    doc_not_found: "Document with selected criteria does not exists",
  };

////////////////////////////////////////////////////////////////////////
//////////////////// Setup methods /////////////////////////////////////
////////////////////////////////////////////////////////////////////////

/**
 * This is the list of methods that are compatible with JSON-REST API. Each command either has no params or takes just one json param as input
 */
  static rest_enabled = {
    "ready":{
      use: "Makes the database ready to use"
    },
    "metadata":{
      use: "Returns metadata related to the current BeanBagDB instance "
    },
    "initialize_app":{
      use:"To install/initialize an external app",
      input: "{...app_data}"
    },
    "update_indexes":{
      use:"Updates the indexes in the database for better searching"
    },
    "create":{
      input:"{schema,data,meta}",
      use:"Creates a new doc"

    },
    "read":{
      input:"{criteria,include_schema:false}",
      use:"Returns a doc. 3 ways to search for a doc : by _id, by link or by the primary key of the schema "
    },
    "update":{
      input:"{criteria,updates}",
      use:"Updates a document"
    },
    "delete":{
      input:"{criteria}",
      use:"Deletes a doc"
    },
    "search":{
      input:"{criteria:{selector:{...}}}",
      use:"To search in the database"
    },
    "get":{
      input:"{type,criteria}",
      use:"Returns special types of documents "
    },
    "create_edge":{
      input:"{node1:{..criteria},node2:{..criteria},edge_name,edge_label}",
      use:"Creates a new edge in the system's simple directed graph "
    },
    "util_get_now_unix_timestamp":{
      use:"Returns the current UNIX timestamp"
    },
    "util_validate_data":{
      input:"{schema:{},data:{}}",
      use:"Validate the given data against the given schema and returns errors/validated doc"
    },
    "util_validate_schema_object":{
      input:"{...schema_object...}",
      use:"Validated the schema document without inserting it in the DB"

    },
    "util_generate_random_link":{
      use:"Returns a random link"
    }
  }
  /**
   * Database object metadata
   * @typedef {Object} DBMetaData
   * @property {string} database_name - The name of the local database.
   * @property {string} backend_database - The type of backend database (e.g., CouchDB, PouchDB).
   * @property {number} beanbagdb_version_db - The version of the BeanBagDB in the database.
   * @property {number} beanbagdb_version_code - The current version code of the BeanBagDB.
   * @property {boolean} ready_to_use - Indicates whether the database is ready to be used (active state).
   */

  /**
   * Retrieves metadata for the current database object.
   * @return {DBMetaData} An object containing system metadata. 
   * @todo Include additional metadata: document count, schema count, records for each schema, size of the database.
   */
  metadata() {
    // returns system data
    return {
      ...this.meta,
      beanbagdb_version_code: this._version,
      ready_to_use: this.active,
    };
  }

  /**
   * Checks if the database is ready to be used. It is important to run this method after the class is initialized.
   *
   * This method performs the following actions:
   * - Pings the database.
   * - Searches the database for the `system_setting.beanbagdb_version` document.
   * - Sets the class state as active if the version matches the current BeanBagDB version.
   * - If the version does not match, calls `initialize()` to set up the database to the latest version.
   * @todo Code to ping the DB and throw Connection error if failed to connect
   * @async
   * @returns {Promise<void>} - Resolves when the database has been verified and initialized.
   */

  async check_ready(){
    console.log("checking if DB is ready to be used")
    let version_search = await this.db_api.search({
      selector: { schema: "system_app", "data.name": "beanbagdb_system" },
    })
    if (version_search.docs.length > 0) {
      let doc = version_search.docs[0];
      this.active = doc["data"]["version"] == this._version;
      this.meta.beanbagdb_version_db = doc["data"]["version"];
    }
    if(!this.active){console.log("Version mismatch. Initialization of the default system app is required")}
    return this.active
  }

  async ready(init_automatically=true) {
    let ready = await this.check_ready()

    if (ready) {
      console.log("Ready.Set.Go");
    } else {
      if(init_automatically){
        console.log("Initializing")
        await this.initialize();
      }else{
        throw new Error("DB cannot be used because there is a version mismatch between the DB and the script. Since automatically init flag was set to true, exiting")
      }
    }
  }

  /**
   * Initializes the database with the required schemas.
   *
   * This method is responsible for:
   * - Verifying the existence and latest version of the `schema_schema` document.
   * - Upgrading or inserting a new system schema if the version is outdated or missing.
   * - Logging initialization steps in the system logs.
   * - Updating the database version if needed.
   *
   * This method is usually called automatically by '{@link ready}' if required but can be run manually if needed.
   *
   * @async
   * @returns {Promise<void>} - Resolves when the initialization is complete.
   * @throws {Error} - Throws an error if schema initialization fails.
   */
  async initialize() {
    // this works on its own but is usually called by ready automatically if required
    // check for schema_scehma : if yes, check if latest and upgrade if required, if no create a new schema doc
    try {
      let app_new_records = await this._initialize_app_schema(sys_sch.default_app)
      this.meta.beanbagdb_version_db = this._version;
      this.active = true;
      let app_records = await this._initialize_app_records(sys_sch.default_app,app_new_records)
      return        
    } catch (error) {
      console.log("Error in initializing instance")
      console.log(error)
      throw error
    }

  }

  /**
   * Install schemas defined in an app and returns a list of document ids
   * this is part 1 of initializing an app 
   * @param {Object} app_data
   */
  async _initialize_app_schema(app_data_input){
    // calculate the app_version 
    if(!app_data_input){throw new Error("app_data_input is required")}
    let app_data = this.util_validate_data({schema:sys_sch.app_data_schema,data:app_data_input})
    let latest_version = 0
    app_data.schemas.map(sch=>{
      latest_version = latest_version + sch.version
      // update the source of schemas to the app 
      sch["settings"]["install_source"] = `app:${app_data.name}`
    })    
    // check if app record exists 
    let version_search = await this.db_api.search({
      selector: { schema: "system_app", "data.name": app_data.name },
    })

    let update_required = true 
    let doc 
    let app_doc_id = null;

    if (version_search.docs.length > 0) {
      doc = version_search.docs[0];
      app_doc_id = doc["_id"]
      if(doc["data"]["version"] == latest_version){
        update_required = false
      }
    }
    
    // if no update required return the document 
    if(!update_required){return doc}
    // if version is latest no additional steps required
    // version mismatch => update all docs

    // this is to store all doc ids related to the app 
    let inserted_document_ids = []
    let steps = ["update started"]

    for (let index = 0; index < app_data.schemas.length; index++) {
      const schema_name = app_data.schemas[index]["name"];
      const schema_data = app_data.schemas[index]
      const schema_title =  `Schema ${ app_data.schemas[index]['title']? app_data.schemas[index]['title'] :schema_name}` 
      steps.push(`checking.${schema_name}`)
      try {
        // console.log(schema_name)
        let schema1 = await this.get({type:"schema",criteria:{name:schema_name}}) 
        if (schema1["data"]["version"] != schema_data.version) {
          steps.push(`old.${schema_name}.v.${schema1["data"]["version"]}`);
          let full_doc = await this.db_api.get(schema1["_id"]);
          full_doc["data"] = { ...schema_data };
          full_doc["meta"]["updated_on"] = this.util_get_now_unix_timestamp();
          // console.log(full_doc)
          await this.db_api.update(full_doc);
          
          steps.push(`new.${schema_name}.v=${schema_data.version}`);
        }else{
          steps.push(`${schema_name}.v.${schema1["data"]["version"]}=latest`)
        }
      } catch (error) {
        // console.log(error);
        if (error instanceof DocNotFoundError) {
          // inserting new schema doc
          if(schema_name=="schema"&& app_data.name=="beanbagdb_system"){
            // this is to initialize the system schema
            let schema_schema_doc = this._get_blank_doc("schema");
            schema_schema_doc.data = schema_data;
            schema_schema_doc["meta"]["title"] = schema_title
            //console.log(schema_schema_doc)
            let new_db_status = await this.db_api.insert(schema_schema_doc);
            inserted_document_ids.push(new_db_status?.id)
          }else{
            let system_schema = sys_sch.default_app.schemas[0]["schema"]
            let new_schema_doc = this._get_blank_schema_doc(
              "schema",
              system_schema,
              schema_data
            );
            new_schema_doc["meta"]["title"] = schema_title
            let new_db_status = await this.db_api.insert(new_schema_doc);
            //console.log(new_db_status)
            inserted_document_ids.push(new_db_status?.id)
          }
          steps.push(`init.${schema_name}.v=${schema_data.version}`);
        }else{
          steps.push(`${schema_name}.error.message : ${error.message} `);
        }
      }
    }

    let app_doc = { 
      "details": app_data.details,
      "name": app_data.name ,
      version: latest_version,
      source: app_data.source
    }

    try {
      // App doc 
      if (app_doc_id){
        // app doc already exits, it needs to be updated
        let full_app_doc = await this.db_api.get(app_doc_id);
        full_app_doc["data"] = app_doc;
        full_app_doc["meta"]["updated_on"] = this.util_get_now_unix_timestamp();
        await this.db_api.update(full_app_doc);
        //console.log("app record updated")
      }else{
        // new app doc needs to be created with the version
        let new_app_doc =  this._get_blank_doc("system_app")
        new_app_doc.data = app_doc
        new_app_doc.meta.title = `App - ${app_data.name} - ${app_data.title}`
        let app_doc_status = await this.db_api.insert(new_app_doc);
        //console.log(app_doc_status)
        app_doc_id = app_doc_status?.id
        steps.push("New app document created")
        //console.log("app record inserated")
      }
      
      // Log doc
      let new_log_doc =  this._get_blank_doc("system_log")
      let text = `Initializing ${app_data.name} app to v.${latest_version}`
      new_log_doc.data = {text,steps,app:app_data.name}
      new_log_doc.meta.title = text
      let log_doc_status = await this.db_api.insert(new_log_doc);
      //console.log(log_doc_status)
      inserted_document_ids.push(log_doc_status?.id)      
    } catch (error) {
      throw error
    }
    return inserted_document_ids
  } 

    /**
   * To install default records and other app related docs. This must be called after ready
   * This should be called before using any
   * @param {Object} app_data
   */
  async _initialize_app_records(app_data_input,inserted_doc_id=[]){
    if(!app_data_input){throw new Error("app_data_input is required")}
    let app_data = this.util_validate_data({schema:sys_sch.app_data_schema,data:app_data_input})
    //console.log(app_data)
    // check if app record exists , if not initialize_app_schema needs to be run first
    let version_search = await this.db_api.search({
      selector: { schema: "system_app", "data.name": app_data.name },
    })



    let doc 
    let new_docs = [...inserted_doc_id]

    if (version_search.docs.length > 0) {
      doc = version_search.docs[0];
    }else{
      throw new DocNotFoundError("App doc not found. run _initialize_app_schema first")
    }

    try {
      // step 1 : add default records if not already present 
      let dec_keys =  Object.keys(app_data.default_system_docs)
        for (let index = 0; index < dec_keys.length; index++) {
          //console.log()
          let default_doc = app_data.default_system_docs[dec_keys[index]];
          //console.log(default_doc)
          let docSearch = await this.db_api.search({
            selector: default_doc.search_criteria,
          }); 
          if(docSearch.docs.length == 0){
            let new_record = await this.create(default_doc.new_data)
            new_docs.push(new_record["_id"])
          }
        }
        //console.log(new_docs)

      // step 2: link app doc to all other docs. this is only done if new docs are created
      let edge_name =  sys_sch.default_app.default_system_docs["app_edge_constraint"]["new_data"]["data"]["name"]
      let app_doc_id = doc["_id"]
      let all_links = new_docs.map(itm=>{return this.create({schema:"system_edge",data:{ "edge_name": edge_name, node1:app_doc_id,node2: itm  }})   } )
      
      let resp = await Promise.all(all_links);
      //console.log(resp)
      return 

    } catch (error) {
      throw error
    }
  } 

  
  // this main method to initialize external apps
  async initialize_app(app_data_input){
    this._check_ready_to_use()
    let new_ids =  await this._initialize_app_schema(app_data_input)
    let app_records = await this._initialize_app_records(app_data_input,new_ids)
  }


  /**
   * Adds indexes for all the schemas in the data base. This is important to make search faster. This must be done every time a new schema is introduced in the database
   */
  async update_indexes() {
    this._check_ready_to_use();
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


////////////////////////////////////////////////////////
///////////////  CRUD operations  /////////////////////
///////////////////////////////////////////////////////

  /**
   * Creates a document for the given schema into the database.
   *
   * This method validates the input data and schema before inserting a new document into the database.
   *
   * @async
   
   * @param {object} input - The document details, e.g.,{ schema:"name",data: { "name": "", "mobile": "", ... }}.
   * @param {string} [input.schema] - The schema name for the document, e.g., "contact". 
   * @param {object} [input.data={}] - the  data for the document.
   * @param {object} [input.meta={}] - Optional metadata associated with the document.
   * @returns {Promise<{id: string}>} - A promise that resolves with the newly inserted document's ID.
   * @throws {Error} - Throws an error if insertion checks fail or if there is an issue with the database operation.
   */
  async create(input) {
    this._check_ready_to_use();

    let v_errors = []
    if(!input.schema){v_errors.push("schema is required")}
    if(!input.data){v_errors.push("data is required")}
    if(v_errors.length>0){
      throw new DocCreationError(`${v_errors.join(",")}.`)
    }

    // if(input.schema=="system_edge"){throw new DocCreationError("This type of record can only be created through the create_edge api")}
    if(Object.keys(input.data).length==0){throw new DocCreationError(`No data provided`)}
    try {
      let doc_obj = await this._insert_pre_checks(input.schema, input.data,input?.meta||{}, input?.app||{} ,input?.settings||{});
      let new_rec = await this.db_api.insert(doc_obj);
      return {_id:new_rec["id"],_rev : new_rec["rev"] ,...doc_obj};
    } catch (error) {
      throw error;
    }
  }

/**
 * Reads a document from the database based on the provided criteria.
 *
 * There are three valid ways to search for one document:
 * 1. By `_id` (e.g., `{ "_id": "document_id" }`)
 * 2. By `link` (e.g., `{ "link": "some_link" }`)
 * 3. By schema's primary key (e.g., `{ "schema": "schema_name", "data": { "primary_key_1": "value", "primary_key_2": "value" }}`)
 *
 * If the document does not exist, an error will be thrown.
 *
 * @param {Object} criteria - The search criteria for the document.
 * @param {string} [criteria._id] - The document ID for direct lookup.
 * @param {string} [criteria.link] - A unique link identifier for the document.
 * @param {string} [criteria.schema] - The schema name used when searching by primary keys.
 * @param {Object} [criteria.data] - Data object containing the schema's primary keys for search.
 * @param {string} [criteria.include_schema] - Whether to include the schema object in the returned result.
 * @param {string} [criteria.text_template] - The name of the text template. If provided, an additional field called 'view' is returned with the document in the specified text format. 
 * 
 * @returns {Promise<Object>} - Returns an object with the document (`doc`) and optionally the schema (`schema`).
 * 
 * @throws {DocNotFoundError} If no document is found for the given criteria.
 * @throws {ValidationError} If invalid search criteria are provided.
 */
  async read(criteria) {
    // todo : decrypt doc
    this._check_ready_to_use()
    let obj = { doc: null }
    let data_schema = null
    if (criteria._id) {
      try {
        let doc = await this.db_api.get(criteria._id)
        //console.log(doc)
        obj.doc = doc;
      } catch (error) { throw new DocNotFoundError(BeanBagDB.error_codes.doc_not_found)}
    } else if (criteria.link) {
      let linkSearch = await this.db_api.search({selector: { "meta.link": criteria.link }})
      if (linkSearch.docs.length == 0) {throw new DocNotFoundError(BeanBagDB.error_codes.doc_not_found)}
      obj.doc = linkSearch.docs[0];
    } else if (criteria.hasOwnProperty("schema") & criteria.hasOwnProperty("data")) {
      data_schema = await this.get({type:"schema",criteria:{"name":criteria.schema}})
      let A = data_schema["data"]["settings"]["primary_keys"];
      let search_criteria = { schema: criteria.schema };
      A.forEach((itm) => {
        if (!criteria["data"][itm]) {throw new ValidationError("Incomplete Primary key set. Required field(s) : " + A.join(","))}
        search_criteria["data." + itm] = criteria["data"][itm];
      });

      let pkSearch = await this.db_api.search({selector: search_criteria})
      if (pkSearch.docs.length == 0) {throw new DocNotFoundError(BeanBagDB.error_codes.doc_not_found)}
      obj.doc = pkSearch.docs[0]

    } else {
      throw new ValidationError(`Invalid criteria to read a document. Valid ways : {"schema":"schema_name","data":{...primary key}} or {"_id":""} or {"link":""} `)
    }
    if (!data_schema){
      data_schema = await this.get({type:"schema",criteria:{"name":obj.doc.schema}})
    }

    if(criteria.include_schema) {obj.schema = data_schema["data"]}

    // decrypt the document 
    obj.doc = await this._decrypt_doc(data_schema["data"], obj.doc)

    if(criteria.text_template){
      let doc_view = this._compile_template(criteria.text_template,data_schema["data"],obj.doc)
      obj["view"] = doc_view
    }


    return obj;
  }


/**
 * Updates the data and metadata of a document.
 *
 * **Frequently Asked Questions**:
 * 
 * - **Which data fields can be edited?**
 *   - All fields except for the ones listed in the schema's `settings.non_editable_fields` can be edited. If this setting is blank, all fields are editable by default.
 * 
 * - **Are primary key fields editable?**
 *   - Yes, but a validation check ensures that primary key policies are not violated before the update is applied.
 *
 * 
 * @param {Object} params - Object to fetch and update data
 * @param {Object} [params.criteria] - The criteria used to search for the document (e.g., {"_id": "document_id"}, {"link": "some_link"}, {"schema": "schema_name", "data": {primary_key_fields}}).
 * @param {Object} [params.updates] - The updated values for the document, structured as `{data: {}, meta: {}}`. Only the fields to be updated need to be provided.
 * @param {String} [params.rev_id] - The document's revision ID (`_rev`) used for version control and conflict detection.
 * @param {String} [params.update_source="api"] - Identifies the source of the update (default: "api").
 * @param {Boolean} [params.save_conflict=true] - If `true`, conflicting updates will be saved separately in case of revision mismatches.
 * 
 * **Behavior**:
 * - Retrieves the document based on the provided search criteria.
 * - Checks the revision ID to detect potential conflicts. (To be implemented: behavior when the `rev_id` does not match).
 * - Validates editable fields against `schema.settings.editable_fields` (or allows editing of all fields if not specified).
 * - Encrypts fields if encryption is required by the schema settings.
 * - Updates the `meta` fields (such as `updated_on` and `updated_by`) and saves the updated document to the database.
 *
 * **Returns**:
 * @returns {Object} The result of the document update operation.
 *
 * **Errors**:
 * - Throws an error if a document with the same primary keys already exists .
 * - Throws a `DocUpdateError` if a primary key conflict is detected during the update.
 * 
 * @throws {DocUpdateError} - If a document with conflicting primary keys already exists.
 * @throws {ValidationError} - If the provided data or metadata is invalid according to the schema.
 */
  async update(params) {

    this._check_ready_to_use();

    const {
      criteria,
      updates,
      rev_id = "",
      update_source = "api",
      save_conflict = true
    } = params;

    if(!criteria){throw new DocUpdateError("Doc search criteria not provided")}
    if(!updates){throw new DocUpdateError("No updates provided. Format {'update':{'data':{...selected fields},'meta':{},'app':{... used by apps to manage app data} }}")}

    // making a big assumption here : primary key fields cannot be edited
    // so updating the doc will not generate primary key conflicts
    let req_data = await this.read({...criteria, include_schema: true});
    let schema = req_data.schema;
    let full_doc = req_data.doc; 
    // @TODO fix this : what to do if the rev id does not match
    // if (full_doc["_rev"] != rev_id) {
    //   // throw error , save conflicting doc separately by default
    //   if (save_conflict) {
    //     // save conflicting doc todo
    //   }
    // }

    // system generated schemas cannot be edited 
    if(full_doc.schema=="schema"&&full_doc.data.system_generated==true){
      throw new DocUpdateError("System schemas cannot be updated using this API");
    }

    // update new value depending on settings.non_editable_fields (if does not exists, all fields are editable)
    let all_fields = Object.keys(schema.schema.properties);
    let unedit_fields = schema.settings["non_editable_fields"];
    let edit_fields = all_fields.filter((item) => !unedit_fields.includes(item))
    // now generate the new doc with updates
    let something_to_update = false
    let allowed_updates = this.util_filter_object(updates.data||{}, edit_fields);
    if(Object.keys(allowed_updates).length>0){
      //  todo : what if additionalField are allowed ??
      let updated_data = { ...full_doc.data, ...allowed_updates };

      if(full_doc.schema=="system_edge"){
        // extra checks required. if everything is correct 
        updated_data = await this._create_edge(updated_data)
      }    
      updated_data = this.util_validate_data({schema:schema.schema,data: updated_data});
  
      // primary key check if multiple records can  be created
      if (schema.settings["primary_keys"].length > 0) {
        let pri_fields = schema.settings["primary_keys"];
        let search_criteria = { schema: schema.name };
        pri_fields.map((itm) => {search_criteria["data." + itm] = updated_data[itm];});
        let search = await this.search({ selector: search_criteria });
        if (search.docs.length > 0) {
          if (search.docs.length == 1) {
            let thedoc = search.docs[0];
            if (thedoc["_id"] != full_doc._id) {
              throw new DocUpdateError("Update not allowed. Document with the same primary key already exists");
            }
          } else {
            throw new Error("There is something wrong with the schema primary keys");
          }
        }
      }
  
      full_doc["data"] = updated_data;
      something_to_update = true
    }
    if (updates.meta) {
      let m_sch = sys_sch.editable_metadata_schema;
      let editable_fields = Object.keys(m_sch["properties"]);
      //let allowed_meta = this.util_filter_object(updates.meta, editable_fields);
      let allowed_meta = {...full_doc["meta"], ...updates.meta}
      allowed_meta = this.util_validate_data({schema:m_sch, data:allowed_meta});
      // if update has a link ,then check if it already exists 
      if (allowed_meta.link){
        let search = await this.search({ selector: {"meta.link":allowed_meta.link} })
        if (search.docs.length > 0) {
          if (search.docs.length == 1) {
            let thedoc = search.docs[0];
            if (thedoc["_id"] != full_doc._id) {
              throw new DocUpdateError("Update not allowed. Document with the same link already exists");
            }
          } else {throw new Error("There is something wrong.")}
        }
      }

      full_doc["meta"] = {...allowed_meta} ;
      something_to_update = true
    }

    /**
     * to update app data
     * app {  key:{mode:"update|replace|append|remove",data:{}}  }
     */

    if(updates.app){
      if(!full_doc.app){ full_doc["app"]={}}
      //if(update_source=="api"){throw new DocUpdateError(`Invalid update source. Only an app can update app data of the doc. You must specify an app name as "update_source" `)}
      Object.entries(updates.app).forEach(([appName, update]) => {
        if (!update || typeof update !== 'object' || !update.mode || !update.data) {
            console.warn(`Invalid update format for ${appName}`);
            throw new DocUpdateError(`Invalid update format for app ${appName}. Must be an object {mode:"update|replace|append|remove", data:{} }`)
        }
        switch (update.mode) {
            case 'update':
                full_doc.app[appName] = { 
                    ...full_doc.app[appName], 
                    ...update.data 
                };
                something_to_update = true
                break;
            case 'replace':
                full_doc.app[appName] = update.data;
                something_to_update = true
                break;
            case 'append':
                Object.entries(update.data).forEach(([key, value]) => {
                    if (!Array.isArray(full_doc.app[appName]?.[key])) {
                        full_doc.app[appName] = full_doc.app[appName] || {};
                        full_doc.app[appName][key] = [];
                    }
                    full_doc.app[appName][key].push(value);
                });
                something_to_update = true
                break;
            case 'remove':
                delete full_doc.app[appName];
                something_to_update = true
                break;
            default:
              throw new DocUpdateError(  `Unknown mode: ${update.mode} app ${appName}. Must be an object {mode:"update|replace|append|remove", data:{} }`)
        }
      });
    }

    if(something_to_update){
      // encrypt the data again since read returns decrypted data
      full_doc = await this._encrypt_doc(schema, full_doc); 
      full_doc.meta["updated_on"] = this.util_get_now_unix_timestamp();
      full_doc.meta["updated_by"] = update_source;
      // console.log(full_doc)
      let up = await this.db_api.update(full_doc);
      return up;
    }else{
      throw new DocUpdateError("Nothing to update")
    }
  }


/**
 * Deletes a document from the database by its ID.
 *
 * @param {String} doc_id - The ID of the document to delete.
 * @throws {DocNotFoundError} If the document with the specified ID does not exist.
 * @throws {ValidationError} If the database is not ready to use.
 */
  async delete(criteria) {
    this._check_ready_to_use();
    let doc = await this.read(criteria)
    const delete_blocked = ["schema","system_setting","system_log"]
    if (delete_blocked.includes(doc.schema)){
      throw new Error(`Deletion of ${doc.schema} doc is not support yet.`)
    }
    await this.db_api.delete(doc.doc._id);
  }


////////////////////////////////////////////////////////
////////////////// Search ////////////////////////////
///////////////////////////////////////////////////////


  /**
   * Searches for documents in the database for the specified query. The query are Mango queries.
   * One field is mandatory : Schema
   * E.g
   * @param {Object} criteria
   */
  async search(criteria={}) {
    this._check_ready_to_use();
    if (!criteria["selector"]) {
      throw new ValidationError("Invalid search query.Use {selector:{...query...}}");
    }
    //if (!criteria["selector"]["schema"]) {
    //  throw new Error("The search criteria must contain the schema");
    //}
    let search_criteria = {...criteria}
    if(!criteria["limit"]){
        search_criteria["limit"]=1000
    }
    let results = await this.db_api.search(search_criteria);
    let def_options = {decrypt_docs:false}
    let options = { ...def_options, ...criteria?.options||{},  }
    // console.log(options)
    if(options["decrypt_docs"]){
      if(results.docs.length>0){
        results = await this._decrypt_docs(results)
      }       
    }

    return results;
  }

  async _decrypt_docs(search_results){
    const uniqueSchemas = [...new Set(search_results.docs.map(item => item.schema))];
    let schemaSearch = await this.db_api.search({
      selector: { schema: "schema", "data.name":{ "$in":uniqueSchemas } },
    });
    //console.log(schemaSearch)
    let schema = {}
    schemaSearch.docs.map(itm=>{
      schema[itm.data.name] = itm.data
    })
    //console.log(schema)
    let d_results = []
    for (let index = 0; index < search_results.docs.length; index++) {
      const element = search_results.docs[index];
      d_results.push(await this._decrypt_doc(schema[element.schema],element))
    }
    return {docs:d_results}
  }

/**
 * Retrieves special types of documents from the database, such as schema documents or blank documents 
 * for a given schema. It handles system-related data and throws errors for invalid document types 
 * or if the document is not found.
 *
 * @param {Object} [input={}] - Criteria used to search for the special document. 

 * @param {String} input.type - The type of special document to fetch. Supported types include:
 *                                    - 'schema': Retrieves a schema document based on the criteria provided.
 * @param {Object} [input.criteria={}] - Criteria used to search for the special document. 
 *                                 For example, to search for a schema, the criteria should include the name.
 *
 * @throws {ValidationError} Throws if the `special_doc_type` is not recognized.
 * @throws {DocNotFoundError} Throws if the requested document is not found in the database.
 *
 * @returns {Object} The fetched special document based on the type and criteria.
 */
  async get(input){

    // this method returns special types of documents such as schema doc, or a blank doc for a given schema and other system related things 
    const fetch_docs = {
      // to return schema object for the given name
      schema:async (criteria)=>{
        let schemaSearch = await this.db_api.search({
          selector: { schema: "schema", "data.name": criteria.name },
        });
        // console.log(schemaSearch)
        if (schemaSearch.docs.length == 0) {
          throw new DocNotFoundError(BeanBagDB.error_codes.schema_not_found);
        }
        return schemaSearch.docs[0];
      },
      // schema list 
      schema_list:async (criteria)=>{
        let schemaSearch = await this.db_api.search({
          selector: { schema: "schema" },
        });
        // console.log(schemaSearch)
        if (schemaSearch.docs.length == 0) {
          throw new DocNotFoundError(BeanBagDB.error_codes.schema_not_found);
        }else{
          let schemas = []
          schemaSearch.docs.map(doc=>{
            schemas.push({
              name: doc.data.name,
              version: doc.data.version,
              system_defined : doc.data.system_generated,
              description: doc.data.description,
              link: doc.meta.link,
              title:doc.data.title,
              _id:doc._id
            })
          })
          return schemas
        }
        
      },
      schema_icons: async (criteria)=>{
        let schemaSearch = await this.db_api.search({
          selector: { schema: "schema" },
        });
        // console.log(schemaSearch)
        if (schemaSearch.docs.length == 0) {
          throw new DocNotFoundError(BeanBagDB.error_codes.schema_not_found);
        }else{
          let schemas = {}
          schemaSearch.docs.map(doc=>{
            schemas[doc.data.name] = doc.data.settings.svg_icon25||""
          })
          return schemas
        }
      },
      editable_meta_schema: async (criteria)=>{
        let e = sys_sch.editable_metadata_schema
        return e
      },
      related_doc: async (criteria) =>{
        // criteria can be link or id
        let get_doc = await this.read(criteria)
        if(get_doc.doc){
            let node = get_doc.doc._id 
            let data = await this.search({selector:{
              "schema":"system_edge",
              "$or":[ {'data.node1':{"$in":[node]}},{'data.node2':{"$in":[node]}}]
            },fields:["_id","meta","data"]})

            // console.log(rel_docs)
            if(data.docs.length>0){
              let record_details = []
              data.docs.map(itm=>{record_details.push(itm.data.node1);record_details.push(itm.data.node2)})
              let records = await this.search({selector:{"_id":{"$in":record_details}},fields:["_id","meta"]})
              let details = {}
              records.docs.map(itm=>{details[itm._id] = itm.meta})
              let edges = []
              data.docs.map(itm=>{
                edges.push({node1: itm.data.node1, node2: itm.data.node2, label: itm.data.edge_name, edge_id: itm._id })
              })
              return{edges, details }
            }else{
              return {}
            }
    
        }else{
          throw new ValidationError("Doc not found")
        }
      }
    }
    if(!input.type){throw new ValidationError("No type provided. Must be: "+Object.keys(fetch_docs).join(","))}
    if(Object.keys(fetch_docs).includes(input.type)){
      let data = await fetch_docs[input.type](input?.criteria||{})
      return data
    }else{
      throw new ValidationError("Invalid name. Must be : "+Object.keys(fetch_docs).join(","))
    }
  }


//////////////////// methods for special use , requires to be called using the class (rather than the rest api)


  /**
   * To load a plugin in the current BeanBagDB instance.
   * Plug_module has to be loaded manually first. It must export an object containing fields: `actions` and `schema`. 
   * `actions` is an object of methods which can be called after loading the plugin. 
   * `schema` is an array of JSON schemas that are required by the plugin. Every time a plugin is loaded, this list is schemas is verified. New updates are added automatically to the database and logged 
   *  methods inside actions must be async and must have at least one parameter : `db_instance` which is assumed to be the current instance of the BeanBagDB object itself. They ideally must also return some value.
   * @param {string} plugin_name 
   * @param {object} plugin_module 
   */
  async load_scripts(app_name, app_module) {
    this._check_ready_to_use();
    this.apps[app_name] = {};
    if(app_module){
      for (let func_name in app_module) {
        if (typeof app_module[func_name] == "function") {
          this.apps[app_name][func_name] = app_module[func_name].bind(null,this)
        }
      }
    }else{
      console.log("app_module is blank")
    }
  }

  /**
   *  Check if the setting with the given name exists. New record created if not found. If found data is updated based on the updated_mode and the data type of the existing data
   * If existing value is an array, and update_mode is append "value" is appended to the current value array.
   * if existing value is an object, update_mode "append" will update fields that exists in the new object, 
   * for both data types, new value is replaced in update_mode : "replace"
   * @param {string} name The name of the setting  
   * @param {object} value Value to be modified 
   * @param {string} mode 
   */
  async modify_setting(name,value,update_mode){
    if(!name||!value||!update_mode){
      throw new DocUpdateError("All 3 inputs (setting name, value and update_mode) are required")
    }
    let doc_search = await this.db_api.search({
      selector: { schema: "system_setting", "data.name": name },
    });

    if (!["append", "update"].includes(update_mode)) {
      throw new DocUpdateError("Invalid update_mode");
    }

    if (doc_search.docs.length > 0) {
      // doc already exists, 
      let doc = { ...doc_search.docs[0] };
      if (Array.isArray(value)) {
        doc.data.value = update_mode === "append" ? [...doc.data.value, value] : value; // "update" mode replaces the value
      } else {
        doc.data.value = update_mode === "append" ? { ...doc.data.value, ...value } : value; // "update" mode replaces the value
      }
      // finally update it
      doc["meta"]["updated_on"] = this.util_get_now_unix_timestamp();
      // caution : db api is being used directly 
      await this.db_api.update(doc);
      return doc;

    } else {
      // doc does not exists, generate a new one
      let new_log_doc =  this._get_blank_doc("system_setting")
      new_log_doc.data = {value, name}
      await this.db_api.insert(new_log_doc);
      
      
    }
  }

///////////////////////////////////////////////////////////
//////////////// simple directed graph ////////////////////////
//////////////////////////////////////////////////////////

/**
 * To add an edge between 2 nodes in the system wide simple directed graph.
 * @param {object} node1 
 * @param {object} node2 
 * @param {string} edge_name 
 * @param {string} note 
 * @returns {Object}
 */
async _create_edge(input){
  //console.log(input)
  let {node1,node2,edge_name,note="",level_weight=1} = input 
  this._check_ready_to_use();
  if(!edge_name){throw new ValidationError("edge_name required")}
  if(!node1|| Object.keys(node1).length==0){throw new ValidationError("node1 required")}
  if(!node2|| Object.keys(node2).length==0){throw new ValidationError("node2 required")}
  // if nodes are of type string, they are assumed to be ids since they are stored in the DB as ids
  if(typeof(node1)=="string"){node1 = {_id:node1}}
  if(typeof(node2)=="string"){node2 = {_id:node2}}
  let n1 = await this.read(node1)
  let n2 = await this.read(node2)
  if(n1.doc._id==n2.doc._id){
    throw new ValidationError("Both nodes cannot be the same")
  }
  if(n1.doc.schema=="system_edge"|| n2.doc.schema=="system_edge"){
    throw new ValidationError("A node cannot be an existing edge document")
  }
  let edges_constraint

  try {
    // check if edge_name has a related edge_constraint
    let d  = await this.read({schema:"system_edge_constraint",data:{name:edge_name}})
    edges_constraint = d["doc"]["data"]
    let errors = [] 
    let node1id = n1.doc._id
    let node2id = n2.doc._id
    let val_check = this._check_nodes_edge(edges_constraint.node1,edges_constraint.node2,n1.doc.schema,n2.doc.schema)

    if (val_check.valid){
      if(val_check.swapped){
        // swapping required
        node1id = n2.doc._id
        node2id = n1.doc._id
      }
    }else{
      errors.push("Invalid nodes.This config of nodes not allowed")
    }
        
    let records = await this.search({selector:{schema:"system_edge","data.edge_name":edge_name}})

    if(edges_constraint.max_from_node1!=-1){
      let filter1 = records.docs.filter((itm)=>itm.data.node1==node1id)
      if(filter1.length>=edges_constraint.max_from_node1){
        errors.push("max limit reached")
      }
    }

    if(edges_constraint.max_to_node2!=-1){
      let filter2 = records.docs.filter((itm)=>itm.data.node2==node2id)
      if(filter1.length>=edges_constraint.max_from_node1){
        errors.push("max limit reached")
      }
    }
    if(errors.length==0){
      // let edge = await this.create({schema:"system_edge",data:})
      return {node1: node1id , node2: node2id ,edge_name:edge_name ,note:note,level_weight}
    }else{
      throw new RelationError(errors)
    }
    
  } catch (error) {
    if(error instanceof DocNotFoundError){
      let doc = {node1:"*",node2:"*",name:edge_name,note:note}
      let new_doc = await this.create({schema:"system_edge_constraint",data:doc}) 
      return {node1: n1.doc._id,node2: n2.doc._id,edge_name:edge_name ,note:note,level_weight}
    }else{
      throw error
    }  
  }
}

_check_node_schema_match(rule, schema) {
  /**
   * Check if the schema matches the rule. The rule can be:
   * - "*" for any schema
   * - "*-n1,n2" for all schemas except n1 and n2
   * - "specific_schema" or "schema1,schema2" for specific schema matches
   */
  if (rule === "*") {
    return true;
  }
  
  if (rule.startsWith("*-")) {
    // Exclude the schemas listed after "*-"
    const exclusions = rule.slice(2).split(",");
    return !exclusions.includes(schema);
  }
  
  // Otherwise, check if schema matches the specific rule (comma-separated for multiple allowed schemas)
  const allowedSchemas = rule.split(",");
  return allowedSchemas.includes(schema);
}

_check_nodes_edge(node1Rule, node2Rule, schema1, schema2) {
  /**
   * Check if the edge between schema1 (node1) and schema2 (node2) is valid based on the rules
   * node1Rule and node2Rule. Also checks if the nodes should be swapped.
   * 
   */
  // Check if schema1 matches node1Rule and if schema2 matches node2Rule
  const matchesNode1 = this._check_node_schema_match(node1Rule, schema1);
  const matchesNode2 = this._check_node_schema_match(node2Rule, schema2);
  
  // Check if schema1 matches node2Rule and schema2 matches node1Rule (for swapping condition)
  const matchesSwappedNode1 = this._check_node_schema_match(node2Rule, schema1);
  const matchesSwappedNode2 = this._check_node_schema_match(node1Rule, schema2);

  // If the schemas match their respective rules (node1 and node2), the edge is valid
  if (matchesNode1 && matchesNode2) { return { valid: true, swapped: false }}
  
  // If swapping makes it valid, indicate that the nodes should be swapped
  if (matchesSwappedNode1 && matchesSwappedNode2) { return { valid: true, swapped: true }}
  // Otherwise, the edge is invalid
  return { valid: false, swapped: false };
}


///////////////////////////////////////////////////////////
//////////////// Internal methods ////////////////////////
//////////////////////////////////////////////////////////

_compile_template(template_name,schema_doc,doc_obj){
  /**
   * generates text for the doc by compiling the provided template.
   */
  try {
    if(!template_name||!schema_doc||!doc_obj){
      throw new Error("Incomplete info provided")
    }
    let template_info = schema_doc.settings?.text_templates[template_name]
    if(!template_info){
      throw Error("Template not found")
    }
    if (template_info.engine == "js_script") {
      
      const runScript = (script, data) => {
        const cleanScript = script
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .trim();

        if (!cleanScript) {
          throw new Error("Empty script provided");
        }

        const funcBody = `
          "use strict";
          const {doc, schema} = arguments[0] || {};
          ${cleanScript}
        `;

        try {
          const func = new Function(funcBody);
          const result = func(data);
          if (result && typeof result.text === 'string') {
            return result;
          }
          throw new Error("Script must return {text: '...'}");
        } catch (parseError) {
          throw new Error(`Script parse error: ${parseError.message}\nScript: ${cleanScript.substring(0, 100)}...`);
        }
      };
      
      let result = runScript(template_info.template, {
        doc: doc_obj,
        schema: schema_doc,
      });
      // if (!result.text) {
      //   throw new Error("js_script template must return {'text': '...'}");
      // }
      return result.text;
    } else if (this.utils.compile_template[template_info.engine]) {
      let result = this.utils.compile_template[template_info.engine](
        template_info.template,
        {
          doc: doc_obj,
          schema: schema_doc,
        },
      );
      if (!result.text) {
        throw new Error(`${template_name} template must return {'text': '...'}`);
      }
      return result.text
    } else {
      throw Error(
        `The engine ${template_info.engine} is not available in the current instance of BBDB.`,
      );
    }

  } catch (error) {
    let text = `Unable to compile the template ${template_name}.Error: ${error.message}`
    return text
  }
}


async _upgrade_schema_in_bulk(schemas,log_upgrade=false,log_message="Schema Upgrade in bulk"){
  // TODO add a check to now allow default system schema to be updated from this method

  let steps = ["schema update started"]
  let update_was_required = false
  for (let index = 0; index < schemas.length; index++) {
    const schema_name = schemas[index]["name"];
    const schema_data = schemas[index]
    steps.push(`checking.${schema_name}`)
    try {
      let schema1 = await this.get({type:"schema",criteria:{name:schema_name}}) 
      if (schema1["data"]["version"] != schema_data.version) {
        steps.push(`old.${schema_name}.v.${schema1["data"]["version"]}`);
        let full_doc = await this.db_api.get(schema1["_id"]);
        full_doc["data"] = { ...schema_data };
        full_doc["meta"]["updated_on"] = this.util_get_now_unix_timestamp();
        console.log(full_doc)
        await this.db_api.update(full_doc);
        steps.push(`new.${schema_name}.v=${schema_data.version}`);
        update_was_required = update_was_required || true
      }else{
        steps.push(`${schema_name}.v.${schema1["data"]["version"]}=latest`)
      }
    } catch (error) {
      // console.log(error);
      if (error instanceof DocNotFoundError) {
        // inserting new schema doc
          let system_schema = sys_sch.default_app.schemas[0]["schema"]
          let new_schema_doc = this._get_blank_schema_doc(
            "schema",
            system_schema,
            schema_data
          );
          await this.db_api.insert(new_schema_doc);
        
        steps.push(`init.${schema_name}.v=${schema_data.version}`);
        update_was_required = update_was_required || true
      }else{
        steps.push(`${schema_name}.error.message : ${error.message} `);
      }
    }
  }
  // console.log(JSON.stringify(steps))
  // console.log(update_was_required)
  if (update_was_required && log_upgrade){
    // log it if asked 
    try {
      let new_log_doc =  this._get_blank_doc("system_log")
      new_log_doc.data = {text:log_message,data:{steps},time:this.util_get_now_unix_timestamp()}
      await this.db_api.insert(new_log_doc);      
    } catch (error) {
      console.log(error) 
    }

  }
  return {update_was_required,logs:steps}
}

/**
 * Retrieves the current version of the system by summing up the version numbers 
 * of all system-defined schemas.
 *
 * @private
 * @returns {number} The total sum of the version numbers of all system-defined schemas.
 *
 * @throws {Error} Throws if there is an issue calculating the sum of version numbers.
 */
  _get_current_version() {
    // current version is the sum of versions of all system defined schemas
    let sum = 0 
    // sys_sch.schema_schema.version;
    sys_sch.default_app.schemas.map((item) => {sum = sum + item.version})

    // Object.keys(sys_sch.default_app.default_docs).map((item) => {sum = sum + sys_sch.default_app.default_docs[item].version})
    if (sum == NaN) {
      throw Error("Error in system schema version numbers");
    }
    return sum;
  }

  /**
   * Checks if the database is ready to use.
   *
   * This method verifies if the database is in an active state. If the database is not ready,
   * it throws an error indicating that the database is inactive.
   *
   * @private
   * @throws {Error} - Throws an error if the database is not active.
   */
  _check_ready_to_use() {
    if (!this.active) {
      throw new Error(BeanBagDB.error_codes.not_active);
    }
  }

  /**
   * Generates a blank database json object. All objects in the database follow the same structure
   * @private
   * @param {string} schema_name
   * @returns {object}
   */
  _get_blank_doc(schema_name) {
    if (!schema_name) {
      throw new Error("Schema name not provided for the blank doc");
    }
    let dt = this.util_get_now_unix_timestamp()
    let title = `${dt}`
    let doc = {
      data: {},
      meta: {
        created_on: dt,
        tags: [],
        link: this.util_generate_random_link(), // there is a link by default. overwrite this if user provided one but only before checking if it is unique
        title: title
      },
      app:{},
      schema: schema_name,
    };
    return doc;
  }

  /**
   * Generates a blank schema doc ready to be inserted to the database. This is for internal use
   * @private
   * @param {string} schema_name
   * @param {Object} schema_object
   * @param {Object} data
   * @returns {Object}
   */
  _get_blank_schema_doc(schema_name, schema_object, data) {
    let new_data = this.util_validate_data({schema:schema_object, data});
    let obj = this._get_blank_doc(schema_name);
    obj["data"] = new_data;
    return obj;
  }

  /**
   * Decrypts a given document using it's schema. The list of encrypted fields : schema_obj.settings.encrypted_fields
   * @private
   * @param {Object} schema_obj
   * @param {Object} doc_obj
   * @returns {Object}
   */
  async _decrypt_doc(schema_obj, doc_obj) {
    try {
      for (let itm of schema_obj.settings["encrypted_fields"]) {
        doc_obj.data[itm] = await this.utils.decrypt(doc_obj.data[itm], this.encryption_key);
      }
      return { ...doc_obj };  
    } catch (error) {
      console.log(error)
      throw new EncryptionError([{message:error.message}])
    }
  }

  /**
   * Encrypts a given doc using it's schema obj.
   * @private
   * @param {Object} schema_obj
   * @param {Object} doc_obj
   * @returns {Object}
   */
  async _encrypt_doc(schema_obj, doc_obj) {
    try {
      if (schema_obj.settings["encrypted_fields"].length > 0) {
        // console.log(schema_obj,doc_obj)
        for (let itm of schema_obj.settings["encrypted_fields"]) {
          doc_obj.data[itm] = await this.utils.encrypt(doc_obj.data[itm], this.encryption_key);
        }
      }
      return { ...doc_obj };  
    } catch (error) {
      throw new EncryptionError([{message:error.message}])
    }
  }

  /**
   * Validates the new document before inserting it into the database.
   *
   * This method performs a series of checks:
   * - Fetches the schema object and validates the `data` object against it.
   * - Checks for existing documents with the same primary keys.
   * - Replaces encrypted fields with their encrypted values.
   *
   * It then generates the document ready for insertion and returns it.
   *
   * @private
   * @param {Object} schema - The schema object or schema name to validate against.
   * @param {Object} data - The data object to be validated and prepared for insertion.
   * @param {Object} [meta={}] - Additional metadata related to the document.
   * @param {Object} [settings={}] - Optional settings to guide special checks.
   *
   * @returns {Promise<Object>} - Returns the validated document object ready for insertion.
   *
   * @throws {Error} If validation fails, or the document already exists.
   */
  async _insert_pre_checks(schema, data,  meta = {}, app={} ,settings = {}) {
    // schema search
    let sch_search = await this.search({selector: { schema: "schema", "data.name": schema }})
    if (sch_search.docs.length == 0) {throw new DocCreationError(`The schema "${schema}" does not exists`)}
    let schemaDoc = sch_search.docs[0]["data"];
    // validate data
    if(!schemaDoc.active){throw new DocCreationError(`The schema "${schema}" is not active`)}

    let new_data
    if(schema!="system_edge"){
      new_data = this.util_validate_data({schema:schemaDoc.schema, data});
    }    

    // validate meta
    if(Object.keys(meta).length>0){
      meta = this.util_validate_data({schema:sys_sch.editable_metadata_schema, data:meta})
    }

    if(Object.keys(app).length>0){
      let app_schema = {
        "type": "object",
        "patternProperties": {
          ".*": {
            "type": "object"
          }
        },
        "additionalProperties": false
      }
      let app1 = this.util_validate_data({schema:app_schema, data:app})
    }
    

    // duplicate meta.link check
    if (meta.link) {
      let link_search = await this.search({selector: { "meta.link": meta.link }})
      if (link_search.docs.length > 0) {throw new DocCreationError(`Document with the link "${meta.link}" already exists in the Database.`)}
    }

    // special checks for special docs
    // @TODO : for schema dos: settings fields must be in schema field
    if (schema == "schema") {
      //more checks are required
      this.util_validate_schema_object(new_data);
    }else if(schema == "system_edge"){
      let create_edge_after_checks = await this._create_edge(data)
      new_data = create_edge_after_checks
    }
    // @TODO : check if single record setting is set to true
    //console.log(schemaDoc)
    // duplicate check
    if (schemaDoc.settings["primary_keys"].length > 0) {
      let primary_obj = { schema: schema };
      schemaDoc.settings["primary_keys"].map((ky) => {primary_obj["data." + ky] = new_data[ky];});
      let prim_search = await this.search({ selector: primary_obj });
      if (prim_search.docs.length > 0) {
        throw new DocCreationError(`Document with the given primary key (${schemaDoc.settings["primary_keys"].join(",")}) already exists in the schema "${schema}"`);
      }
    }
    // encrypt if required

    if (schemaDoc.settings["encrypted_fields"].length > 0) {
      // todo test if encryption is successful 
      for (let itm of schemaDoc.settings["encrypted_fields"]) {
        new_data[itm] = await this.utils.encrypt(new_data[itm], this.encryption_key);
      }
    }

    // generate the doc object for data
    let doc_obj = this._get_blank_doc(schema);
    doc_obj["data"] = new_data;
    // if meta exists
    if(meta){
      doc_obj["meta"] = {...doc_obj["meta"],...meta};
    }
    if(app){
      doc_obj["app"] = app
    }
    return doc_obj;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////
  ////// Utility methods /////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Returns the current Unix timestamp in seconds.
   * divide by 1000 (Date.now gives ms) to convert to seconds. 1 s = 1000 ms
   * @private
   * @returns {number}
   */
    util_get_now_unix_timestamp() {return Math.floor(Date.now() / 1000)}


  util_check_required_fields(requiredFields, obj) {
    for (const field of requiredFields) {
      if (!obj[field]) {throw new ValidationError(`The field ${field} is required.`)}
    }
  }

  /**  Filters an object, returning a new object that only contains the specified fields.
 * const data = { name: "Alice", age: 25, location: "NY" };
 * const result = util_filter_object(data, ["name", "age"]);
 * // result: { name: "Alice", age: 25 }
 */
  util_filter_object(obj, fields) {
    return fields.reduce((filteredObj, field) => {
      if (Object.prototype.hasOwnProperty.call(obj, field)) {
        filteredObj[field] = obj[field];
      }
      return filteredObj;
    }, {});
  }

  /**
   * Validates a data object against a provided JSON schema and returns a valid data object (with default value for missing field for which default values are defined in the schema )
   * It relies on the external API provided by the user
   * @param {Object} schema_obj - The JSON schema object to validate against
   * @param {Object} data_obj - The data object to validate
   * @throws {Error} If the data object does not conform to the schema
   */
  util_validate_data(input) {
    if(!input.schema){throw new ValidationError("schema is required")}
    if(!input.data){throw new ValidationError("data is required")}

    const { valid, validate , data} = this.utils.validate_schema(input.schema,input.data)
    if (!valid) {
      throw new ValidationError(validate.errors);
    }else{
      return data
    }
  }

  /**
 * Validates the structure and content of a schema object.
 *
 * This method checks the following conditions:
 * 
 * - The schema must have a 'type' field, which should be 'object'.
 * - The 'properties' field must be an object and contain at least one property.
 * - The 'additionalProperties' field must be present and of type boolean.
 * - Primary keys must be defined in the schema and cannot be of type 'object' or 'array'.
 * - Non-editable fields must be defined in the schema.
 * - Encrypted fields must be defined in the schema, of type 'string', and cannot include primary keys.
 *
 * If any of these conditions are violated, an array of error messages will be 
 * collected and thrown as a ValidationError.
 *
 * @param {Object} schema_doc - The schema document to validate.
 * @param {Object} schema_doc.schema - The schema structure containing:
 *   @param {String} schema_doc.schema.type - The type of the schema (must be 'object').
 *   @param {Object} schema_doc.schema.properties - The properties defined in the schema.
 *   @param {Boolean} schema_doc.schema.additionalProperties - Indicates if additional properties are allowed.
 * @param {Object} schema_doc.settings - The settings associated with the schema, including:
 *   @param {Array<String>} schema_doc.settings.primary_keys - List of primary keys for the schema.
 *   @param {Array<String>} schema_doc.settings.non_editable_fields - Fields that cannot be edited.
 *   @param {Array<String>} schema_doc.settings.encrypted_fields - Fields that require encryption.
 * 
 * @throws {ValidationError} If any validation checks fail, with an array of error messages.
 */
  util_validate_schema_object(schema_doc) {
    let errors = [{ message: "Schema validation errors " }];
    if (!schema_doc["schema"]["type"]) {
      errors.push({message:"Schema must have the field schema.'type' which can only be 'object' "});
    } else {
      if (schema_doc["schema"]["type"] != "object") {
        errors.push({message: "The schema.'type' value  is invalid.Only 'object' allowed",});
      }
    }
    if (!schema_doc["schema"]["properties"]) {
      errors.push({
        message: "The schema.'properties' object does not exists",
      });
    } else {
      if (typeof schema_doc["schema"]["properties"] != "object") {
        errors.push({message:"Invalid schema.properties. It must be an object and must have atleast one field inside.",});
      }
      if (Object.keys(schema_doc["schema"]["properties"]).length == 0) {
        errors.push({ message: "You must define at least one property" });
      }
    }

    if (!schema_doc["schema"].hasOwnProperty("additionalProperties")) {
      errors.push({message: "The schema.'additionalProperties' field is required",});
    } else {
      if (typeof schema_doc["schema"]["additionalProperties"] != "boolean") {
        errors.push({message:"Invalid schema.additionalProperties. It must be a boolean value",});
      }
    }

    const allKeys = Object.keys(schema_doc["schema"]["properties"]);
    if (schema_doc["settings"]["primary_keys"].length > 0) {
      // check if all keys belong to the schema and are not of type object
      let all_pk_exist = schema_doc["settings"]["primary_keys"].every(
        (item) =>
          allKeys.includes(item) &&
          schema_doc["schema"]["properties"][item]["type"] != "object" &&
          schema_doc["schema"]["properties"][item]["type"] != "array"
      );

      if (!all_pk_exist) {
        errors.push({message:"Primary keys invalid. All keys must be defined in the schema and must be non object",});
      }
    }

    if (schema_doc["settings"]["non_editable_fields"].length > 0) {
      // check if all keys belong to the schema
      let all_ne_exist = schema_doc["settings"]["non_editable_fields"].every(
        (item) => allKeys.includes(item)
      );
      if (!all_ne_exist) {
        errors.push({message:"Non editable fields invalid. All fields must be defined in the schema ",});
      }
    }

    if (schema_doc["settings"]["encrypted_fields"].length > 0) {
      // check if all keys belong to the schema and are only string
      let all_enc_exist = schema_doc["settings"]["encrypted_fields"].every((item) =>allKeys.includes(item) &&schema_doc["schema"]["properties"][item]["type"] == "string");
      if (!all_enc_exist) {
        errors.push({message:"Invalid encrypted fields. All fields must be defined in the schema and must be string ",});
      }

      // check : primary keys cannot be encrypted
      let all_enc_no_pk = schema_doc["settings"]["encrypted_fields"].every((item) => !schema_doc["settings"]["primary_keys"].includes(item));
      if (!all_enc_no_pk) {
        errors.push({message:"Invalid encrypted fields.Primary key fields cannot be encrypted ",});
      }
    }

    /// cannot encrypt primary field keys
    if (errors.length > 1) {throw new ValidationError(errors)}
  }

/**
 * Generates a random link composed of four words from a predefined dictionary.
 *
 * The words are selected randomly, and the resulting link is formatted as 
 * a hyphen-separated string. This can be useful for creating link for documents.
 *
 * @returns {String} A hyphen-separated string containing three randomly 
 *                  selected words from the dictionary. For example: 
 *                  "banana-earth-rain".
 *
 */
    util_generate_random_link(input={type:1}) {
      const options = {
        0:()=>{
          // prettier-ignore
          const dictionary = ['rain', 'mars', 'banana', 'earth', 'kiwi', 'mercury', 'fuji', 'hurricane', 'matterhorn', 'snow', 'saturn', 'jupiter', 'peach', 'wind', 'pluto', 'apple', 'k2', 'storm', 'venus', 'denali', 'cloud', 'sunshine', 'mango', 'drizzle', 'pineapple', 'aconcagua', 'gasherbrum', 'apricot', 'neptune', 'fog', 'orange', 'blueberry', 'kilimanjaro', 'uranus', 'grape', 'storm', 'montblanc', 'lemon', 'chooyu', 'raspberry', 'cherry', 'thunder', 'vinson', 'breeze', 'elbrus', 'everest', 'parbat', 'makalu', 'nanga', 'kangchenjunga', 'lightning', 'cyclone', 'comet', 'asteroid', 'pomegranate', 'nectarine', 'clementine', 'strawberry', 'tornado', 'avalanche', 'andes', 'rockies', 'himalayas', 'pyrenees', 'carpathians', 'cascade', 'etna', 'vesuvius', 'volcano', 'tundra', 'whirlwind', 'iceberg', 'eclipse', 'zephyr', 'tropic', 'monsoon', 'aurora'];
          return Array.from({ length: 3 },() => dictionary[Math.floor(Math.random() * dictionary.length)]).join("-");
        },
        1:()=>{
          const length = Math.floor(Math.random() * 3) + 6; // Random length: 6, 7, or 8
          const hexNumber = Math.floor(Math.random() * Math.pow(16, length)).toString(16);
          return hexNumber.padStart(length, '0'); // Ensure it has the desired length
          
        }
      }
      return options[input.type]()
    }
}

////////////////// Error classes ////////////////////////////////////////////////////

/**
 * This is common for all error classes 
 * @typedef {Object} ErrorItem
 * @property {string} [instancePath] - The path where the error occurred, optional. 
 * @property {string} message - The error message.
 */

/**
 * Custom error class for validation errors.
 * 
 * @extends {Error}
 */
export class ValidationError extends Error {
 /**
 * Custom error class for validation errors.
 * 
 * @extends {Error}
 * @param {ErrorItem[]} [errors=[]] - An array of error objects, each containing details about validation failures.
 */
  constructor(errors = []) {
    // Create a message based on the list of errors
    //console.log(errors)
    let error_messages 
    if(Array.isArray(errors)){
      error_messages = errors.map(item=>` ${(item.instancePath||" ").replace("/","")} ${item.message} `)
    }else {
      error_messages = [errors]
    }
    let message = `Validation failed with error(s): ${error_messages.join(",")}`;
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;  // Store the list of errors
  }
}



/**
 * Custom error class for document update errors.
 * 
 * @extends {Error}
 */
export class DocUpdateError extends Error {
/**
 * Custom error class for document update errors.
 * 
 * @extends {Error}
 * @param {ErrorItem[]} [errors=[]] - An array of error objects, each containing details about validation failures.
 */
  constructor(errors=[]){
    let error_messages 
    if(Array.isArray(errors)){
      error_messages = errors.map(item=>` ${(item.instancePath||" ").replace("/","")} ${item.message} `)
    }else {
      error_messages = [errors]
    }
    let message = `Error in document update. ${error_messages.join(",")}`
    super(message)
    this.name = "DocUpdateError";
    this.errors = errors
  }
}

/**
 * Custom error class for document insert errors.
 * 
 * @extends {Error}
 */
export class DocCreationError extends Error {
  /**
 * Custom error class for document insert errors.
 * 
 * @extends {Error}
 * @param {ErrorItem[]} [errors=[]] - An array of error objects, each containing details about validation failures.
 */
  constructor(errors=[]){
    let error_messages 
    if(Array.isArray(errors)){
      error_messages = errors.map(item=>` ${(item.instancePath||" ").replace("/","")} ${item.message} `)
    }else {
      error_messages = [errors]
    }
    let message = `Error in document creation. ${error_messages.join(",")}`
    super(message)
    this.name = "DocCreationError";
    this.errors = errors
  }
}

/**
 * Custom error class for document not found errors.
 * 
 * @extends {Error}
 */
export class DocNotFoundError extends Error {
    /**
 * Custom error class for document not found errors.
 * 
 * @extends {Error}
 * @param {ErrorItem[]} [errors=[]] - An array of error objects, each containing details about validation failures.
 */
  constructor(errors=[]){
    let error_messages 
    if(Array.isArray(errors)){
      error_messages = errors.map(item=>` ${(item.instancePath||" ").replace("/","")} ${item.message} `)
    }else {
      error_messages = [errors]
    }
    let message = `Error in fetching document. Criteria : ${error_messages.join(",")}`
    super(message)
    this.name = "DocNotFoundError";
    this.errors = errors
  }
}


/**
 * Custom error class for encryption error.
 * 
 * @extends {Error}
 */
export class EncryptionError extends Error {
  /**
* Custom error class for document not found errors.
* 
* @extends {Error}
* @param {ErrorItem[]} [errors=[]] - An array of error objects, each containing details about validation failures.
*/
constructor(errors=[]){
  let error_messages 
    if(Array.isArray(errors)){
      error_messages = errors.map(item=>` ${(item.instancePath||" ").replace("/","")} ${item.message} `)
    }else {
      error_messages = [errors]
    }
  let message = `Error in encryption/decryption of data  : ${error_messages.join(",")}`
  super(message)
  this.name = "EncryptionError";
  this.errors = errors
}
}

/**
 * Custom error class for relation error.
 * 
 * @extends {Error}
 */
export class RelationError extends Error {
  /**
* 
* @extends {Error}
* @param {ErrorItem[]} [errors=[]] - An array of error objects, each containing details about validation failures.
*/
constructor(errors=[]){
  let error_messages 
    if(Array.isArray(errors)){
      error_messages = errors.map(item=>` ${(item.instancePath||" ").replace("/","")} ${item.message} `)
    }else {
      error_messages = [errors]
    }
  let message = `Error in relation of the simple digraph : ${error_messages.join(",")}`
  super(message)
  this.name = "RelationError";
  this.errors = errors
}
}