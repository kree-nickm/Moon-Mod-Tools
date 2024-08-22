/** @module classes/Database */
import sqlite3 from 'sqlite3';

/**
 * Wrapper class for the sqlite3 node module, which converts all of the callback-based methods into Promise-based methods.
 */
export default class Database {
  static connected = {};
  
  static async create(filename, mode) {
    this.connected[filename] = new this();
    await this.connected[filename].connect(filename, mode);
    return this.connected[filename];
  }
  
  db;
  
  connect(filename, mode=sqlite3.OPEN_READWRITE|sqlite3.OPEN_CREATE|sqlite3.OPEN_FULLMUTEX) {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(filename, mode, (err) => err ? reject(err) : resolve());
    });
  }
  
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => err ? reject(err) : resolve());
    });
  }
  
  run(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, ...params, function(err) {err ? reject(err) : resolve(this)});
    });
  }
  
  get(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, ...params, (err,row) => err ? reject(err) : resolve(row));
    });
  }
  
  all(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, ...params, (err,rows) => err ? reject(err) : resolve(rows));
    });
  }
  
  prepare(sql, ...params) {
    return new Promise((resolve, reject) => {
      let smt = new Statement(this.db.prepare(sql, ...params, err => err ? reject(err) : resolve(smt)));
    });
  }
}

class Statement {
  smt;
  
  constructor(smt) {
    this.smt = smt;
  }
  
  run(...params) {
    return new Promise((resolve, reject) => {
      this.smt.run(...params, function(err) {err ? reject(err) : resolve(this)});
    });
  }
  
  finalize() {
    return new Promise((resolve, reject) => {
      this.smt.finalize((err) => err ? reject(err) : resolve());
    });
  }
}
