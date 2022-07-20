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
let switch1;
let switch2;
let attackCollisionPos1;
let attackCollisionPos2;

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
            switch1 = data['switch'];
            attackCollisionPos1 = data['attackCollisionPos'];

            io.emit('user-input', {
                'player': 1,
                'keys': data['keys'],
                'last': data['last'],
                'jumping': data['jumping'],
                'crouching': data['crouching'],
                'collidingLeft': data['collidingLeft'],
                'collidingRight': data['collidingRight']
            })
        } else if (data['player'] == 2) {
            player2Pos = data['position'];
            animation2 = data['animation'];
            switch2 = data['switch'];
            attackCollisionPos2 = data['attackCollisionPos'];

            io.emit('user-input', {
                'player': 2,
                'keys': data['keys'],
                'last': data['last'],
                'jumping': data['jumping'],
                'crouching': data['crouching'],
                'collidingLeft': data['collidingLeft'],
                'collidingRight': data['collidingRight']
            })
        }
    })

    socket.on('damage', (data) => {
        io.emit('damage', data);
    })

    socket.on('collide', (data) => {
        io.emit('collide', data);
    })

    socket.on('win', (winner) => {
        console.log('winner: ' + winner);
        io.emit('win', winner);
    })
});

// run game at 60 fps
setInterval(() => {
    io.emit('update', () => {});
    if (conn1 && conn2) {
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


server.on('error', (err) => {
    console.log(err);
});

server.listen(PORT, () => {
    console.log(`server on port ${PORT} is ready!!`);
});

