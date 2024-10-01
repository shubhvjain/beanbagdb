## The Database architecture
A BeanbagDB is a collection of JSON documents. In a NoSQL database, documents don't need to follow a specific schema. Typically, the developer defines a schema based on the specific problem the app is intended to solve. 

While, BeanBagDB allows users to create their own schemas for documents, all document internally share a consistent structure that accommodates the user defined schema. 

Each document in the database follows this structure :
```
{
  _id, _rev
  data : {
    user data
  },
  schema: "name_of_the_schema",
  meta : {},
}
```

Here, the `data` object contains user's information, while the `schema` defines it's associated structure. The `meta` field holds metadata such as creation and last updated on date and user defined tags. 

Even schema documents follow this structure. 

### Examples : 

A system defined schema :
```
{ 
  schema:"schema"
  data : {
    name: "system_tags",
    .....
  },
  ...
}
```
(In this example, the schema of this doc is `schema` because it stores the schema document, which will be use to validate documents that follows this schema)

The document adhering to this schema might look like : 
```
{
  schema:"system_tags",
  data:{
    tags:["tag1","tag2"]
  }
  ....
}
```
User Defined schemas :
```
{
  "schema":"schema",
  "data":{
    "name":"contacts",
    ...
  }
}
```
And a sample document based on this user defined schema might look like :
```
{
  schema:"contacts",
  "data":{
    "name":"Human 1",
    "email":"human@on.earth"
  }
}
```

### System defined schemas 
To ensure the system functions smoothly, each DB is initialized with a set of system defined schemas and seed documents. These are automatically added when the database is first created. These system defined are typically named with the prefix `system_`.

List of system schemas :
- `logs` : to log system and user actions 
- `settings` : System level settings  (`name`,`value`,`json` for more details)
- `keys` :  user level settings , these are encrypted and stored in the DB 
- `secrets` : encrypted text (TODO)
- `relations` : To create a network of relations  (TODO)
- `index` :  (TODO)
- `scripts` :  (TODO)

## The BeanBagDB class

The `BeanBagDB` class  contains the the logical part of how to interact with a local database. However, it does not itself makes any changes in the database. To make it (somewhat) compatible with multiple databases (e.g. CouchDB on the server, PouchDB in the browser), the class takes an db_instance object where the actual CRUD actions on the database can be performed. 

To add support for a database, we extend the `BeanBagDB` class. 


## JSON Schema (in progress)
[Source](https://json-schema.org/) and [another](https://www.learnjsonschema.com/2020-12/)

### Basic schema structure 
```
{
  "name":"",
  "description":"",
  "properties":{

  },
  "settings":{

  }
}
```
#### Properties:
- Settings :
  - `additionalProperties:true`
  - `required:[]`
  - 
- Defining custom fields :
  - `type:""` Valid values: ``


#### Settings :
- `primary_key:[]` 
- `editable_fields:[]`
- `single_record : true` 
