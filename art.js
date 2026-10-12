const weaponPaths={
 wrench:'<path d="M43 20a23 23 0 0 0 23 30l49 49 14-14-49-49a23 23 0 0 0-29-23l15 15-12 12-15-15Z"/><path class="art-detail" d="m65 45 52 51m-7-12 7 7"/>',
 axe:'<path class="art-wood" d="m53 108 10 5 49-82-10-6Z"/><path d="m83 20 35 20 23-8-8-26-27 1Z"/><path class="art-detail" d="m121 11 10 18-16 4M58 102l9 5"/>',
 pistol:'<path d="M25 35h108v20H83l-6 18H62l-9 34H31l14-55H25Z"/><path class="art-detail" d="M31 41h95M87 48h32M67 56l-3 13h9M36 88l18 4M39 78l17 4"/>',
 bow:'<path fill="none" stroke-width="8" d="M105 12Q32 57 103 111"/><path class="art-detail" d="m105 12-11 50 9 49M40 61h96m-9-6 10 6-10 6M76 48l-4 24"/>',
 shotgun:'<path class="art-wood" d="m14 82 35-30 20 6-17 24-23 14Z"/><path d="m47 48 92-24 5 10-77 28-8 20-10-3 3-18-9 4Z"/><path class="art-detail" d="m69 48 64-19M79 51l58-16M52 65l9 3"/>',
 rifle:'<path class="art-wood" d="m13 92 38-37 22-4 7 10-15 11-35 31Z"/><path d="m47 51 96-29 3 6-63 25-10 20-10-2 4-11-14 7Zm29-13 29-9 3 9-29 9Z"/><path class="art-detail" d="m86 33 2 10m-25 30 6 5 8-13M27 84l11 8"/>',
 harpoon:'<path class="art-wood" d="m22 84 33-30 16 11-33 33Z"/><path d="m50 47 58-16 6 15-49 24Zm8-10 75-22-9-6 26-2-10 23-1-11-80 26Z"/><rect x="80" y="55" width="38" height="15" rx="7" transform="rotate(-17 80 55)"/><path class="art-detail" d="m72 47 28-8m-10 23 19-6"/>',
 blade:'<path class="art-wood" d="m31 98 29-29 10 10-28 31Z"/><path d="m57 64 14 15 41-42 19-30-31 19Z"/><path class="art-detail" d="m69 66 40-39M31 92l17 17m-5-28 16 16"/>',
 medkit:'<rect x="37" y="35" width="85" height="66" rx="10"/><path fill="none" d="M63 34V23h34v11"/><path class="art-accent" d="M72 47h15v14h14v15H87v14H72V76H58V61h14Z"/>',
 ammo:'<path d="M36 97V38l10-15 10 15v59Zm34 0V29L80 14l10 15v68Zm34 0V38l10-15 10 15v59Z"/><path class="art-detail" d="M36 45h20m14-8h20m14 8h20M36 88h20m14 0h20m14 0h20"/>',
 flare:'<rect x="67" y="48" width="25" height="59" rx="5"/><path class="art-accent" d="M62 43h35v13H62Z"/><path class="art-detail" d="M80 37V11M65 34 49 19m45 15 16-15M74 64v30"/>',
 grenade:'<path d="M64 36h34l10 20v39l-8 14H61l-9-14V56Z"/><path class="art-detail" d="M61 68h38M61 83h38m-25-30v45M87 53v45M69 35V22h21v13m-5-13 25 16v39"/><circle cx="106" cy="19" r="10" fill="none"/>'
};
const itemTiles=['wrench','axe','pistol','bow','shotgun','rifle','harpoon','blade','staff','eclipse','tempest','heart','medkit','ammo','flare','grenade'];
export function itemArt(id){if(['pick','crossbow','maul','repeater'].includes(id))return `<span class="item-art raster-item" aria-hidden="true" style="background-image:url('assets/${id}-v17.svg');background-size:cover;background-position:center"></span>`;const n=itemTiles.indexOf(id);return '<span class="item-art raster-item" aria-hidden="true" style="background-position:'+((n%4)*100/3)+'% '+(Math.floor(n/4)*100/3)+'%"></span>';}

const scenery={
 tree:'<rect x="66" y="64" width="25" height="27" rx="3" fill="#4c5848"/><path d="M78 80V48" stroke="#9a8870" stroke-width="4"/><path d="M78 23 57 61h42Z" fill="#426c58"/><path d="m78 13-15 30h31Z" fill="#567963"/><path d="m78 22-4 26" stroke="#6d896d" stroke-width="2"/>',
 bench:'<g transform="rotate(-8 78 78)"><path d="M64 68h27v17H64Z" fill="#765e43" stroke="#a88b64"/><path d="M64 74h27m-27 5h27M68 86v6m19-6v6" stroke="#343f36" stroke-width="3"/></g>',
 drain:'<rect x="68" y="70" width="25" height="17" rx="3" fill="#152d2b" stroke="#6b7770"/><path d="M72 73v11m5-11v11m5-11v11m5-11v11" stroke="#536762"/>',
 crates:'<path d="M66 61h25v24H66Z" fill="#806c4b" stroke="#b3996e"/><path d="m67 62 23 22m0-22L67 84" stroke="#b3996e"/><path d="M51 76h18v15H51Z" fill="#57625a" stroke="#839284"/>',
 bed:'<rect x="67" y="38" width="24" height="48" rx="3" fill="#5b7875" stroke="#94a79a"/><rect x="70" y="42" width="18" height="10" rx="2" fill="#b3b6a0"/><path d="M70 60h18m-15 0v22" stroke="#809690"/>',
 desk:'<rect x="62" y="62" width="31" height="23" rx="2" fill="#856e4d" stroke="#ac9473"/><rect x="68" y="67" width="10" height="13" transform="rotate(-7 73 73)" fill="#c4bc94"/><rect x="82" y="65" width="7" height="6" fill="#2b4742"/><path d="M65 89h24" stroke="#3c4d44" stroke-width="4"/>',
 pump:'<rect x="63" y="61" width="29" height="27" rx="4" fill="#4c6b69" stroke="#97aaa0"/><circle cx="77" cy="74" r="9" fill="#1a3334" stroke="#95aea0"/><path d="M77 69v5l4 3M64 68H53V49m38 29h8" stroke="#a79370" stroke-width="3" fill="none"/>',
 radio:'<rect x="63" y="67" width="32" height="20" rx="3" fill="#304b48" stroke="#90a598"/><path d="m70 67 12-19" stroke="#a8b4a0" stroke-width="2"/><rect x="67" y="72" width="12" height="8" fill="#7eaaa0"/><circle cx="87" cy="77" r="4" fill="#ad9267"/>'
};
export function terrainArt(z,mission){
 const rooms={'ATELIER 04':1,'POSTE RADIO':2,'DISPENSAIRE':3,'ENTREPÔT B':4,'SALLE DES POMPES':5,'ARCHIVES':6};
 const n=z.room>=0?rooms[z.name]:((z.id*7+mission*3)%5===0?7:0);
 return '<span class="terrain-image" aria-hidden="true" style="background-position:'+((n%4)*100/3)+'% '+(n>=4?100:0)+'%"></span>';
}
