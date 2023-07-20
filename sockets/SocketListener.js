const HashMap = require("hashmap");

class SocketListener {
    constructor(app) {
        this.app = app;
        this.sockets = new HashMap();
        this.tokens = new HashMap();
        this.online = new HashMap();
        this.games = new HashMap();
    }

    addSocket(socket, token, user_id) {
        this.sockets.set(token, socket);
        this.tokens.set(socket, token);

        let onlineSockets = this.online.get(user_id);

        if (!onlineSockets) {
            onlineSockets = [];
            this.online.set(user_id, onlineSockets);
        }

        let exists = false;
        for(let i = 0; i < onlineSockets.length; i++) {
            if(onlineSockets[i] === socket) exists = true;
        }
        if(!exists) onlineSockets.push(socket);
        
        console.log(JSON.stringify(this.online));

        this.notifyOthers(user_id, "user_change", { online: true })
    }

    removeSocket(socket) {
        this.sockets.delete(this.tokens.get(socket));
        this.tokens.delete(socket);

        this.removeOnline(socket);
    }

    removeToken(token) {
        let socket = this.sockets.get(token);

        this.tokens.delete(socket);
        this.sockets.delete(token);

        this.removeOnline(socket);
    }

    removeOnline(socket) {
        for (let i = 0; i < this.online.count(); i++) {
            let entry = this.online.entries()[i];
            let key = entry[0];
            let value = entry[1];

            for (let j = 0; j < value.length; j++) {
                if (socket === value[j]) {
                    value.splice(j, 1);

                    if (value.length == 0) {
                        this.online.delete(key);
                    }

                    console.log(JSON.stringify(this.online));

                    this.notifyOthers(key, "user_change", { online: false })
                    return;
                }
            }
        }
    }

    isOnline(user_id) {
        return this.online.has(user_id);
    }

    getSockets(user_id) {
        return this.online.get(user_id);
    }

    getSocket(token) {
        return this.sockets.get(token);
    }

    to(socket) {
        return this.app.io.to(socket);
    }

    getGame(room_id) {
        return this.games.get(room_id);
    }

    createGame(user_id) {
        let room_id = this.app.random.number(6);
        //make sure the room_id is unique
        while(this.getGame(room_id)) {
            room_id = this.app.random.number(6);
        }

        let game = {
            id: room_id,
            state : "init",
            host : user_id,
            players : [
                user_id,
                -1,
                -1,
                -1
            ]
        }

        this.games.set(room_id, game);

        return game;
    }

    endGame(room) {
        let game = this.getGame(room);
        if(!game) return false;

        game.players.forEach(id => {
            this.emit(id.toString(), "end", {game});
        })

        return true;
    }

    invite(from, to, room) {
        let game = this.getGame(room);
        if(!game || game.state !== "init") return false;

        this.emit(to.toString(), "invite", {from, game});
        return true;
    }

    join(user_id, room) {
        let game = this.getGame(room);
        if(!game || game.state !== "init") return false;

        let success = false;
        for(let i = 0; i < 4; i++) {
            if(game.players[i] == -1) {
                game.players[i] = user_id;
                success = true;
                break;
            }
        }

        if(success) {
            game.players.forEach(id => {
                this.emit(id.toString(), "join", {user_id, game});
            })
            return true;
        } else {
            return false;
        }
    }

    leave(user_id, room) {
        let game = this.getGame(room);
        if(!game) return false;

        let success = false;
        for(let i = 0; i < 4; i++) {
            if(game.players[i] == user_id) {
                game.players[i] = -1;
                success = true;
                break;
            }
        }

        if(success) {
            for(let i = 0; i < 4; i++){
                let p1 = game.players[i];
                for(let j = i + 1; j < 4; j++) {
                    let p2 = game.players[j];

                    if(p1 == -1 && p2 != -1) {
                        game.players[i] = game.players[j];
                        game.players[j] = -1;
                        break;
                    }
                }
            }

            console.log(game);
            game.players.forEach(id => {
                this.emit(id.toString(), "leave", {user_id, game});
            })
            if(user_id != game.host) {
                this.emit(user_id.toString(), "kicked", {game});
            }
            return true;
        } else {
            return false;
        }
    }

    swap(room, i1, i2) {
        let game = this.getGame(room);
        if(!game || game.state !== "init") return false;

        let p1 = game.players[i1];
        let p2 = game.players[i2];

        game.players[i1] = p2;
        game.players[i2] = p1;

        game.players.forEach(id => {
            if(id != game.host)
                this.emit(id.toString(), "swap", {i1, i2, game});
        })

        return true;
    }

    async notify(user_id, change) {
        this.emit(user_id.toString(), "user_sync", change);
    }

    async friendState(sender, receiver, state) {
        this.emit(sender.toString(), "request_" + state, {sender, receiver});
        this.emit(receiver.toString(), "request_" + state, {sender, receiver});
    }

    async emit(user_id, event, data) {
        let sockets = this.getSockets(user_id);
        if (sockets)
            sockets.forEach(socket => {
                console.log("sending "+event+" to " + user_id)
                this.to(socket).emit(event, data);
            });
    }

    async notifyOthers(user_id, event, data) {
        data.user_id = user_id;

        /*
        ids.forEach(user => {
            this.emit(user, event, data);
        })
        */
    }

    async select(data, schema) {
        return (await this.app.db.select(data, schema));
    }

    async delete(data) {
        return (await this.app.db.delete(data));
    }

    async insert(data) {
        await this.app.db.insert(data);
    }

    async update(data) {
        return (await this.app.db.update(data));
    }
}

module.exports = SocketListener;