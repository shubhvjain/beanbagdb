Ajv = require("ajv");
class InfoDB {
  constructor(db_instance) {
    if (!db_instance["name"]) {
      throw new Error("Database name is required. None was provided");
    }
    this.init_class();
    this.db = db_instance.api 
  }
  init_class() {
    // run from the constructor to initialize the class with required internal variables
    this.valid_system_settings = {
      db_system_log: {
        schema: {
          type: "object",
          properties: {
            logs: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
              },
              minItems: 0,
            },
          },
        },
        settings: {
          default_data: { logs: [] },
          editable_fields: ["logs"],
        },
      },
      tags: {
        schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              maxItems: 100,
              minItems: 0,
              uniqueItems: true,
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",

                    maxLength: 500,
                    pattern: "^[a-zA-Z][a-zA-Z0-9-_.]*$",
                  },
                  note: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        settings: {
          default_data: {
            tags: [],
          },
          editable_fields: ["tags"],
        },
      },
      web_settings: {
        schema: {
          type: "object",
          properties: {
            theme: {
              type: "string",
              enum: ["light", "dark"],
              default: "dark",
            },
          },
        },
        settings: {
          editable_fields: ["theme"],
          default_data: {
            theme: "dark",
          },
        },
      },
    };
    this.valid_schema_doc_schema = {
      name: "schema_doc",
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          name: {
            type: "string",
            minLength: 5,
            maxLength: 50,
            pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
          },
          properties: {
            type: "object",
            additionalProperties: true,
            minProperties: 1,
            maxProperties: 20,
          },
          settings: {
            type: "object",
            additionalProperties: true,
            properties: {
              primary_key: {
                type: "array",
                default: [],
                items: {
                  type: "string",
                },
                maxItems: 10,
              },
              editable_fields: {
                type: "array",
                default: [],
                items: {
                  type: "string",
                },
                maxItems: 20,
              },
              single_record: {
                type: "boolean",
                default: false,
                description:
                  "If set, only a single records with this schema will be allowed to insert in the database",
              },
            },
          },
        },
        required: ["name", "schema", "settings"],
      },
      settings: {
        primary_key: ["name"],
        editable_fields: ["schema", "settings"],
      },
    };
    this.sample_schema = {
      name: "my_contact",
      schema: {
        title: "People",
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          emails: {
            type: "array",
            items: {
              type: "string",
              format: "email",
            },
          },
          phones: {
            type: "array",
            items: {
              type: "string",
            },
          },
          address: {
            type: "string",
          },
          notes: {
            type: "string",
          },
          birth_date: {
            type: "string",
            format: "date",
          },
          company: {
            type: "string",
          },
          website: {
            type: "string",
            format: "uri",
          },
          socialMedia: {
            type: "object",
            properties: {
              twitter: { type: "string" },
              facebook: { type: "string" },
              linkedin: { type: "string" },
            },
          },
          gender: {
            type: "string",
            enum: ["male", "female", "other"],
          },
          maritalStatus: {
            type: "string",
            enum: ["single", "married", "divorced", "widowed", "other"],
          },
          hobbies: {
            type: "array",
            items: {
              type: "string",
            },
          },
          languages: {
            type: "array",
            items: {
              type: "string",
            },
          },
          education: {
            type: "array",
            items: {
              type: "object",
              properties: {
                degree: { type: "string" },
                institution: { type: "string" },
                year: { type: "integer" },
              },
              required: ["degree", "institution", "year"],
            },
          },
          skills: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["name"],
      },
      settings: {
        primary_key: ["name"],
      },
    };
  }

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

module.exports.InfoDB = InfoDB;
