import { Buffer } from "buffer";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class Response {
  constructor() {
    this.reqRaw = "";
    this.req = [];
    this.method = "";
    this.path = "";
    this.name = "";
    this.socket = null;
    this.databasePath = path.join(__dirname, "database", "Activities.json");
  }

  async handleData(socket, buffer) {
    this.socket = socket;
    this.reqRaw = buffer.toString("utf-8");
    this.req = this.reqRaw.split("\r\n");
    this.method = this.req[0].split(" ")[0];

    this.printRequestMessage(buffer);
    if (this.checkDefaultBrowserRequest()) return;

    try {
      this.assignNameAndPath();
    } catch (err) {
      if (err) return this.sendError400();
    }

    if (this.path === "remove") return this.remove();
    if (this.path === "check") return this.check();
    if (this.path === "add") return this.add();
  }

  handleEnd() {
    return console.log(
      "\n----------------------------------------------------------\n\n"
    );
  }
  handleError() {
    return;
  }

  remove = () => {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    if (!database.records.includes(this.name)) {
      return this.sendError403();
    }

    database.records.splice(database.records.indexOf(this.name), 1);

    return fs.writeFile(this.databasePath, JSON.stringify(database), (err) => {
      if (err) console.log(err);
      const res = this.getHtml();
      console.log("Response: \n\n\n");
      console.log(res);
      return this.socket.end(res);
    });
  };

  check() {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    if (database.records.includes(this.name)) {
      const res =
        "HTTP/1.1 200 OK\r\n" +
        "Date: " +
        new Date().toUTCString() +
        "\r\n" +
        "Content-Type: text/html\r\n\r\n";
      console.log("Response: \n\n\n");
      console.log(res);
      return this.socket.end(res);
    }
    const res = "HTTP/1.1 404 Not Found\r\n";
    console.log("Response: \n\n\n");
    console.log(res);
    return this.socket.end(res);
  }

  add() {
    const databaseFileJSON = fs.readFileSync(this.databasePath, {
      encoding: "utf-8",
    });
    const database = JSON.parse(databaseFileJSON);

    if (database.records.includes(this.name)) return this.sendError403();
    database.records.push(this.name);

    return fs.writeFile(this.databasePath, JSON.stringify(database), (err) => {
      if (err) console.log(err);
      const res = this.getHtml();
      console.log("Response: \n\n\n");
      console.log(res);
      return this.socket.end(res);
    });
  }

  assignNameAndPath() {
    this.path = this.req[0].split(" ")[1].split("?")[0].slice(1);
    if (this.path !== "add" && this.path !== "remove" && this.path !== "check")
      throw new Error();

    if (this.method == "POST") {
      this.json = JSON.parse(this.reqRaw.split("\r\n\r\n")[1]);
      this.name = this.json.name;
    } else
      this.name = this.req[0].split(" ")[1].split("?")[1].split("name=")[1];

    if (this.name === "" || this.name == undefined) throw new Error();
  }

  checkDefaultBrowserRequest() {
    if (this.req[0].split(" ")[1] === "/favicon.ico") {
      const res =
        "HTTP/1.1 200 OK\r\n" +
        "Content-Type: image/x-icon\r\n" +
        "Content-Length: 0\r\n" +
        "Cache-control: no-cache, max-age=0\r\n" +
        "Date: " +
        new Date().toUTCString() +
        "\r\n" +
        "\r\n";
      console.log("Response: \n\n\n");
      console.log(res);
      this.socket.end(res);
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
    const res = "HTTP/1.1 400 Bad request\r\n";
    console.log("Response: \n\n\n");
    console.log(res);
    return this.socket.end(res);
  }
  sendError403() {
    const res = "HTTP/1.1 403 Forbidden\r\n";
    console.log("Response: \n\n\n");
    console.log(res);
    return this.socket.end(res);
  }

  getHtml() {
    const payload = `<html>
    <head>
    <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
    <title>${
      this.path == "remove" ? "Activity Removed." : "Activity Added."
    }</title>
    </head>
    <body>
      <p style="font-size:27px;font-weight:bold;">
      Activity with name <span style="font-size:28px;color:red;">
      ${this.name}</span> is successfully ${
      this.path == "remove" ? "removed!" : "added!"
    }</p>
      </body>
      </html>`;
    const contentLength = Buffer.byteLength(payload, "utf8");

    return (
      "HTTP/1.1 200 OK\r\n" +
      "Content-Type: text/html\r\n" +
      `Content-Length: ${contentLength}\r\n` +
      "Cache-control: no-cache, max-age=0\r\n" +
      "Date: " +
      new Date().toUTCString() +
      "\r\n" +
      "\r\n" +
      payload
    );
  }
}
