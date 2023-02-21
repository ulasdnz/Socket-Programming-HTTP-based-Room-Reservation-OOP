import ActivityServer from "./activityServer.js";
import Response from "./activityResponse.js"
import promptSync from 'prompt-sync';
const prompt = promptSync();

const PORTNUMBER = prompt('Activity Server Port Number: ');

const server = new ActivityServer(PORTNUMBER);
const response = new Response()
server.initialize(response)