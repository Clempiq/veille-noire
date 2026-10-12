export const XP_STEPS=[0,6,16,30,50,75];
export const TALENTS={
 marksman:{name:'Œil de veille',desc:'Seuil de touche réduit de 1 avec une arme à distance.',icon:'target'},
 reach:{name:'Longue-vue',desc:'+1 portée avec une arme à distance. Le brouillard reste limité à 2.',icon:'target'},
 brawler:{name:'Fureur des quais',desc:'+1 dé avec une arme de mêlée.',icon:'axe'},
 crusher:{name:'Brise-carapace',desc:'+1 dégât par succès avec une arme de mêlée.',icon:'axe'},
 guardian:{name:'Peau de sel',desc:'Ignore 1 blessure lors de la première attaque subie de chaque manche.',icon:'shield'},
 swift:{name:'Pas léger',desc:'Un déplacement de base gratuit par manche, en plus du talent d’Iris. La fuite reste payante.',icon:'move'},
 push:{name:'Onde de recul',desc:'Pouvoir : 1 PA pour repousser tous les ennemis de votre zone vers une zone voisine ouverte. Le Cantor résiste.',icon:'move'},
 silent:{name:'Étoupille',desc:'Vos armes produisent 2 bruits de moins.',icon:'mute'},
 scavenger:{name:'Main heureuse',desc:'Chance de relique en fouille portée de 3 % à 8 %.',icon:'search'},
 quickdraw:{name:'Main vive',desc:'Changer d’arme ne coûte plus d’action.',icon:'bag'},
 healer:{name:'Secours renforcés',desc:'+2 PV rendus par vos trousses, le soin de Malik et le sort d’Ysée.',icon:'medical'},
 reservoir:{name:'Réserve d’éther',desc:'+2 éther maximum. Récupère immédiatement 2 éther.',icon:'fire'},
 overflow:{name:'Résonance vive',desc:'+1 dégât au sort de Maëlys, +2 protection au sort d’Orso, +2 soin au sort d’Ysée ou +1 portée au pas de Silène.',icon:'fire'}
};
const frontline=['brawler','guardian','push','crusher','swift','quickdraw','healer','scavenger'];
const ranged=['marksman','reach','silent','swift','quickdraw','guardian','healer','scavenger'];
const magic=['reservoir','overflow','guardian','swift','healer','quickdraw','push','scavenger'];
export function talentPool(h){if(balanced(h))return [...new Set([...TREES[h.id].flat(),...(MUNDANE_MASTERY[h.id]||[])])];return ['maelys','orso','silene','ysee'].includes(h.id)?magic:['lina','basile','ada','jonas'].includes(h.id)?frontline:ranged;}
export const hasTalent=(h,id)=>h.evolution===1&&h.talents?.includes(id);
export const heroRank=h=>xpSteps(h).filter(x=>h.xp>=x).length-1;
export const talentSlots=h=>h.evolution===1?Math.max(0,(balanced(h)?CHOICE_XP.filter(x=>h.xp>=x).length:heroRank(h))-(h.talents?.length||0)):0;
export const maxEther=h=>3+(hasTalent(h,'reservoir')?2:0);
export const POWERS={
 maelys:{name:'Marée astrale',cost:2,ether:2,kind:'zone',desc:'2 PA · 2 éther. Inflige 2 dégâts à chaque ennemi d’une zone visible à portée 2. Sans tir ami.'},
 orso:{name:'Rempart d’ambre',cost:1,ether:1,kind:'hero',desc:'1 PA · 1 éther. Protège un allié dans votre zone contre les 2 prochaines blessures de cette manche.'},
 silene:{name:'Pas de brume',cost:1,ether:1,kind:'move',desc:'1 PA · 1 éther. Glisse jusqu’à 2 zones par un passage ouvert, sans surcoût de fuite. Ne traverse pas les murs.'},
 ysee:{name:'Source vivante',cost:1,ether:2,kind:'hero',desc:'1 PA · 2 éther. Rend 2 PV à un allié visible à portée 1, même à terre.'}
};

// V1.6 rules are opt-in per expedition, so existing saves remain deterministic.
export const balanced=h=>h.balance===1;
export const BALANCED_XP=[0,7,19,43,70,100];
export const CHOICE_XP=[19,43,70,100];
export const xpSteps=h=>balanced(h)?BALANCED_XP:XP_STEPS;
export const TREES={
 lina:[['brawler','quickdraw'],['crusher','push','guardian']],
 malik:[['healer','marksman'],['guardian','reach','swift']],
 iris:[['reach','silent'],['marksman','guardian','quickdraw']],
 basile:[['brawler','push'],['crusher','barbarian','swift']],
 noor:[['marksman','reach'],['quickdraw','guardian','swift']],
 ada:[['scavenger','quickdraw'],['brawler','healer','push']],
 jonas:[['brawler','guardian'],['crusher','barbarian','push']],
 tess:[['marksman','silent'],['swift','guardian','quickdraw']],
 maelys:[['awakening','marksman'],['overflow','reservoir','guardian']],
 orso:[['awakening','brawler'],['overflow','guardian','push']],
 silene:[['awakening','brawler'],['overflow','barbarian','crusher']],
 ysee:[['awakening','healer'],['overflow','reservoir','guardian']],
 sacha:[['reach','silent'],['marksman','guardian','swift']],
 mira:[['brawler','guardian'],['crusher','push','swift']],
 nael:[['scavenger','reach'],['marksman','healer','quickdraw']]
};
Object.assign(TALENTS,{
 awakening:{name:'Éveil',desc:'Débloque le pouvoir de votre classe. Une utilisation par manche, avec coût en actions et en éther.',icon:'fire'},
 barbarian:{name:'Déchaînement',desc:'En mêlée, remplace les dés de base par le nombre d’ennemis dans votre zone si ce nombre est supérieur (maximum 6).',icon:'axe'}
});
export const MUNDANE_MASTERY={maelys:['reach','guardian','quickdraw'],orso:['crusher','guardian','push'],silene:['swift','barbarian','crusher'],ysee:['marksman','guardian','quickdraw']};
export function talentBranch(h,index){return index%2&&MUNDANE_MASTERY[h.id]&&!hasTalent(h,'awakening')?MUNDANE_MASTERY[h.id]:TREES[h.id][index%2];}
export function availableTalents(h){if(!balanced(h))return talentPool(h).filter(id=>!hasTalent(h,id));if(!talentSlots(h))return [];const i=(h.talents||[]).length;return talentBranch(h,i).filter(id=>!hasTalent(h,id));}
export function validTalentSequence(h){if(!balanced(h))return true;return (h.talents||[]).every((id,i)=>CHOICE_XP[i]<=h.xp&&talentBranch({...h,talents:h.talents.slice(0,i)},i).includes(id));}
export const WEAPON_XP={maul:7,repeater:7,shotgun:7,rifle:7,harpoon:19,eclipse:43,tempest:43,heart:43};
export const weaponRequiredXP=(h,id)=>balanced(h)?WEAPON_XP[id]||0:0;
export const weaponLock=(h,id)=>h.xp<weaponRequiredXP(h,id)?'Niveau '+(BALANCED_XP.indexOf(WEAPON_XP[id])+1)+' requis · '+WEAPON_XP[id]+' XP (vous : '+h.xp+' XP).':'';
export const powerLock=h=>!balanced(h)?'':!hasTalent(h,'awakening')?'Choisissez Éveil dans Talents à partir de 19 XP.':h.powerUsed?'Pouvoir déjà utilisé cette manche.':'';
export function powerInfo(h){const p=POWERS[h.id];if(!p||!balanced(h))return p;return {...p,ether:2,desc:{
 maelys:'2 PA · 2 éther · une fois par manche. 3 dés à 4+, 2 dégâts par succès répartis dans une zone visible à portée 2. Résonance vive : +1 dé.',
 orso:'1 PA · 2 éther · une fois par manche. Protège un allié de votre zone contre 1 blessure, jusqu’à la fin de la phase ennemie. Résonance vive : 2 blessures.',
 silene:'1 PA · 2 éther · une fois par manche. Traverse jusqu’à 2 zones ouvertes sans surcoût de fuite. Résonance vive : 3 zones. Ne traverse pas les murs.',
 ysee:'1 PA · 2 éther · une fois par manche. Soigne 1 PV à un allié debout visible à portée 1. Résonance vive : +1 PV et peut relever un allié. Secours renforcés : +1 PV.'}[h.id]};}
export function talentDescription(h,id){if(!balanced(h))return TALENTS[id].desc;return ({overflow:'Améliore votre pouvoir après Éveil : Maëlys +1 dé, Orso +1 protection, Silène +1 zone, Ysée +1 soin et réanimation.',healer:'+1 PV rendu par les trousses, le soin de Malik et le pouvoir d’Ysée.',scavenger:'Chance de relique en fouille portée de 1 % à 3 %. Le niveau requis reste obligatoire.',push:'Une fois par manche, dépensez 1 PA pour repousser les ennemis de votre zone vers une zone voisine ouverte. Le Cantor résiste.'})[id]||TALENTS[id].desc;}
export const BASE_SKILLS={maelys:'Accord marin : +1 portée avec les armes magiques. Marée astrale à débloquer avec Éveil (19 XP).',orso:'Armure feutrée : bruit de ses armes réduit de 1. Rempart d’ambre à débloquer avec Éveil (19 XP).',silene:'Pas agile : premier déplacement gratuit de chaque manche ; la fuite reste payante. Pas de brume à débloquer avec Éveil (19 XP).',ysee:'Herboriste : ses trousses rendent 1 PV supplémentaire. Source vivante à débloquer avec Éveil (19 XP).'};
export const heroSkill=(h,d)=>balanced(h)?BASE_SKILLS[h.id]||d.skill:d.skill;

