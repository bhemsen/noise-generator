export type Settings = { slope:number; low:number; high:number; volume:number; width:number; fade:number; timer:number };
export type Preset = { id:string; name:string; settings:Settings; createdAt:number };
const DB_NAME='noise-generator';
const STORE='keyval';
function database():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function load<T>(key:string,fallback:T):Promise<T> {
  try {
    const db=await database();
    return await new Promise<T>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result??fallback);req.onerror=()=>reject(req.error);
      tx.oncomplete=()=>db.close();
    });
  }catch{return fallback;}
}
export async function save<T>(key:string,value:T):Promise<void> {
  const db=await database();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });db.close();
}
