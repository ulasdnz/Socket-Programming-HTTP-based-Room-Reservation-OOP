import ActivityServer from "./roomServer.js";
import Response from "./roomResponse.js"
import promptSync from 'prompt-sync';
const prompt = promptSync();

const PORTNUMBER = prompt('Room Server Port Number: ');

const server = new ActivityServer(PORTNUMBER);
const response = new Response()
server.initialize(response)