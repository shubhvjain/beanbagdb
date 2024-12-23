// to test database operations. assuming the class is initialized successfully
// to test initialization of the BeanBagDB class
import { get_pdb_doc } from "./pouchdb.js";
import assert, { throws, strictEqual, rejects } from "assert";
import {
  BeanBagDB,
  DocCreationError,
  EncryptionError,
  ValidationError,
  DocNotFoundError,
  DocUpdateError,
} from "../src/index.js";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

// Then either:
const expect = chai.expect;

let database; // this is the global db object

describe("Edge constraint insertion tests", async () => {
  const constraint_docs_invalid = [
    [
      "error when node1 empty",
      {
        node1: "",
        node2: "*",
        name: "sample",
        label: "Sample",
      },
    ],
    [
      "error when node2 empty ",
      {
        node1: "*",
        node2: "",
        name: "sample",
        label: "Sample",
      },
    ],
    [
      "error when edge name empty",
      {
        node1: "*",
        node2: "*",
        name: "",
        label: "Sample",
      },
    ],
    [
      "error when node 1 invalid 1",
      {
        node1: "*3434",
        node2: "*",
        name: "sample",
        label: "Sample",
      },
    ],
    [
      "error when node 1 invalid 2",
      {
        node1: "1212121 ssd sdsd",
        node2: "*",
        name: "sample",
        label: "Sample",
      },
    ],
    [
      "error when node 1 invalid 3",
      {
        node1: "sample1-sample2",
        node2: "*",
        name: "sample",
        label: "Sample",
      },
    ],
    [
      "error when node 1 invalid 4",
      {
        node1: "*+sample1-sample2",
        node2: "*",
        name: "sample",
        label: "Sample",
      },
    ],
    [
      "error when edge name is invalid",
      {
        node1: "*",
        node2: "*",
        name: "Sample one",
        label: "Sample",
      },
    ],
  ];

  before(async () => {
    // adding a schema
    let doc_obj = get_pdb_doc("test_database_41", "qwe33rtyuiopaqwsde1254");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    try {
      //console.log(test_schema)
      //let a = await database.create("schema",test_schema)
      //console.log("Ready for more tests...");
    } catch (error) {
      console.log("error in before");
      console.log(error);
    }
  });

  constraint_docs_invalid.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      await rejects(async () => {
        await database.create("setting_edge_constraint", element[1]);
      }, DocCreationError);
    });
  });
});

describe("Edge insertion test", async () => {
  // it('read docs', async () => {
  //   try {
  //     let udata = await database3.search({selector:{"schema":"book"}})
  //     assert(udata.docs.length==2)
  //   } catch (error) {
  //     //console.log(error)
  //     throw error
  //   }
  // })

  const edge_docs_invalid = [
    [
      "error when  invalid node 1",
      {
        node1: "sample",
        node2: "*",
        name: "does not matter",
        
      },
    ],
    [
      "error when node 2 invalid ",
      {
        node1: { link: "does_not_exists" },
        node2: "invalid,must be a criteria obj",
        name: "sample",
      },
    ],

    [
      "error when edge name invalid",
      {
        node1: { link: "sample1" },
        node2: { link: "sample2" },
        name: "sample",
        
      },
    ],
    [
      "error when both nodes are same",
      {
        node1: {},
        node2: "*",
        name: "Sample one"
      },
    ],
  ];

  before(async () => {
    // adding a schema
    let doc_obj = get_pdb_doc("test_database_41", "qwe33rtyuiopaqwsde1254");
    database = new BeanBagDB(doc_obj);
    await database.ready(); // Ensure the database is ready before running tests
    try {
      let schemas = [
        {
          name: "player",
          description:"Player",
          title:"Player",
          schema: {
            additionalProperties:true,
            type:"object",
            properties: {
              name: {
                type: "string",
              },
            },
          },
          settings: {
            primary_keys: ["name"],
            encrypted_fields: [],
            non_editable_fields: ["name"],
          },
        },
        {
          name: "team",
          description:"Team",
          title:"Team",
          schema: {
            additionalProperties:true,
            type:"object",
            properties: {
              name: {
                type: "string",
              },
            },
          },
          settings: {
            primary_keys: ["name"],
            encrypted_fields: [],
            non_editable_fields: ["name"],
          },
        },
        {
          name: "match",
          description:"Match",
          title:"Match",
          schema: {
            type:"object",
            additionalProperties:true,
            properties: {
              name: {
                type: "string",
              },
            },
          },
          settings: {
            primary_keys: ["name"],
            encrypted_fields: [],
            non_editable_fields: ["name"],
          },
        },
      ];
      for (let index = 0; index < schemas.length; index++) {
        try {
          const element = schemas[index];
          await database.create("schema", element);  
        } catch (error) {
          console.log("not heeee")
          console.log(error)
        }
        
      }
      const records = [
        ["player", { name: "player1" }],
        ["player", { name: "player2" }],
        ["player", { name: "player3" }],
        ["player", { name: "player4" }],
        ["player", { name: "player5" }],
        ["player", { name: "player6" }],
        ["player", { name: "player7" }],
        ["player", { name: "player8" }],
        ["player", { name: "player9" }],
        ["player", { name: "player10" }],
        ["player", { name: "player11" }],
        ["player", { name: "player12" }],
        ["player", { name: "player13" }],
        ["player", { name: "player14" }],
        ["player", { name: "player15" }],
        ["team", { name: "team1" }],
        ["team", { name: "team2" }],
        ["match", { name: "match1" }],
        ["match", { name: "match2" }],
        ["system_edge_constraint",{ name:"part_of",node1:"player",node2:"team", max_from_node1:1, max_to_node2:5 , label:"is part of "}],
        ["system_edge_constraint",{name: "plays",node1:"team",node2:"match",max_from_node1 : 1, max_to_node2: 2 , label:"plays in" }]
      ];
      for (let index = 0; index < records.length; index++) {
        const element = records[index];
        let data1 = element[1];
        await database.create(element[0], data1, { link: data1.name });
      }
    } catch (error) {
      console.log("error in before....");
      console.log(error);
    }
  });

  edge_docs_invalid.forEach((element, index) => {
    it(`${element[0]}`, async () => {
      await rejects(async () => {
        await database.create("setting_edge", element[1]);
      }, DocCreationError);
    });
  });


  let valid_edges = [
    {node1:{link:"player1"},node2:{link:"team1"},edge_name:"part_of"},
    {node1:{link:"player2"},node2:{link:"team1"},edge_name:"part_of"},
    {node1:{link:"player3"},node2:{link:"team1"},edge_name:"part_of"},
    {node1:{link:"player4"},node2:{link:"team1"},edge_name:"part_of"},
    {node1:{link:"player5"},node2:{link:"team1"},edge_name:"part_of"},
    {node1:{link:"player6"},node2:{link:"team2"},edge_name:"part_of"},
    {node1:{link:"player7"},node2:{link:"team2"},edge_name:"part_of"}
  ]

  valid_edges.forEach((element, index) => {
    it(`adds an edge`, async () => {
      try {
        let edge = await database.create_edge(element.node1,element.node2,element.name)  
        console.log(edge)
      } catch (error) {
        console.log(error)
      }
      
    });
  });




});
