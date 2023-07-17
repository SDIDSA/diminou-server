const HashMap = require("hashmap");

class SocketListener {
    constructor(app) {
        this.app = app;
        this.sockets = new HashMap();
        this.tokens = new HashMap();
        this.online = new HashMap();
    }

    addSocket(socket, token, user_id) {
        this.sockets.set(token, socket);
        this.tokens.set(socket, token);

        let onlineSockets = this.online.get(user_id);

        if (!onlineSockets) {
            onlineSockets = [];
            this.online.set(user_id, onlineSockets);
        }

        onlineSockets.push(socket);
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