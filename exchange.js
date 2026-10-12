import {weaponLock} from './progression.js';
import {WEAPONS} from './content.js';

export function exchangeReason(s,{target,give='',receive=''}){
 const a=s.heroes.find(h=>h.id===s.active),b=s.heroes.find(h=>h.id===target);
 if(s.status!=='playing')return 'Cette expédition est terminée.';
 if(!a||a.hp<=0)return 'Choisissez un survivant debout.';
 if(!b||b===a||b.hp<=0||b.zone!==a.zone)return 'Les deux survivants doivent être debout dans la même zone.';
 if(s.enemies.some(e=>e.zone===a.zone))return 'Éliminez les ennemis de cette zone avant d’échanger.';
 if(a.ap<1)return 'Le survivant actif doit disposer de 1 action.';
 if(!give&&!receive)return 'Choisissez au moins un objet à transmettre ou à recevoir.';
 if(give&&receive&&give===receive)return 'Choisissez deux objets différents.';
 if(give&&!a.inventory.includes(give)||receive&&!b.inventory.includes(receive))return 'Cet objet n’est plus dans le sac.';
 if(give===a.weapon&&!WEAPONS[receive])return 'Pour donner votre arme équipée, recevez une autre arme en échange, ou équipez d’abord une arme de réserve.';
 if(receive===b.weapon&&!WEAPONS[give])return 'Cet allié doit recevoir une arme pour remplacer celle qu’il tient.';
 if(give===a.weapon&&weaponLock(a,receive))return weaponLock(a,receive);
 if(receive===b.weapon&&weaponLock(b,give))return weaponLock(b,give);
 const bagA=[...a.inventory],bagB=[...b.inventory];
 if(give)bagA.splice(bagA.indexOf(give),1);
 if(receive)bagB.splice(bagB.indexOf(receive),1);
 if(receive&&WEAPONS[receive]&&bagA.includes(receive)||give&&WEAPONS[give]&&bagB.includes(give))return 'Un survivant possède déjà cette arme.';
 if(bagA.length+Number(!!receive)>8||bagB.length+Number(!!give)>8)return 'Un sac est plein. Choisissez aussi un objet en retour.';
 return '';
}

export function transferExchange(s,action){
 const a=s.heroes.find(h=>h.id===s.active),b=s.heroes.find(h=>h.id===action.target),{give='',receive=''}=action;
 const ammoA=a.ammo[give],ammoB=b.ammo[receive];
 if(give)a.inventory.splice(a.inventory.indexOf(give),1);
 if(receive)b.inventory.splice(b.inventory.indexOf(receive),1);
 if(give)b.inventory.push(give);
 if(receive)a.inventory.push(receive);
 if(WEAPONS[give]?.ammo){b.ammo[give]=ammoA??0;if(!a.inventory.includes(give))delete a.ammo[give];}
 if(WEAPONS[receive]?.ammo){a.ammo[receive]=ammoB??0;if(!b.inventory.includes(receive))delete b.ammo[receive];}
 if(give===a.weapon)a.weapon=receive;
 if(receive===b.weapon)b.weapon=give;
}
