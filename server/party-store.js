const TTL=86400;
export class MemoryStore{
 constructor(){this.rooms=new Map();this.people=new Map();this.limits=new Map();}
 async get(code){const r=this.rooms.get(code);if(!r||r.expiresAt<Date.now()){this.rooms.delete(code);return null;}return structuredClone(r);}
 async create(room){const old=this.rooms.get(room.code);if(old&&old.expiresAt>=Date.now())return false;this.rooms.set(room.code,structuredClone(room));return true;}
 async cas(code,revision,room){const old=this.rooms.get(code);if(!old||old.revision!==revision)return false;this.rooms.set(code,structuredClone(room));return true;}
 async presence(code,id){const p=this.people.get(code)||{};p[id]=Date.now();this.people.set(code,p);return {...p};}
 async limit(key,max,seconds){const now=Date.now();let l=this.limits.get(key);if(!l||l.until<now)l={count:0,until:now+seconds*1000};l.count++;this.limits.set(key,l);return l.count<=max;}
}
export class RedisStore{
 constructor(url,token){this.url=url;this.token=token;}
 async run(...command){
  const response=await fetch(this.url,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Stockage du salon indisponible.');
  const data=await response.json();if(data.error)throw Error('Stockage du salon indisponible.');return data.result;
 }
 key(code){return 'vn:party:v1:'+code;}
 async get(code){const raw=await this.run('GET',this.key(code));return raw?JSON.parse(raw):null;}
 async create(room){return (await this.run('SET',this.key(room.code),JSON.stringify(room),'EX',TTL,'NX'))==='OK';}
 async cas(code,revision,room){
  return (await this.run('EVAL',"local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local r=cjson.decode(raw); if r.revision~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1",1,this.key(code),revision,JSON.stringify(room),TTL))===1;
 }
 async presence(code,id){
  const values=await this.run('EVAL',"redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]); redis.call('EXPIRE',KEYS[1],ARGV[3]); return redis.call('HGETALL',KEYS[1])",1,this.key(code)+':presence',id,Date.now(),TTL);
  const people={};for(let i=0;i<values.length;i+=2)people[values[i]]=Number(values[i+1]);return people;
 }
 async limit(key,max,seconds){return (await this.run('EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",1,'vn:limit:'+key,seconds))<=max;}
}
