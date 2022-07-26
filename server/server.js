import { createServer } from "http";
import express from 'express';
import { Server} from "socket.io";
import path from 'path';
import { fileURLToPath } from 'url';

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
let conn1;
let conn1Id;
let conn2;
let conn2Id;
let player1Pos;
let player2Pos;
let animation1;
let animation2;
let attackCollisionPos1;
let attackCollisionPos2;
let health1 = 100;
let health2 = 100;
let currMove1 = 'none';
let currMove2 = 'none';

io.sockets.on('connection', (socket) => {
    // first connectiion
    if (!conn1) {
        socket.emit('player', 1);
    } else if (!conn2) {
        socket.emit('player', 2);
    }
    
    // connection confirmation
    socket.on('confirm', (data) => {
        if (data[0] == 1) {
            conn1 = socket;
            conn1Id = data[1];
            player1Pos = data[2];
            console.log('first connected');
        } else if (data[0] == 2) {
            conn2 = socket;
            conn2Id = data[1];
            player2Pos = data[2];
            console.log('second connected');
        } else {
            console.log('error');
        }
    })

    // constantly outputed by players
    socket.on('action', (data) => {
        if (data['player'] == 1) {
            player1Pos = data['position'];
            animation1 = data['animation'];
            attackCollisionPos1 = data['attackCollisionPos'];

            io.emit('user-input', {
                'player': 1,
                'keys': data['keys'],
                'last': data['last'],
                'jumping': data['jumping'],
                'crouching': data['crouching'],
                'collidingLeft': data['collidingLeft'],
                'collidingRight': data['collidingRight'],
                'attacking': data['attacking']
            })
        } else if (data['player'] == 2) {
            player2Pos = data['position'];
            animation2 = data['animation'];
            attackCollisionPos2 = data['attackCollisionPos'];

            io.emit('user-input', {
                'player': 2,
                'keys': data['keys'],
                'last': data['last'],
                'jumping': data['jumping'],
                'crouching': data['crouching'],
                'collidingLeft': data['collidingLeft'],
                'collidingRight': data['collidingRight'],
                'attacking': data['attacking']
            })
        }
    })

    socket.on('currMove', (data) => {
        if (data[0] == 1) {
            currMove1 = data[1];
            io.emit('currMove', data);
        } else if (data[0] == 2) {
            currMove2 = data[1];
            io.emit('currMove', data);
        }
    })

    socket.on('damage', (data) => {
        if (data[1] == 1 && attackCollisionPos1[5]) {
            attackCollisionPos1 = [null, null, null, null, null, false];
            health2 -= data[0];
            io.emit('stop-attack', 1)
            io.emit('health', [2, health2])
        } else if (data[1] == 2 && attackCollisionPos2[5]) {
            attackCollisionPos2 = [null, null, null, null, null, false];
            health1 -= data[0];
            io.emit('stop-attack', 2)
            io.emit('health', [1, health1]);
        }
    })

    socket.on('collide', (data) => {
        io.emit('collide', data);
    })

    socket.on('knockback', (player) => {
        
        if (player == 1 && currMove1 != 'knockback') {
            io.emit('setMove', [player, 'knockback'])
            currMove1 = 'knockback';
            setTimeout(() => {
                io.emit('setMove', [player, 'none'])
                console.log(currMove1);
                currMove1 = 'none';
            }, 1000 * 10 / FPS)
        } else if (player == 2 && currMove2 != 'knockback') {
            io.emit('setMove', [player, 'knockback'])
            currMove2 = 'knockback';
            setTimeout(() => {
                io.emit('setMove', [player, 'none'])
                currMove2 = 'none';
            }, 1000 * 10 / FPS)
        }
    })
});

let time = 99;

// run game at 60 fps
setInterval(() => {
    io.emit('update', () => {});
    if (conn1 && conn2) {
        if (health1 == 0 && health2 == 0) {
            io.emit('game-over', 0);
        } else if (health1 <= 0) {
            io.emit('game-over', 2);
        } else if (health2 <= 0) {
            io.emit('game-over', 1);
        }

        conn1.emit('new-info', {
            '1': player1Pos,
            '2': player2Pos,
            'animation1': animation1,
            'animation2': animation2,
            'attackCollisionPos1': attackCollisionPos1
        });
        conn2.emit('new-info', {
            '1': player1Pos,
            '2': player2Pos,
            'animation1': animation1,
            'animation2': animation2,
            'attackCollisionPos2': attackCollisionPos2
        });
    }
}, 1000 / FPS);

// clock
setInterval(() => {
    if (conn1 && conn2 && time >= 0) {
        io.emit('time', time);
        time -= 1
    } else if (time < 0) {
        if (health1 > health2) {
            io.emit('game-over', 1)
        } else if (health1 < health2) {
            io.emit('game-over', 2)
        } else {
            io.emit('game-over', 0)
        }
    }
}, 1000);


server.on('error', (err) => {
    console.log(err);
});

server.listen(PORT, () => {
    console.log(`server on port ${PORT} is ready!!`);
});

