import net from "net";
import { Buffer } from "buffer";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import Reservation from "./reservation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class Response {
  constructor(activityServerPortNumber, roomServerPortNumber) {
    this.activityServerPortNumber = activityServerPortNumber;
    this.roomServerPortNumber = roomServerPortNumber;
    this.reqRaw = ""
    this.method = ""
    this.json = ""
    this.req = [];
    this.path = "";
    this.roomName = "";
    this.title = "";
    this.message = "";
    this.response = "";
    this.responseList = [];
    this.socket = null;
    this.databasePath = path.join(__dirname, "database", "Reservations.json");
  }

  async handleData(socket, buffer ) {
    
    this.socket = socket;
    this.reqRaw = buffer.toString("utf-8")
    this.req = this.reqRaw.split("\r\n");
    
    this.printRequestMessage(buffer);
    if (this.checkDefaultBrowserRequest()) return;

    try {
      this.assignPath();
    } catch (err) {
      if (err) return this.sendError400();
    }

    if (this.path === "reserve") return this.reserve();
    if (this.path === "display") return this.display();
    if (this.path === "listavailability") return this.listAvailability();
  }

  listAvailability() {
    let day 
    if(this.method === "POST"){
      day = this.json.day
    }else{
      day = this.req[0]
      .split(" ")[1]
      .split("?")[1]
      .split("&")[1]
      ?.split("day=")[1];
    }

    if (day) this.oneDay(day);
    else{
      for(let i=1;i<8;i++){
        const roomSocket = new net.Socket();
        roomSocket.connect(this.roomServerPortNumber, "localhost");
        const req = `GET /checkavailability?name=${this.roomName}&day=${i} HTTTP/1.1\r\n\r\n`;
        console.log("Request: \n\n\n");
        console.log(req);
        roomSocket.write(req)

        roomSocket.on("data", data => {
          const res = data.toString("utf-8");
          console.log("Response from Room Server: \n\n\n");
          console.log(res);

          if(this.responseList.length < 6){
            let availableHours;
            try {
              availableHours = res
                .split("\r\n")[6]
                .split("h2")[1]
                .slice(2, -2);
            } catch (err) {
            if(err)  return this.sendError400()
            }
            this.responseList.push({
              day: i,
              message: `<br><br> ${availableHours}`
            });
          return;
          }else {
            let availableHours;
            try {
              availableHours = res
                .split("\r\n")[6]
                .split("h2")[1]
                .slice(2, -2);
            } catch (err) {
              return this.sendError400()
            }
            this.responseList.push({
              day: i,
              message: `<br><br> ${availableHours}`
            });
            this.responseList.sort((a, b) => a.day - b.day);
     
            this.title = "All Available Hours";
            this.message = this.responseList.map((e) => e.message).join(" \n");
            this.responseList = []
            return this.sendResponse();
          }

        })

        roomSocket.on("error", (Error) => null);
        roomSocket.on("close",e=>null);

      }

    }
  }

 

  oneDay(day) {
    const roomClientSocket = new net.Socket();
    roomClientSocket.connect(this.roomServerPortNumber, "localhost");
    const request = `GET /checkavailability?name=${this.roomName}&day=${day} HTTTP/1.1\r\n\r\n`;
    console.log("Request: \n\n\n");
    console.log(request);
    roomClientSocket.write(request)

    roomClientSocket.on("data",data=>{
      const response = data.toString("utf-8");
      console.log("Response from Room Server: \n\n\n");
      console.log(response);

      console.log("Response: \n\n\n");
      console.log(response);
      return this.socket.end(response)
    })

    roomClientSocket.on("error", (ERROR) => null);
    roomClientSocket.on("close", () => { });
  }



  reserve() {
    let dayNumber, hour, duration, activityName;
    if(this.method==="POST"){
      dayNumber = this.json.day
      activityName = this.json.activity
      hour = this.json.hour
      duration = this.json.duration
    }else{
      try {
        activityName = this.req[0]
          .split(" ")[1]
          .split("?")[1]
          .split("&")[1]
          .split("activity=")[1];
        dayNumber = this.req[0]
          .split(" ")[1]
          .split("?")[1]
          .split("&")[2]
          .split("day=")[1];
        hour = this.req[0]
          .split(" ")[1]
          .split("?")[1]
          .split("&")[3]
          .split("hour=")[1];
        duration = this.req[0]
          .split(" ")[1]
          .split("?")[1]
          .split("&")[4]
          .split("duration=")[1];
      } catch (err) {
        if (err) return this.sendError400();
      }
    }


    const activityClientSocket = new net.Socket();
    activityClientSocket.connect(this.activityServerPortNumber, "localhost");
    const req = `GET /check?name=${activityName} HTTTP/1.1\r\n\r\n`;
    console.log("Request: \n\n\n");
    console.log(req);
    activityClientSocket.write(req);

    activityClientSocket.on("data", (data) => {
      const activityServerResponse = data.toString("utf-8");
      console.log("Response: \n\n\n");
      console.log(activityServerResponse);
      const statusOfResponse = activityServerResponse.split(" ")[1];
      if (statusOfResponse !== "200") {
        console.log("Response: \n\n\n");
        console.log(activityServerResponse);
        return this.socket.end(activityServerResponse);
      }
      const roomClientSocket = new net.Socket();
      roomClientSocket.connect(this.roomServerPortNumber, "localhost");
      const reqestToRoom = `GET /reserve?name=${this.roomName}&day=${dayNumber}&hour=${hour}&duration=${duration} HTTTP/1.1\r\n\r\n`;
      console.log("Resuest: \n\n\n");
      console.log(reqestToRoom);

      roomClientSocket.write(reqestToRoom);

      roomClientSocket.on("data", (data) => {
        const resFromRoom = data.toString("utf-8");
        const status = resFromRoom.split("\r\n")[0].split(" ")[1];
        console.log("Response from Room Server: \n\n\n");
        console.log(resFromRoom);

        if (status !== "200") {
          console.log("Response from Activity Server: \n\n\n");
          console.log(resFromRoom);
          return this.socket.end(resFromRoom);
        }
        const databaseFileJSON = fs.readFileSync(this.databasePath, {
          encoding: "utf-8",
        });
        const database = JSON.parse(databaseFileJSON);

        const reservation = new Reservation(
          database.records.length + 1,
          activityName,
          this.roomName,
          dayNumber,
          hour,
          duration
        );

        database.records.push(reservation);

        return fs.writeFile(
          this.databasePath,
          JSON.stringify(database),
          (err) => {
            if (err) return console.log(err);

            this.title = "Reservation Successful.";
            this.message = `<p style='font-size:27px;font-weight:bold;'>
              Room <span style="font-size:28px;color:red;">${this.roomName}</span>
              is reserved for activity  <span style="font-size:28px;color:red;">
               ${activityName}</span> on ${reservation.when}.
              Your reservation ID is ${reservation.id} </p>`;
            return this.sendResponse();
          }
        );
      });
    });

    activityClientSocket.on("error", (err) => console.log(err));
    activityClientSocket.on("close", () => {
      //console.log("connection has been closed");
      // roomClientSocket.destroy();
    });

    return;
  }

  display() {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    let requestedReservationID 
    if(this.method==="POST"){
      requestedReservationID = this.json.id
    }else{
      requestedReservationID = Number(
        this.req[0].split(" ")[1].split("?")[1].split("&")[0].split("id=")[1]
      );
    }
    if (requestedReservationID == 0 || requestedReservationID == undefined) {
      return this.sendError400();
    }

    const requesedReservation = database.records.find(
      (e) => e.id === requestedReservationID
    );
    if (!requesedReservation) return this.sendError400();

    this.title = `Reservation id: ${requestedReservationID}`; //!! Style this!
    this.message = `Reservation ID: ${requestedReservationID} <br>
    Room Name: ${requesedReservation.room}            <br>
    Activity:  ${requesedReservation.activity}        <br>
    When:  ${requesedReservation.when} `;

    return this.sendResponse();
  }

  assignPath() {
    this.path = this.req[0].split(" ")[1].split("?")[0].slice(1);
    this.method = this.req[0].split(" ")[0]
    if (
      this.path !== "reserve" &&
      this.path !== "display" &&
      this.path !== "listavailability"
    )
      throw new Error();
    if(this.method === "POST"){
      const json = JSON.parse(this.reqRaw.split("\r\n\r\n")[1]);
      this.json = json;
      if (this.path !== "display")
        this.roomName = this.json.room
    }else{
      if (this.path !== "display") {
        this.roomName = this.req[0]
          .split(" ")[1]
          .split("?")[1]
          .split("&")[0]
          .split("room=")[1];
        if (this.roomName === "" || this.roomName == undefined) throw new Error();
      }
    }
  
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
