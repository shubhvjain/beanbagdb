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
   */
  constructor(db_instance) {
    this.util_check_required_fields(["name", "encryption_key", "api", "utils", "db_name"],db_instance)
    this.util_check_required_fields(["insert", "update", "delete", "search", "get", "createIndex"],db_instance.api)
    this.util_check_required_fields(["encrypt", "decrypt", "ping", "validate_schema"],db_instance.utils)

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
    this.plugins = {};
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
   * - Searches the database for the `system_settings.beanbagdb_version` document.
   * - Sets the class state as active if the version matches the current BeanBagDB version.
   * - If the version does not match, calls `initialize()` to set up the database to the latest version.
   * @todo Code to ping the DB and throw Connection error if failed to connect
   * @async
   * @returns {Promise<void>} - Resolves when the database has been verified and initialized.
   */
  async ready() {
    // TODO Ping db
    let version_search = await this.db_api.search({
      selector: { schema: "system_settings", "data.name": "beanbagdb_version" },
    });
    if (version_search.docs.length > 0) {
      let doc = version_search.docs[0];
      this.active = doc["data"]["value"] == this._version;
      this.meta.beanbagdb_version_db = doc["data"]["value"];
    }
    if (this.active) {
      console.log("Ready");
    } else {
      await this.initialize();
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
    let logs = ["init started"];
    try {
      let schema = await this.get("schema",{name:"schema"});
      if (schema["data"]["version"] != sys_sch.schema_schema.version) {
        logs.push("old schema_schema v " + schema["data"]["version"]);
        let full_doc = await this.db_api.get(schema["_id"]);
        full_doc["data"] = { ...sys_sch.schema_schema };
        full_doc["meta"]["updated_on"] = this.util_get_now_unix_timestamp();
        await this.db_api.update(full_doc);
        logs.push("new schema_schema v " + sys_sch.schema_schema.version);
      }
    } catch (error) {
      // console.log(error);
      if (error instanceof DocNotFoundError) {
        // inserting new schema_schema doc
        let schema_schema_doc = this._get_blank_doc("schema");
        schema_schema_doc.data = sys_sch.schema_schema;
        await this.db_api.insert(schema_schema_doc);
        logs.push("init schema_schema v " + sys_sch.schema_schema.version);
      }
    }

    let keys = Object.keys(sys_sch.system_schemas);
    for (let index = 0; index < keys.length; index++) {
      const schema_name = sys_sch.system_schemas[keys[index]]["name"];
      const schema_data = sys_sch.system_schemas[keys[index]];
      try {
        // console.log(schema_name)
        let schema1 = await this.get("schema",{name:schema_name}) 
        if (schema1["data"]["version"] != schema_data.version) {
          logs.push("old " + schema_name + " v " + schema1["data"]["version"]);
          let full_doc = await this.db_api.get(schema1["_id"]);
          full_doc["data"] = { ...schema_data };
          full_doc["meta"]["updated_on"] = this.util_get_now_unix_timestamp();
          await this.db_api.update(full_doc);
          logs.push("new " + schema_name + " v " + schema_data.version);
        }
      } catch (error) {
        // console.log(error);
        if (error instanceof DocNotFoundError) {
          // inserting new schema doc
          let new_schema_doc = this._get_blank_schema_doc(
            "schema",
            sys_sch.schema_schema["schema"],
            schema_data
          );
          await this.db_api.insert(new_schema_doc);
          logs.push("init " + schema_name + " v " + schema_data.version);
        }
      }
    }
    // store the logs in the log_doc ,  generate it for the first time
    // console.log(logs)
    if (logs.length > 1) {
      // version needs to be updated in the object as well as settings and must be logged
      logs.push("Init done");

      await this.save_setting_doc("system_logs", {
        value: { text: logs.join(","), added: this.util_get_now_unix_timestamp() },
        on_update_array: "append",
      });
      await this.save_setting_doc("beanbagdb_version", {
        value: this._version,
      });

      this.meta.beanbagdb_version_db = this._version;
      this.active = true;
      console.log(logs.join(","))
    } else {
      // no new updates were done
      console.log("Database already up to date");
    }
  }


  /**
   * Updates a setting document if it already exists in the database or creates a new document
   * Inserts or updates a setting in the system settings schema.
   *
   * This method either:
   * - Updates an existing document if the setting with the given `name` already exists in the database.
   * - Inserts a new document if no matching setting is found.
   *
   * If the setting exists and the `value` is an array, the behavior depends on the `on_update_array` key:
   * - `"append"`: Appends the new value to the existing array.
   * - `"update"`: Replaces the current array with the new value.
   *
   * @async
   * @param {string} name - The name of the setting to insert or update.
   * @param {object} new_data - The new data to insert or update.
   * @param {*} new_data.value - The value to insert or update.
   * @param {string} [new_data.on_update_array] - Optional behavior for handling arrays, either "append" or "update".
   * @param {object} [schema={}] - Optional schema to validate the data against (currently not implemented).
   * @returns {Promise<object>} - The updated or newly inserted document.
   * @throws {Error} - Throws an error if `new_data` or `new_data.value` is not provided, or if `on_update_array` is invalid.
   */
  async save_setting_doc(name, new_data, schema = {}) {
    // TODO implement schema check
    if (!new_data) {
      throw new Error("No data provided");
    }
    if (!new_data.value) {
      throw new Error("No value provided");
    }

    let doc_search = await this.db_api.search({
      selector: { schema: "system_settings", "data.name": name },
    });
    if (doc_search.docs.length > 0) {
      // doc already exists, check schema and update it : if it exists then it's value already exists and can be
      let doc = { ...doc_search.docs[0] };
      if (Array.isArray(doc.data.value)) {
        let append_type = doc.data.on_update_array;
        if (append_type == "append") {
          doc["data"]["value"].push(new_data.value);
        } else if (append_type == "update") {
          doc["data"]["value"] = new_data.value;
        } else {
          throw new Error("Invalid on update array value");
        }
      } else {
        doc["data"]["value"] = new_data.value;
      }
      // finally update it
      doc["meta"]["updated_on"] = this.util_get_now_unix_timestamp();
      await this.db_api.update(doc);
      return doc;
    } else {
      // doc does not exists, generate a new one
      let new_val = { value: new_data.value };

      if (new_data.on_update_array) {
        // this indicates the provided value is initial value inside the array
        new_val.value = [new_data.value];
        new_val.on_update_array = new_data.on_update_array;
      }
      let new_doc = this._get_blank_doc("system_settings");
      new_doc["data"] = {
        name: name,
        ...new_val,
      };
      let d = await this.db_api.insert(new_doc);
      return d;
    }
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
   * @param {string} schema - The schema name for the document, e.g., "contact".
   * @param {object} data - The document data, e.g., { "name": "", "mobile": "", ... }.
   * @param {object} [meta={}] - Optional metadata associated with the document.
   * @param {object} [settings={}] - Optional settings that may affect document creation behavior.
   * @returns {Promise<{id: string}>} - A promise that resolves with the newly inserted document's ID.
   * @throws {Error} - Throws an error if insertion checks fail or if there is an issue with the database operation.
   */
  async create(schema, data, meta = {}, settings = {}) {
    this._check_ready_to_use();
    if(!schema){throw new DocCreationError(`No schema provided`)}
    if(Object.keys(data).length==0){throw new DocCreationError(`No data provided`)}
    try {
      let doc_obj = await this._insert_pre_checks(schema, data,meta, settings);
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
 * 
 * @param {boolean} [include_schema=false] - Whether to include the schema object in the returned result.
 * 
 * @returns {Promise<Object>} - Returns an object with the document (`doc`) and optionally the schema (`schema`).
 * 
 * @throws {DocNotFoundError} If no document is found for the given criteria.
 * @throws {ValidationError} If invalid search criteria are provided.
 */
  async read(criteria, include_schema = false) {
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
      data_schema = await this.get("schema",{"name":criteria.schema})
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
      data_schema = await this.get("schema",{"name":obj.doc.schema})
    }
    if(include_schema) {obj.schema = data_schema["data"]}
    // decrypt the document 
    obj.doc = await this._decrypt_doc(data_schema["data"], obj.doc)
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
 * @param {Object} doc_search_criteria - The criteria used to search for the document (e.g., {"_id": "document_id"}, {"link": "some_link"}, {"schema": "schema_name", "data": {primary_key_fields}}).
 * @param {String} rev_id - The document's revision ID (`_rev`) used for version control and conflict detection.
 * @param {Object} updates - The updated values for the document, structured as `{data: {}, meta: {}}`. Only the fields to be updated need to be provided.
 * @param {String} [update_source="api"] - Identifies the source of the update (default: "api").
 * @param {Boolean} [save_conflict=true] - If `true`, conflicting updates will be saved separately in case of revision mismatches.
 * 
 * **Behavior**:
 * - Retrieves the document based on the provided search criteria.
 * - Checks the revision ID to detect potential conflicts. (To be implemented: behavior when the `rev_id` does not match).
 * - Validates editable fields against `schema.settings.editable_fields` (or allows editing of all fields if not specified).
 * - Performs primary key conflict checks if multiple records are allowed (`single_record == false`).
 * - Encrypts fields if encryption is required by the schema settings.
 * - Updates the `meta` fields (such as `updated_on` and `updated_by`) and saves the updated document to the database.
 *
 * **Returns**:
 * @returns {Object} The result of the document update operation.
 *
 * **Errors**:
 * - Throws an error if a document with the same primary keys already exists (and `single_record == false`).
 * - Throws a `DocUpdateError` if a primary key conflict is detected during the update.
 * 
 * @throws {DocUpdateError} - If a document with conflicting primary keys already exists.
 * @throws {ValidationError} - If the provided data or metadata is invalid according to the schema.
 */
  async update(doc_search_criteria, updates, rev_id="", update_source = "api", save_conflict = true) {
    this._check_ready_to_use();
    // making a big assumption here : primary key fields cannot be edited
    // so updating the doc will not generate primary key conflicts
    let req_data = await this.read(doc_search_criteria, true);
    let schema = req_data.schema;
    let full_doc = req_data.doc; 
    // @TODO fix this : what to do if the rev id does not match
    // if (full_doc["_rev"] != rev_id) {
    //   // throw error , save conflicting doc separately by default
    //   if (save_conflict) {
    //     // save conflicting doc todo
    //   }
    // }

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

      this.util_validate_data(schema.schema, updated_data);
  
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
      let allowed_meta = this.util_filter_object(updates.meta, editable_fields);
      this.util_validate_data(m_sch, allowed_meta);
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

      full_doc["meta"] = { ...full_doc["meta"], ...allowed_meta };
      something_to_update = true
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
    const delete_blocked = ["schema","setting","key"]
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
    const results = await this.db_api.search(criteria);
    return results;
  }

/**
 * Retrieves special types of documents from the database, such as schema documents or blank documents 
 * for a given schema. It handles system-related data and throws errors for invalid document types 
 * or if the document is not found.
 *
 * @param {String} special_doc_type - The type of special document to fetch. Supported types include:
 *                                    - 'schema': Retrieves a schema document based on the criteria provided.
 * @param {Object} [criteria={}] - Criteria used to search for the special document. 
 *                                 For example, to search for a schema, the criteria should include the name.
 *
 * @throws {ValidationError} Throws if the `special_doc_type` is not recognized.
 * @throws {DocNotFoundError} Throws if the requested document is not found in the database.
 *
 * @returns {Object} The fetched special document based on the type and criteria.
 */
  async get(special_doc_type,criteria={}){
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
              _id:doc._id
            })
          })
          return schemas
        }
        
      }
    }
    if(Object.keys(fetch_docs).includes(special_doc_type)){
      let data = await fetch_docs[special_doc_type](criteria)
      return data
    }else{
      throw new ValidationError("Invalid special doc type. Must be : "+Object.keys(fetch_docs).join(","))
    }
  }

  async load_plugin(plugin_name, plugin_module) {
    this._check_ready_to_use();
    this.plugins[plugin_name] = {};
    for (let func_name in plugin_module) {
      if (typeof plugin_module[func_name] == "function") {
        this.plugins[plugin_name][func_name] = plugin_module[func_name].bind(null,this)
      }
    }
    // Check if the plugin has an on_load method and call it
    if (typeof this.plugins[plugin_name].on_load === "function") {
      await this.plugins[plugin_name].on_load();
    }
  }

///////////////////////////////////////////////////////////
//////////////// Internal methods ////////////////////////
//////////////////////////////////////////////////////////

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
    let sum = sys_sch.schema_schema.version;
    let keys = Object.keys(sys_sch.system_schemas).map((item) => {
      sum = sum + sys_sch.system_schemas[item].version;
    });
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
    let doc = {
      data: {},
      meta: {
        created_on: this.util_get_now_unix_timestamp(),
        tags: [],
        app: {},
        link: this.util_generate_random_link(), // there is a link by default. overwrite this if user provided one but only before checking if it is unique
      },
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
    this.util_validate_data(schema_object, data);
    let obj = this._get_blank_doc(schema_name);
    obj["data"] = data;
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
  async _insert_pre_checks(schema, data, meta = {}, settings = {}) {
    // schema search
    let sch_search = await this.search({selector: { schema: "schema", "data.name": schema }})
    if (sch_search.docs.length == 0) {throw new DocCreationError(`The schema "${schema}" does not exists`)}
    let schemaDoc = sch_search.docs[0]["data"];
    // validate data
    this.util_validate_data(schemaDoc.schema, data);

    // validate meta
    this.util_validate_data(sys_sch.editable_metadata_schema, meta);

    // duplicate meta.link check
    if (meta.link) {
      let link_search = await this.search({selector: { "meta.link": meta.link }})
      if (link_search.docs.length > 0) {throw new DocCreationError(`Document with the link "${meta.link}" already exists in the Database.`)}
    }

    // special checks for special docs
    // @TODO : for schema dos: settings fields must be in schema field
    if (schema == "schema") {
      //more checks are required
      this.util_validate_schema_object(data);
    }
    // @TODO : check if single record setting is set to true
    //console.log(schemaDoc)
    // duplicate check
    if (schemaDoc.settings["primary_keys"].length > 0) {
      let primary_obj = { schema: schema };
      schemaDoc.settings["primary_keys"].map((ky) => {primary_obj["data." + ky] = data[ky];});
      let prim_search = await this.search({ selector: primary_obj });
      if (prim_search.docs.length > 0) {
        throw new DocCreationError(`Document with the given primary key (${schemaDoc.settings["primary_keys"].join(",")}) already exists in the schema "${schema}"`);
      }
    }
    // encrypt if required
    let new_data = { ...data };
    if (schemaDoc.settings["encrypted_fields"].length > 0) {
      // todo test if encryption is successful 
      for (let itm of schemaDoc.settings["encrypted_fields"]) {
        new_data[itm] = await this.utils.encrypt(data[itm], this.encryption_key);
      }
    }

    // generate the doc object for data
    let doc_obj = this._get_blank_doc(schema);
    doc_obj["data"] = new_data;
    // if meta exists
    if(meta){
      doc_obj["meta"] = {...doc_obj["meta"],...meta};
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

  /**
   * Validates that the required fields are present in the provided object.
   *
   * @param {string[]} requiredFields - An array of field names that are required.
   * @param {object} obj - The object to check for the required fields.
   * @throws {ValidationError} If any of the required fields are missing, an error is thrown.
   */
  util_check_required_fields(requiredFields, obj) {
    for (const field of requiredFields) {
      if (!obj[field]) {throw new ValidationError(`The field ${field} is required.`)}
    }
  }

  /**
 * Filters an object, returning a new object that only contains the specified fields.
 *
 * @param {Object} obj - The object to filter.
 * @param {Array<String>} fields - An array of field names to retain in the filtered object.
 * 
 * @returns {Object} - A new object containing only the fields that exist in `obj` from the `fields` array.
 * 
 * **Example**:
 * 
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
   * Validates a data object against a provided JSON schema
   * It relies on the external API provided by the user
   * @param {Object} schema_obj - The JSON schema object to validate against
   * @param {Object} data_obj - The data object to validate
   * @throws {Error} If the data object does not conform to the schema
   */
  util_validate_data(schema_obj, data_obj) {
    const { valid, validate } = this.utils.validate_schema(schema_obj,data_obj)
    if (!valid) {
      throw new ValidationError(validate.errors);
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
    util_generate_random_link() {
      // prettier-ignore
      const dictionary = ['rain', 'mars', 'banana', 'earth', 'kiwi', 'mercury', 'fuji', 'hurricane', 'matterhorn', 'snow', 'saturn', 'jupiter', 'peach', 'wind', 'pluto', 'apple', 'k2', 'storm', 'venus', 'denali', 'cloud', 'sunshine', 'mango', 'drizzle', 'pineapple', 'aconcagua', 'gasherbrum', 'apricot', 'neptune', 'fog', 'orange', 'blueberry', 'kilimanjaro', 'uranus', 'grape', 'storm', 'montblanc', 'lemon', 'chooyu', 'raspberry', 'cherry', 'thunder', 'vinson', 'breeze', 'elbrus', 'everest', 'parbat', 'makalu', 'nanga', 'kangchenjunga', 'lightning', 'cyclone', 'comet', 'asteroid', 'pomegranate', 'nectarine', 'clementine', 'strawberry', 'tornado', 'avalanche', 'andes', 'rockies', 'himalayas', 'pyrenees', 'carpathians', 'cascade', 'etna', 'vesuvius', 'volcano', 'tundra', 'whirlwind', 'iceberg', 'eclipse', 'zephyr', 'tropic', 'monsoon', 'aurora'];
      return Array.from({ length: 3 },() => dictionary[Math.floor(Math.random() * dictionary.length)]).join("-");
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