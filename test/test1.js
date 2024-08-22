require("dotenv").config();
const cbbdb = require("../src/couchdb.js");
const pbbdb = require("../src/pouchdb.js");
const pl1  = require("./helper.js")
async function main1() {
  let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  
  try {
    await db.ready();
    await db.initialize_db();
    await db.update_indexes()
  } catch (error) {
    console.log(error);
  }
}

async function main2() {
  let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  await db.ready();
  // await db.update_indexes()
  sample_setting_docs = [
    {
      name: "sample1",
      value: "sample thing here",
    },
    {
      name: "no_value",
    },
    {
      value: "incorrect name",
    },
    {
      name: "sample1",
      value: "sample thing here",
    },
    {
      name: "sample1",
      value: "primary key check",
    },
    {
      name: "Sample2",
      value: "normal insert",
    },
    {
      value: "No name provided",
    },
  ];
  let t = sample_setting_docs.length
  for (let i = 0; i < t; i++) {
    try {
      let newid =  await db.insert("system_settings",sample_setting_docs[i])
      console.log(newid)
    } catch (error) {
      console.log("Error "+i)
      console.error(error)
      continue
    }
  }
}

async function main3() {
  let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  await db.ready();
  // await db.update_indexes()
  sample_setting_docs = [
    {
      name: "sample1",
      value: "sample thing here",
    },
    {
      name: "sample2",
      value: "sample thing here again",
    },
   
    {
      name: "sample1",
      value: "sample thing here again",
    },
  ];
  let t = sample_setting_docs.length
  for (let i = 0; i < t; i++) {
    try {
      let newid =  await db.insert("system_keys",sample_setting_docs[i])
      console.log(newid)
    } catch (error) {
      console.log("Error "+i)
      console.error(error)
      continue
    }
  }
}


async function main4(){
  let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  await db.ready();
  let doc1 = await db.get("e94b5eebe6b3c6dab8e2508d5908717c")
  console.log(doc1)
  let doc2 = await db.get_doc("system_keys",{"name":"sample2"})
  console.log(doc2)
  let doc3 = await db.get_doc("system_logs")
  console.log(doc3)
}

async function main5(){
  let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  await db.ready();
  let id = "e94b5eebe6b3c6dab8e2508d5908717c"
  let rec_1 = await db.get(id)
  let rec1 = rec_1.doc
  console.log(rec1)
  let rec1u = await db.update(id,"",{data:{"value":"secret key updated"},meta:{tags:["testing1","testing2","money"]}})
  console.log(rec1u)
  let r1 = await db.get(id)
  console.log(r1)
}

async function main6(){
  let db = new pbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  await db.ready()
  //await db.initialize_db()

}

// main1().then(() => {console.log("Bye.");}).catch();

// main3().then(() => {console.log("Bye.");}).catch();

// main4().then(() => {console.log("Bye.");}).catch();

// main5().then(() => {console.log("Bye.");}).catch();

// main6().then(() => {console.log("Bye.");}).catch();


(async ()=>{
  let db = new cbbdb(process.env.cdburl, process.env.cdbname, "sample_key");
  await db.ready();
  db.load_plugin("sample",pl1)
})();