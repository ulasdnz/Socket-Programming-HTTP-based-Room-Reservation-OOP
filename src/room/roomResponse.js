import { Buffer } from "buffer";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import Room from "./room.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class Response {
  constructor() {
    this.reqRaw = "";
    this.req = [];
    this.method = "";
    this.json = "";
    this.path = "";
    this.name = "";
    this.title = "";
    this.message = "";
    this.response = "";
    this.socket = null;
    this.databasePath = path.join(__dirname, "database", "Rooms.json");
  }

  async handleData(socket, buffer) {
    this.socket = socket;
    this.reqRaw = buffer.toString("utf-8");
    this.req = this.reqRaw.split("\r\n");

    this.printRequestMessage(buffer);
    if (this.checkDefaultBrowserRequest()) return;

    try {
      this.assignNameAndPath();
    } catch (err) {
      if (err) return this.sendError400();
    }

    if (this.path === "add") return this.add();
    if (this.path === "remove") return this.remove();
    if (this.path === "reserve") return this.reserve();
    if (this.path === "checkavailability") return this.checkAvailability();
  }

  reserve() {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    let dayNumber, hour, duration;
    let roomIndex;
    if (
      !database.records.some((room, ind) => {
        if (room.name === this.name) roomIndex = ind;
        return room.name === this.name;
      })
    ) {
      return this.sendError400();
    }

    try {
      if (this.method == "POST") {
        dayNumber = this.json.day;
        hour = this.json.hour;
        duration = this.json.duration;
      } else {
        dayNumber =
          this.req[0]
            .split(" ")[1]
            .split("?")[1]
            .split("&")[1]
            .split("day=")[1] - 0;
        hour =
          this.req[0]
            .split(" ")[1]
            .split("?")[1]
            .split("&")[2]
            .split("hour=")[1] - 0;
        duration =
          this.req[0]
            .split(" ")[1]
            .split("?")[1]
            .split("&")[3]
            .split("duration=")[1] - 0;
      }
    } catch (err) {
      if (err) return this.sendError400();
    }
    if (
      dayNumber < 1 ||
      dayNumber > 7 ||
      hour < 9 ||
      hour > 17 ||
      duration < 1 ||
      duration > 9
    ) {
      return this.sendError400();
    }
    const room = database.records[roomIndex];
    const allHours = room[`day_${dayNumber}`];

    // Checks if all hours that is requested to be reserved are available.
    for (let index = 0; index < duration; index++)
      if (allHours[hour + index] !== null) return this.sendError403();

    const hours = [];
    for (let index = 0; index < duration; index++) {
      allHours[hour + index] = true;
      let str = `<br> ${(hour + index).toString().padStart(2, "0")}:00 - ${(
        hour +
        index +
        1
      )
        .toString()
        .padStart(2, "0")}:00`;
      hours.push(str);
    }

    return fs.writeFile(this.databasePath, JSON.stringify(database), (err) => {
      if (err) return console.log(err);
      this.title = "Reserved Hours";
      this.message = `<p style="font-size:27px;font-weight:bold;"> On ${this.getDay(
        dayNumber - 0
      )}, 
        Room ${this.name} is reserved for the following hours:
                      ${hours.join(",")}  </p> `;
      return this.sendResponse();
    });
  }

  checkAvailability() {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    let roomIndex;

    if (
      !database.records.some((room, ind) => {
        if (room.name === this.name) roomIndex = ind;
        return room.name === this.name;
      })
    ) {
      this.response = "HTTP/1.1 404 Not Found\r\n";
      console.log("Response: \n\n\n");
      console.log(this.response);
      return this.socket.end(this.response);
    }

    let dayNumber;
    try {
      if (this.method == "POST") dayNumber = this.json.day;
      else
        dayNumber =
          this.req[0]
            .split(" ")[1]
            .split("?")[1]
            .split("&")[1]
            .split("day=")[1] - 0;
    } catch (err) {
      if (err) return this.sendError400();
    }
    if (dayNumber < 1 || dayNumber > 7) {
      return this.sendError400();
    }

    const room = database.records[roomIndex];
    const hours = room[`day_${dayNumber}`];
    const availableHours = [];
    for (const hour in hours) {
      if (hours[hour] === null) availableHours.push(hour);
    }

    this.title = "Available Hours";
    this.message = `<h2> On ${this.getDay(dayNumber)}, 
    Room ${this.name} is available for the following hours:
                  ${availableHours.join(" ")}  </h2>`;

    return this.sendResponse();
  }

  remove = () => {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    let roomIndex;

    if (
      !database.records.some((room, ind) => {
        if (room.name === this.name) roomIndex = ind;
        return room.name === this.name;
      })
    )
      return this.sendError403();

    database.records.splice(roomIndex, 1);

    return fs.writeFile(this.databasePath, JSON.stringify(database), (err) => {
      if (err) return console.log(err);

      this.title = "Room Removed.";
      this.message = `<p style='font-size:27px;font-weight:bold;'>
      Room with name <span style="font-size:28px;color:red;"> ${this.name} 
      </span> is successfully removed. </p>`;

      return this.sendResponse();
    });
  };

  add() {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    for (const record of database.records) {
      if (record.name == this.name) return this.sendError403();
    }

    const newRoom = new Room(this.name);
    database.records.push(newRoom);

    return fs.writeFile(this.databasePath, JSON.stringify(database), (err) => {
      if (err) return console.log(err);

      this.title = "Room Added.";
      this.message = `<p style='font-size:27px;font-weight:bold;'>
      Room with name <span style="font-size:28px;color:red;"> ${this.name} 
      </span> is successfully added. </p>`;

      return this.sendResponse();
    });
  }

  assignNameAndPath() {
    this.method = this.req[0].split(" ")[0];
    this.path = this.req[0].split(" ")[1].split("?")[0].slice(1);

    if (this.method === "POST") {
      const json = JSON.parse(this.reqRaw.split("\r\n\r\n")[1]);
      this.json = json;
      this.name = json.name;
    } else
      this.name = this.req[0]
        .split(" ")[1]
        .split("?")[1]
        .split("&")[0]
        .split("name=")[1];

    if (
      this.path !== "add" &&
      this.path !== "remove" &&
      this.path !== "reserve" &&
      this.path !== "checkavailability"
    )
      throw new Error();
    if (this.name === "" || this.name == undefined) throw new Error();
  }

  sendResponse() {
    const payload = `<html>
    <head>
    <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
    <title>${this.title}</title>
    </head>
    <body>
    <h1>${this.message}</h1>
      </body>
      </html>`;
    const contentLength = Buffer.byteLength(payload, "utf8");

    this.response =
      "HTTP/1.1 200 OK\r\n" +
      "Content-Type: text/html\r\n" +
      `Content-Length: ${contentLength}\r\n` +
      "Cache-control: no-cache, max-age=0\r\n" +
      "Date: " +
      new Date().toUTCString() +
      "\r\n" +
      "\r\n" +
      payload;

    console.log("Response: \n\n\n");
    console.log(this.response);
    return this.socket.end(this.response);
  }

  checkDefaultBrowserRequest() {
    if (this.req[0].split(" ")[1] === "/favicon.ico") {
      this.response =
        "HTTP/1.1 200 OK\r\n" +
        "Content-Type: image/x-icon\r\n" +
        "Content-Length: 0\r\n" +
        "Cache-control: no-cache, max-age=0\r\n" +
        "Date: " +
        new Date().toUTCString() +
        "\r\n" +
        "\r\n";
      console.log("Response: \n\n\n");
      console.log(this.response);
      this.socket.end(this.response);
      return true;
    }
  }

  printRequestMessage(buffer) {
    console.log("\n\n\n");
    console.log("Request: \n\n\n");
    console.log(buffer.toString("utf-8"));
    return;
  }

  sendError400() {
    this.response = "HTTP/1.1 400 Bad request\r\n";
    console.log("Response: \n\n\n");
    console.log(this.response);
    return this.socket.end(this.response);
  }
  sendError403() {
    this.response = "HTTP/1.1 403 Forbidden\r\n";
    console.log("Response: \n\n\n");
    console.log(this.response);
    return this.socket.end(this.response);
  }
  handleEnd() {
    return console.log(
      "\n----------------------------------------------------------\n\n"
    );
  }
  handleError() {
    return;
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
