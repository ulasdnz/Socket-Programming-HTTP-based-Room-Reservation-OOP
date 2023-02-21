import ReservationServer from "./reservationServer.js";
import Response from "./reservationResponse.js"
import promptSync from 'prompt-sync';
const prompt = promptSync();

const PORTNUMBER = prompt('RESERVATION Server Port Number: ');
const ROOMPORTNUMBER = prompt('ROOM Server Port Number: ');
const ACTIVITYPORTNUMBER = prompt('ACTIVITY Server Port Number: ');

const server = new ReservationServer(PORTNUMBER);
const response = new Response(ACTIVITYPORTNUMBER, ROOMPORTNUMBER)
server.initialize(response)