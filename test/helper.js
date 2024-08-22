// helper file for testing 

async function on_load(db){
  console.log(db.name)
  console.log("loading...done")
}

let print = async (db,msg)=>{
  console.log(msg)
}

module.exports = {on_load,print}