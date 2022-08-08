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
const PORT = process.env.NODE_ENV == 'production' ? 80 : 8080;
const FPS = 60;

const server = createServer(app);
let io = new Server(server);

// global player info
let players = [];
let games = [];

for (let i = 0; i < 2; i++) {
    games.push([new Game(), false]);
} 

io.sockets.on('connection', (socket) => {
    // connection confirmation
    socket.on('find-match', () => {
        if (players.indexOf(socket) == -1) {
            players.push(socket);
        }
    })

    socket.on('stop-looking', () => {
        let index = players.indexOf(socket);
        if (index != -1) {
            players.splice(index, 1);
        }
    })

    socket.on('end-match', () => {
        games.find(game => {
            if (game[0].hasPlayer(socket)) {
                game[0].remPlayers();
                game[1] = false;
                return game;
            }
        })
    })
});

// run matchmaking every 1 second
setInterval(() => {
    let gamers = [];
    players.map(player => {
        gamers.push(player);
        if (gamers.length == 2) {
            let game = games.find(game => {
                if (game[1] == false) {
                    return game;
                }
            })
            if (game) {
                game[0].addPlayer1(gamers[0]);
                game[0].addPlayer2(gamers[1]);
                game[0].setupSockets();
                game[1] = true;
                gamers[0].emit('new-game');
                gamers[1].emit('new-game');
                let index = players.indexOf(gamers[0]);
                players.splice(index, 1);
                index = players.indexOf(gamers[1]);
                players.splice(index, 1);
                gamers = [];
            } else {
                console.log('no games available')
            }
        }
    })
    io.emit('online', players.length);
}, 1000);

// check connections every 1 second
setInterval(() => {
    games.map(game => {
        game[1] = game[0].getGood();
    })
}, 1000);

// run game at 60 fps
setInterval(() => {
    games.map(game => {
        if (game[1]) {
            game[0].draw();
            game[0].updatePosition();
            game[0].updateMovement();
        } else {
            game[0].disconnected();
        }
    })
}, 1000 / FPS);


server.on('error', (err) => {
    console.log(err);
});

server.listen(PORT, () => {
    console.log(`server on port ${PORT} is ready!!`);
});


