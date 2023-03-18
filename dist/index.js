"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const https_1 = require("https");
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, https_1.createServer)({
    key: fs_1.default.readFileSync('localhost.key', 'utf8'),
    cert: fs_1.default.readFileSync('localhost.crt', 'utf8'),
}, app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        credentials: true,
    },
});
const generateId = () => {
    return (0, uuid_1.v4)();
};
io.of('/admin').on('connection', (socket) => {
    console.log('a admin connected');
    const roomId = generateId();
    socket.join(roomId);
    socket.emit('room-id', { id: generateId(), data: { roomId } });
});
io.of('/user').on('connection', (socket) => {
    console.log('a user connected');
    socket.on('set-room', (roomData) => __awaiter(void 0, void 0, void 0, function* () {
        const { id } = roomData;
        yield socket.rooms.forEach((room) => __awaiter(void 0, void 0, void 0, function* () {
            yield socket.leave(room);
        }));
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
    }));
    socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
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
    }));
    socket.on('mouse-location', (location) => {
        socket['mouse-location'] = location;
    });
    socket.on('device-orientation', (orientation) => {
        socket['device-orientation'] = orientation;
    });
});
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('hello');
    res.send('OK');
}));
app.get('/room', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rooms = [];
    io.of('/admin').sockets.forEach((socket) => {
        rooms.push(socket.rooms);
    });
    const result = rooms.flatMap((room) => {
        return [...room];
    });
    res.send(result);
}));
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
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
}), 16);
httpServer.listen(3001);
//# sourceMappingURL=index.js.map