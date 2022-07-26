import { createServer } from "http";
import express from 'express';
import { Server} from "socket.io";
import path from 'path';
import { fileURLToPath } from 'url';
import { Game } from '../client/src/Game.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: (path.join(__dirname, '/../client'))
    });
});
app.use(express.static(path.join(__dirname, '/../client')));
const PORT = 8080;
const FPS = 60;

app.set('port', PORT);

const server = createServer(app);
let io = new Server(server);

// global player info
let game;
let conn1;
let conn2;

io.sockets.on('connection', (socket) => {
    // first connection
    if (!conn1) {
        socket.emit('player', 1);
    } else if (!conn2) { // second connection
        socket.emit('player', 2);
    }
    
    // connection confirmation
    socket.on('confirm', (player) => {
        if (player == 1) {
            conn1 = socket;
            console.log('first connected');
        } else if (player == 2) {
            conn2 = socket;
            console.log('second connected');
        } else {
            console.log('error');
        }
    })
});

// run game at 60 fps
setInterval(() => {
    if (conn1 && conn2 && game) {
        
        game.draw();
        game.updatePosition();
        game.updateMovement();

    } else if (conn1 && conn2 && !game) {
        game = new Game(conn1, conn2)
    } else if (game && (!conn1 || !conn2)) {
        console.log('some user disconnected')
    }
}, 1000 / FPS);


server.on('error', (err) => {
    console.log(err);
});

server.listen(PORT, () => {
    console.log(`server on port ${PORT} is ready!!`);
});

