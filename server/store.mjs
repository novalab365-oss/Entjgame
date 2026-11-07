import {DatabaseSync} from 'node:sqlite';
import {randomBytes, randomUUID,createHash} from 'node:crypto';
import {dayKey,CONFIG} from '../shared/config.mjs';
const digest=t=>createHash('sha256').update(t).digest('hex');
export class Store{
 constructor(path=':memory:'){
  this.db=new DatabaseSync(path); this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS guests(id TEXT PRIMARY KEY,nick TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,guest TEXT NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS earnings(day TEXT,guest TEXT,amount INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,guest)); CREATE TABLE IF NOT EXISTS rewards(unit TEXT PRIMARY KEY,guest TEXT,day TEXT,amount INTEGER);`);
 }
 guest(token,now=Date.now()){if(!token)return null;return this.db.prepare('SELECT g.* FROM sessions s JOIN guests g ON g.id=s.guest WHERE s.token=? AND s.expires>?').get(digest(token),now);}
 create(nick,now=Date.now()){const id=randomUUID(),token=randomBytes(32).toString('hex');this.db.prepare('INSERT INTO guests VALUES(?,?)').run(id,nick);this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),id,now+CONFIG.sessionDays*86400000);return {id,nick,token};}
 rename(id,nick){this.db.prepare('UPDATE guests SET nick=? WHERE id=?').run(nick,id);}
 amount(id,now=Date.now()){return this.db.prepare('SELECT amount FROM earnings WHERE day=? AND guest=?').get(dayKey(now),id)?.amount??0;}
 award(unit,id,amount,now){const day=dayKey(now);this.db.exec('BEGIN IMMEDIATE');try{const r=this.db.prepare('INSERT OR IGNORE INTO rewards VALUES(?,?,?,?)').run(unit,id,day,amount);if(r.changes)this.db.prepare('INSERT INTO earnings VALUES(?,?,?) ON CONFLICT(day,guest) DO UPDATE SET amount=amount+excluded.amount').run(day,id,amount);this.db.exec('COMMIT');return !!r.changes;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 ranking(id,now=Date.now()){const rows=this.db.prepare(`SELECT g.id,g.nick,COALESCE(e.amount,0) amount,RANK() OVER(ORDER BY COALESCE(e.amount,0) DESC) rank FROM guests g LEFT JOIN earnings e ON e.guest=g.id AND e.day=? ORDER BY amount DESC,g.id ASC`).all(dayKey(now));return {day:dayKey(now),top:rows.slice(0,10),me:rows.find(r=>r.id===id)};}
 close(){this.db.close();}
}
