import net from "net";

export default class RoomServer {
  constructor(portNumber) {
    this.portNumber = portNumber;
  }

  initialize(response) {
    this.server = net.createServer((socket) => {
      socket.on("data", (buffer) =>
        response.handleData(socket, buffer, this.listOfDays, this.requestNumberSentToRoomServer)
      );
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
