# Getting started



### Nodes and edges

The records stored in  BeanBagDB can be organized into a simple directed graph. In in simple directed graph, edges have a direction and there can only be one edge between 2 nodes. Edges can have label based on the context of your data. You can also define rules for these edges based on the schema of the nodes.

Example : Consider you have 3 types of nodes : "player", "team", "match"  to simulate a game where a teams has multiple players and a player plays a match as part of a team. 
Here are the rules: 
-  A player is part of a team (and not vice versa)
-  A team plays a match (and not vice versa)
-  A player cannot be in 2 teams
-  A match can only be between 2 teams (not more than 2)
-  Player does not play a match (but a team does, assuming this is a team sport)
-  A team cannot be part of a team  
-  A team cannot have more than 11 players

In terms of nodes and edges, the rules translate to:

| rule                                                  | node 1 | edge label  | node 2 | constraint                      |
|-------------------------------------------------------|--------|-------------|--------|---------------------------------|
| 1 A player is part of a team (and not vice versa)       | player | is part of  | team   | player-->team                   |
| 2 A team plays a match (and not vice versa)             | team   | plays       | match  |                                 |
| 3 A player cannot be in 2 teams                         | player | is part of  | team   | only one such relation          |
| 4 A match can only be between 2 teams (not more than 2) | team   | plays       | match  | only 2 such relation per match  |
| 5 Player does not play a match                          | player | plays       | match  | not valid                       |
| 6 A team cannot be part of a team                       | team   | is part of  | team   | not valid                       |
| 7 A team cannot have more than 11 players               | player | is part of  | team   | only 11 such relations per team |


These rules can be enforced in the database as "edge_constraints" and are automatically checked when new edges are added to the graph.

```
  - Constraint 1 : 
    - node 1 : player
    - edge type : part_of
    - edge label : is part of a 
    - node 2 : team
    - max_from_node1 : 1
    - max_to_node2 : 11
  - Constraint 2 :
    - node 1 : team 
    - edge type : plays
    - edge label : plays 
    - node 2 : match
    - max_from_node1 : None
    - max_to_node2 : 2
```
- `max_from_node1` defines the maximum number of edges of a certain type that can exist from node 1 to node 2. For example, player1 is part of team1; now, player1 cannot be part of any other team.
- `max_to_node2` defines the maximum number of edges of a certain type that can be directed towards a particular node. For example, team1 and team2 can only play match1.
- Violations of these results in an error and the edge is not created
- for both node1 and node2, the general approach is to whitelist a set of schemas for the specified type of edge. It is still valid to add other types of edges from these nodes to others. 
- The schema names in node1 and node2 fixes the schema types for this particular edge type. This means creating a relations "player1--(part_of)-->team1" or "team1--(part_of)-->player1" will result in the same relation "player1--(part_of)-->team1". 
- You can also specify  nodes with different schema types as : "player,coach". 
- If you want to allow nodes of all schema types, use "*." 
  - Eg :
    - Constraint:
    - node 1: *
    - edge label: interacts with
    - node 2: * 
- If you want to include all except for a few types of nodes, use : "* - schema1, schema2" 
  - Eg :  "*-tag tagged_as tag" means that nodes of all types (except for tag nodes themselves) can be tagged with a tag.

