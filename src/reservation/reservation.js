export default class Reservation{
    constructor(ID, activity, room, day, hour, duration){
        this.id = ID
        this.activity = activity
        this.room = room
        this.when = `${this.getDay(day - 0)} ${hour
            .toString()
            .padStart(2, "0")}:00 - ${(Number(hour) + Number(duration))
            .toString()
            .padStart(2, "0")}:00`
    }

    getDay(i) {
        switch (i) {
          case 1:
            return "Monday";
          case 2:
            return "Tuesday";
          case 3:
            return "Wednesday";
          case 4:
            return "Thursday";
          case 5:
            return "Friday";
          case 6:
            return "Saturday";
          case 7:
            return "Sunday";
          default:
            throw new Error();
        }
      }
}