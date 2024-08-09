require('dotenv').config()
const cbbdb = require("../couchdb.js")
async function main(){
  let db = new cbbdb(process.env.cdburl,process.env.cdbname,"sample_key")
  await db.ready()
  try {
    // db.initialize_db()
    await db.update_indexes()
  } catch (error) {
    console.log(error)
  }
}
main().then(()=>{console.log("Bye.")}).catch()