// Original encounter deck. Each row is [drowned, runners, bells] at one danger tier.
export const SPAWN_CARDS = [
 {id:'drift',name:'La dérive',rows:[[1,0,0],[2,0,0],[3,1,0],[4,1,1]]},
 {id:'procession',name:'Procession noyée',rows:[[2,0,0],[3,0,0],[4,0,0],[5,1,0]]},
 {id:'scratches',name:'Griffures sur le quai',rows:[[0,1,0],[1,1,0],[1,2,0],[2,3,0]]},
 {id:'undertow',name:'Le ressac',rows:[[2,0,0],[2,1,0],[3,1,0],[4,2,0]]},
 {id:'hollow',name:'Un silence creux',rows:[[0,0,0],[1,0,0],[1,0,1],[2,0,2]]},
 {id:'footsteps',name:'Des pas dans l’eau',rows:[[1,0,0],[1,1,0],[2,2,0],[3,2,1]]},
 {id:'shells',name:'Carapaces',rows:[[1,0,0],[0,0,1],[1,0,1],[2,0,2]]},
 {id:'tide',name:'Marée de silhouettes',rows:[[2,0,0],[3,0,0],[4,0,1],[5,0,1]]},
 {id:'hunt',name:'La traque',rows:[[0,1,0],[0,2,0],[1,2,0],[2,3,0]]},
 {id:'wake',name:'Un sillage noir',rows:[[1,0,0],[2,0,0],[2,1,1],[3,1,2]]},
 {id:'echoes',name:'Échos dans les murs',rows:[[1,0,0],[2,0,0],[3,1,0],[4,2,0]],rush:true},
 {id:'rattle',name:'Les chaînes résonnent',rows:[[2,0,0],[1,0,1],[2,0,1],[3,1,2]]},
];

export function drawSpawn(s,tier,random,{building=false}={}){
 if(!s.spawnDeck?.length){
  s.spawnDeck=SPAWN_CARDS.map(c=>c.id);
  for(let i=s.spawnDeck.length-1;i>0;i--){const j=random(s,i+1);[s.spawnDeck[i],s.spawnDeck[j]]=[s.spawnDeck[j],s.spawnDeck[i]];}
 }
 const id=s.spawnDeck.shift(),card=SPAWN_CARDS.find(c=>c.id===id),row=[...card.rows[tier]];
 // Smaller parties and Exploration reduce the largest group, without erasing rare types.
 const reduction=(s.heroes.length<=2?1:0)+(s.difficulty==='story'?1:0);
 for(let i=0;i<reduction;i++){const largest=row.indexOf(Math.max(...row));if(row[largest]>0)row[largest]--;}
 if(s.difficulty==='nightmare')row[0]++;
 // Building rooms are dangerous but their discovery should not overwhelm tiny parties.
 if(building&&s.heroes.length===3&&row.reduce((a,b)=>a+b,0)>2)row[row.indexOf(Math.max(...row))]--;
 return {id:card.id,name:card.name,row,rush:!!card.rush&&tier>=2&&!building&&s.difficulty!=='story'};
}
