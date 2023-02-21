import net from "net";

export default class ActivityServer {
  constructor(portNumber) {
    this.portNumber = portNumber;
  }

  initialize(response) {
    this.server = net.createServer((socket) => {
      socket.on("data", (buffer) => response.handleData(socket, buffer));
      socket.on("error", response.handleError);
      socket.on("end", response.handleEnd);
    });

    this.server.listen(this.portNumber);
    this.server.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        console.log("[Activity Server] Address in use, retrying...");
      }
    });
    return this.server;
  }
}
