# BeanbagDB 

<div style="text-align:center">

<img src="./docs/logo.png" alt="Alt text" style="width:auto; height:100px">

v 0.0.0
</div>

```
## Intro
## Installation  
### Option 1 : To use it with CouchDB 
### Option 2 : To use it with PouchDB
### Option 3 : Web app
## Getting started 
```
## The Database architecture
A database is a collection of JSON documents. In  a No-SQL database, documents need not have a specific schema. Usually a schema is defined by the developer based on the specific problem the app is trying to solve. In our case is this is also true to a certain extent. While, BeanBagDB allows user to create their own schema for docs, internally all the documents generated have the same structure which accommodates the user defined schema.

All documents have a following structure :

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
Here we  see that the user's data is stored in the `data` objects and it's `schema` is defined. The document also has metadata such as the date on which the was created , last updated and user defined tags.

This schema documents are no exception, they also have a the document structure. 

For a smooth functioning of the system, each database has some system defined "default" schema and seed documents that are added to the data base when it is initialized for the very first time. 


## The BeanBagDB class

The `BeanBagDB` class  contains the the logical part of how to interact with a local database. However, it does not itself makes any changes in the database. To make it (somewhat) compatible with multiple databases (e.g. CouchDB on the server, PouchDB in the browser), the class takes an db_instance object where the actual CRUD actions on the database can be performed. 

To add support for a database, we extend the `BeanBagDB` class. 

### API
- `initialize_db()`
- `log(stuff={whatever})`
- `get_setting_doc(setting_name)`
- `get_schema_doc()`
- `validate_data()`
- `insert_pre_check()`
- `insert()`
- `get()`
- `load_doc()`
- `update_data()`
- ...