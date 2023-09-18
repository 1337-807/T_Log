// Define the event classes
export class Event {
    constructor(type, timestamp) {
      this.type = type;
      this.timestamp = timestamp;
    }
  }
  
  export class JoinEvent extends Event {
    constructor(username, timestamp) {
      super('join', timestamp);
      this.username = username;
    }
  }
  
  export class LeaveEvent extends Event {
    constructor(username, timestamp) {
      super('leave', timestamp);
      this.username = username;
    }
  }
  
  export class AnonGiftEvent extends Event {
    constructor(username, timestamp, originId, id, tmiTimestamp, isSus) {
      super('anongift', timestamp);
      this.username = username;
      this.originId = originId;
      this.id = id;
      this.tmiTimestamp = tmiTimestamp;
      this.isSus = isSus;
    }
  }

  export class TimestampSnapshot {
    constructor(timestamp, activeUsers, activeNumber) {
      this.timestamp = timestamp;
      this.activeUsers = activeUsers;
      this.activeNumber = activeNumber;
    }
  }