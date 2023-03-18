import express from 'express';
import cors from 'cors';
import { createServer } from 'https';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const app = express();
app.use(cors());

const httpServer = createServer(
    {
        key: fs.readFileSync('localhost.key', 'utf8'),
        cert: fs.readFileSync('localhost.crt', 'utf8'),
    },
    app
);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        credentials: true,
    },
});

const generateId = () => {
    return uuid();
};

io.of('/admin').on('connection', (socket) => {
    console.log('a admin connected');

    const roomId = generateId();
    socket.join(roomId);
    socket.emit('room-id', { id: generateId(), data: { roomId } });
});

io.of('/user').on('connection', (socket) => {
    console.log('a user connected');

    socket.on('set-room', async (roomData: { id: string }) => {
        const { id } = roomData;

        await socket.rooms.forEach(async (room) => {
            await socket.leave(room);
        });

        console.log(`Room set - ${id}`);

        socket['room-id'] = id;
        socket.join(id);

        let n = 0;
        io.of('/user').sockets.forEach((s) => {
            s.rooms.forEach((r) => {
                n += r === id ? 1 : 0;
            });
        });

        io.of('/admin')
            .to(id)
            .emit('room-user', {
                id: generateId(),
                data: { users: n },
            });
    });

    socket.on('disconnect', async () => {
        const id = socket['room-id'];

        let n = 0;

        io.of('/user').sockets.forEach((s) => {
            s.rooms.forEach((r) => {
                n += r === id ? 1 : 0;
            });
        });

        io.of('/admin')
            .to(id)
            .emit('room-user', {
                id: generateId(),
                data: { users: n },
            });
    });

    socket.on('mouse-location', (location: { x: number; y: number }) => {
        socket['mouse-location'] = location;
    });

    socket.on(
        'device-orientation',
        (orientation: { x: number; y: number; z: number; w: number }) => {
            socket['device-orientation'] = orientation;
        }
    );
});

app.get('/', async (req, res) => {
    console.log('hello');
    res.send('OK');
});

app.get('/room', async (req, res) => {
    const rooms: Set<string>[] = [];

    io.of('/admin').sockets.forEach((socket) => {
        rooms.push(socket.rooms);
    });

    const result = rooms.flatMap((room) => {
        return [...room];
    });

    res.send(result);
});

setInterval(async () => {
    io.of('/user').sockets.forEach((socket) => {
        if (socket['mouse-location']) {
            io.of('/admin')
                .to([...socket.rooms.values()])
                .emit('mouse-location', {
                    id: generateId(),
                    data: socket['mouse-location'],
                });
        }

        if (socket['device-orientation']) {
            io.of('/admin')
                .to([...socket.rooms.values()])
                .emit('device-orientation', {
                    id: generateId(),
                    data: socket['device-orientation'],
                });
        }
    });
}, 16);

httpServer.listen(3001);
