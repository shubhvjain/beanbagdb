require('dotenv').config()
const indodb = require("infodb-core")
const db = new indodb(process.env.cdburl,process.env.cdbname)

// db.get("7adeecc539479716cf35540d75000a8d").then(data=>{
//   console.log(data)
// })
