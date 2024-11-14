/** @module modules/pitbot/PitReport */

export default class PitReport {
  static severityDuration = {
    '1': 3600000*4,
    '2': 3600000*8,
    '3': 3600000*12,
    '4': 3600000*24,
    '5': 3600000*48,
  };
  
  static previousSeverityDuration = {
    '1': 3600000*1,
    '2': 3600000*4,
    '3': 3600000*9,
    '4': 3600000*24,
    '5': 3600000*48,
  };
  
  static activeStrikeFactor = {
    '1': 1,
    '2': 1.05,
    '3': 1.1,
    '4': 1.3,
    '5': 3,
  };
  
  static expirationDuration = 2592000000;
  
  static async create(userId, {client, module, bot}) {
    module = module ?? client?.master.modules.pitbot ?? bot?.modules.pitbot;
    if (!module)
      throw new Error(`PitReport has no reference to the pitbot module.`);
    
    // For the testing app, make the duration much lower.
    if (module.bot.config.id === '1040775664539807804')
      this.expirationDuration = 120000;
    
    let report = new PitReport(userId, module);
    await report.loadData();
    return report;
  }
  
  module;
  userId;
  activeStrikes = [];
  expiredStrikes = [];
  removedStrikes = [];
  releases = [];
  bullethells = [];
  timeouts = [];
  selfpits = [];
  
  constructor(userId, module) {
    this.userId = userId;
    this.module = module;
  }
  
  async loadData() {
    this.bullethells = await this.module.database.all('SELECT *,date+duration AS releaseTime FROM bullethell WHERE userId=? ORDER BY releaseTime DESC', this.userId);
    
    // Categorize the entries in the pits database.
    let pits = await this.module.database.all('SELECT *,date+duration AS releaseTime FROM pits WHERE userId=? ORDER BY releaseTime DESC', this.userId);
    for(let timeout of pits) {
      if (timeout.modId)
        this.timeouts.push(timeout);
      else
        this.selfpits.push(timeout);
    }
    
    // Categorize the entries in the strikes database.
    let strikes = await this.module.database.all('SELECT rowId AS strikeId,* FROM strikes WHERE userId=? ORDER BY date DESC', this.userId);
    for(let strike of strikes) {
      // Severity < 0 means it's a mod explicitly releasing a user from the pit, regardless of their previous strikes.
      if (strike.severity < 0) {
        this.releases.push(strike);
        continue;
      }
      
      // Severity = 0 means the strike was removed. It could be deleted from the database entirely in the future.
      if (strike.severity === 0) {
        this.removedStrikes.push(strike);
        continue;
      }
      
      // A strike is active if it was issued in the last month, or if it was issued less than a month before the next most recent active strike.
      let isActive = (strike.date > (Date.now() - this.constructor.expirationDuration))
        || this.activeStrikes.length && (strike.date > (this.activeStrikes[this.activeStrikes.length-1].date - this.constructor.expirationDuration));
      
      if(isActive)
        this.activeStrikes.push(strike);
      else
        this.expiredStrikes.push(strike);
    }
  }
  
  get lastRelease() {
    return this.releases[0]?.date ?? 0;
  }
  
  async getNewlyExpired() {
    let newlyExpired = this.expiredStrikes.filter(strike => !strike.expired);
    if (newlyExpired.length) {
      let addSmt = await this.module.database.prepare('UPDATE strikes SET expired=1 WHERE rowId=?');
      for (let strike of newlyExpired) {
        await addSmt.run(strike.strikeId);
        strike.expired = 1;
      }
      await addSmt.finalize();
    }
    return newlyExpired;
  }
  
  getStrikeDuration() {
    let duration = 0;
    for(let strike of this.activeStrikes) {
      if (!duration)
        duration = this.constructor.severityDuration[strike.severity];
      else
        duration += this.constructor.previousSeverityDuration[strike.severity];
    }
    
    duration *= this.constructor.activeStrikeFactor[Math.min(this.activeStrikes.length, 5)];
    
    // For the testing app, make the duration much lower.
    if (this.module.bot.config.id === '1040775664539807804')
      duration = duration / 3600;
    
    return duration;
  }
  
  getStrikeRelease() {
    if (this.activeStrikes.length)
      return this.activeStrikes[0].date + this.getStrikeDuration();
    return 0;
  }
  
  getCurrentPit() {
    // Get the most recent of each pit type since the last release.
    let strike = this.activeStrikes.filter(pit => pit.date > this.lastRelease)[0];
    let bullethell = this.bullethells.filter(pit => pit.date > this.lastRelease)[0];
    let timeout = this.timeouts.filter(pit => pit.date > this.lastRelease)[0];
    let selfpit = this.selfpits.filter(pit => pit.date > this.lastRelease)[0];
    
    // Sort the most recent pits of type by release time.
    let releaseTimes = {};
    if (strike)
      releaseTimes[this.getStrikeRelease()] = strike;
    if (bullethell)
      releaseTimes[bullethell.releaseTime] = bullethell;
    if (timeout)
      releaseTimes[timeout.releaseTime] = timeout;
    if (selfpit)
      releaseTimes[selfpit.releaseTime] = selfpit;
    
    if (Object.entries(releaseTimes).length) {
      let furthestReleaseTime = Math.max(...Object.keys(releaseTimes));
      let primaryPit = releaseTimes[furthestReleaseTime];
      return {
        entry: primaryPit,
        type: primaryPit.severity
          ? 'strike'
          : primaryPit.messageLink
          ? 'bullethell'
          : primaryPit.modId
          ? 'timeout'
          : 'selfpit',
        pitted: furthestReleaseTime > Date.now(),
        releaseTime: furthestReleaseTime,
      };
    }
    else if (this.releases.length) {
      return {
        entry: this.releases[0],
        type: 'release',
        pitted: false,
        releaseTime: this.releases[0].date,
      };
    }
    else
      return null;
  }
}
