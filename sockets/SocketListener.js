const HashMap = require("hashmap");

const priority = [
    "SIX_SIX",
    "FIVE_FIVE",
    "FOUR_FOUR",
    "THREE_THREE",
    "TWO_TWO",
    "ONE_ONE",
    "ZERO_ZERO",
    "FIVE_SIX",
    "FOUR_SIX",
    "THREE_SIX",
    "FOUR_FIVE",
    "THREE_FIVE",
    "TWO_SIX",
    "TWO_FIVE",
    "ONE_SIX",
    "THREE_FOUR",
    "ZERO_SIX",
    "ONE_FIVE",
    "TWO_FOUR",
    "TWO_THREE",
    "ZERO_FIVE",
    "ONE_FOUR",
    "ZERO_FOUR",
    "ONE_THREE",
    "ZERO_THREE",
    "ONE_TWO",
    "ZERO_TWO",
    "ZERO_ONE"
];

const indexes = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"];

const contains = (array, element) => {
    return array.indexOf(element) != -1;
}

const getTopEnd = (table) => {
    if (table.length == 0) return -1;
    return table[0].getEnd();
}

const getBottomEnd = (table) => {
    if (table.length == 0) return -1;
    let lastPiece = table[table.length - 1];
    return lastPiece.isMiddle() ? lastPiece.getOtherEnd() : lastPiece.getEnd();
}

const possible = (table, pieces) => {
    let top = getTopEnd(table);
    let bottom = getBottomEnd(table);

    let res = []
    for (let i = 0; i < pieces.length; i++) {
        let p = pieces[i];
        let n0 = indexes.indexOf(p.split("_")[0])
        let n1 = indexes.indexOf(p.split("_")[1])
        if (
            n0 == top || n0 == bottom ||
            n1 == top || n1 == bottom) {
            res.push(p);
        }
    }

    return res;
}

const remove = (array, element) => {
    array.splice(array.indexOf(element), 1);
}

const shuffle = (array) => {
    var copy = [], n = array.length, i;

    while (n) {
        i = Math.floor(Math.random() * n--);
        copy.push(array.splice(i, 1)[0]);
    }

    return copy;
}

const pack = () => {
    let copy = [...priority];
    return shuffle(copy);
}

class SocketListener {
    constructor(app) {
        this.app = app;
        this.sockets = new HashMap();
        this.tokens = new HashMap();
        this.online = new HashMap();
        this.onlineRev = new HashMap();
        this.games = new HashMap();
    }

    addSocket(socket, token, user_id) {
        this.sockets.set(token, socket);
        this.tokens.set(socket, token);

        this.onlineRev.set(socket, user_id);

        let onlineSockets = this.online.get(user_id);

        if (!onlineSockets) {
            onlineSockets = [];
            this.online.set(user_id, onlineSockets);
        }

        let exists = false;
        for (let i = 0; i < onlineSockets.length; i++) {
            if (onlineSockets[i] === socket) exists = true;
        }
        if (!exists) onlineSockets.push(socket);

        console.log(JSON.stringify(this.online));

        setTimeout(() => {
            this.notify(user_id, { online: true })
        }, 1000);
    }

    removeSocket(socket) {
        let user = this.onlineRev.get(socket);
        if (user) {
            this.games.forEach((v, k) => {
                if (v.host == user) {
                    this.endGame(v.id);
                } else {
                    for (let i = 0; i < 4; i++) {
                        if (v.players[i] == user) {
                            this.leave(user, v.id);
                        }
                    }
                }
            });
        }

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
        let user = this.onlineRev.get(socket);
        if (user) {
            let value = this.online.get(user);
            for (let j = 0; j < value.length; j++) {
                if (socket === value[j]) {
                    value.splice(j, 1);

                    if (value.length == 0) {
                        this.online.delete(user);
                        this.notify(user, { online: false })
                    }

                    console.log(JSON.stringify(this.online));
                    return;
                }
            }
        }
        this.onlineRev.delete(socket);
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
        while (this.getGame(room_id)) {
            room_id = this.app.random.number(6);
        }

        let game = {
            id: room_id,
            state: "init",
            host: user_id,
            winner: -1,
            players: [
                user_id,
                -1,
                -1,
                -1
            ],
            stock: [],
            hands: [[], [], [], []],
            table: []
        }

        this.games.set(room_id, game);

        return game;
    }

    endGame(room) {
        let game = this.getGame(room);
        if (!game) return false;

        game.players.forEach(id => {
            this.emit(id, "end", { game });
        })

        this.games.delete(room);

        return true;
    }

    invite(from, to, room) {
        let game = this.getGame(room);
        if (!game || game.state !== "init") return false;

        this.emit(to, "invite", { from, game });
        return true;
    }

    join(user_id, room) {
        let game = this.getGame(room);
        if (!game || game.state !== "init") return false;

        let success = false;
        for (let i = 0; i < 4; i++) {
            if (game.players[i] == -1) {
                game.players[i] = user_id;
                success = true;
                break;
            }
        }

        if (success) {
            game.players.forEach(id => {
                this.emit(id, "join", { user_id, game });
            })
            return true;
        } else {
            return false;
        }
    }

    leave(user_id, room) {
        let game = this.getGame(room);
        if (!game || game.state !== "init") return false;

        let success = false;
        for (let i = 0; i < 4; i++) {
            if (game.players[i] == user_id) {
                game.players[i] = -1;
                success = true;
                break;
            }
        }

        if (success) {
            for (let i = 0; i < 4; i++) {
                let p1 = game.players[i];
                for (let j = i + 1; j < 4; j++) {
                    let p2 = game.players[j];

                    if (p1 == -1 && p2 != -1) {
                        game.players[i] = game.players[j];
                        game.players[i] = game.players[j];
                        game.players[j] = -1;
                        break;
                    }
                }
            }

            game.players.forEach(id => {
                this.emit(id, "leave", { user_id, game });
            })
            if (user_id != game.host) {
                this.emit(user_id, "kicked", { game });
            }
            return true;
        } else {
            return false;
        }
    }

    swap(room, i1, i2) {
        let game = this.getGame(room);
        if (!game || game.state !== "init") return false;

        let p1 = game.players[i1];
        let p2 = game.players[i2];

        game.players[i1] = p2;
        game.players[i2] = p1;

        game.players.forEach(id => {
            if (id != game.host)
                this.emit(id, "swap", { i1, i2, game });
        })

        return true;
    }

    begin(room) {
        let game = this.getGame(room);
        if (!game || game.state !== "init") return false;

        game.state = "going";

        game.stock = pack();

        game.players.forEach(id => {
            this.emit(id, "begin", { game });
        })
        return true;
    }

    deal(room) {
        let game = this.getGame(room);
        if (!game || game.state !== "going") return false;

        for (let i in game.players) {
            let player = game.players[i];
            if (player != -1) {
                let toAdd = [];
                for (let j = 0; j < 7; j++) {
                    let p = game.stock[0];
                    game.stock.splice(0, 1);
                    toAdd.push(p);
                    game.hands[i].push(p);
                }
                game.players.forEach(id => {
                    this.emit(id, "deal", { player, toAdd, stock: game.stock.length });
                })
            }
        }

        let turn = game.winner;
        if (turn == -1) {
            for (let i = 0; i < priority.length && turn == -1; i++) {
                let p = priority[i];
                for (let j = 0; j < 4 && turn == -1; j++) {
                    let hand = game.hands[j];
                    let has = contains(hand, p);
                    if (has) {
                        turn = game.players[j];
                    }
                }
            }
        }

        if (turn != -1) {
            game.players.forEach(id => {
                this.emit(id, "turn", { turn });
            })
            return true;
        }

        return false;
    }

    play(room, user, move) {
        let game = this.getGame(room);
        if (!game || game.state !== "going") return false;

        for (let i = 0; i < 4; i++) {
            let player = game.players[i];
            if (player == user) {
                remove(game.hands[i], move.played.piece);

                game.players.forEach(id => {
                    this.emit(id, "play", { player: user, move });
                })

                let piece = move.played;

                piece.getN0 = () => {
                    return indexes.indexOf(piece.piece.split("_")[0]);
                }

                piece.getN1 = () => {
                    return indexes.indexOf(piece.piece.split("_")[1]);
                }

                piece.isFlipped = () => {
                    return piece.rotation === "FLIPPED";
                }

                piece.isMiddle = () => {
                    return piece.rotation === "BOTH";
                }

                piece.getEnd = () => {
                    return piece.isFlipped() ? piece.getN1() : piece.getN0();
                }

                piece.getOtherEnd = () => {
                    return piece.isFlipped() ? piece.getN0() : piece.getN1();
                }

                if (move.side === "TOP") {
                    game.table.splice(0, 0, move.played);
                } else {
                    game.table.push(move.played);
                }

                let ni = i + 1;
                if (ni >= 4 || game.players[ni] == -1) {
                    ni = 0;
                }

                this.turn(game, ni);

                return true;
            }
        }

        return false;
    }

    turn(game, ni) {
        let np = game.players[ni];
        let hand = game.hands[ni];
        let poss = possible(game.table, hand);
        let toAdd = [];
        while (poss.length == 0 && game.stock.length != 0) {
            let p = game.stock[0];
            game.stock.splice(0, 1);
            toAdd.push(p);
            hand.push(p);
            poss = possible(game.table, hand);
        }

        if (toAdd.length != 0) {
            game.players.forEach(id => {
                this.emit(id, "deal", { player: np, toAdd, stock: game.stock.length });
            })
        }

        game.players.forEach(id => {
            this.emit(id, "turn", { turn: np });
        })

        if (poss.length == 0 && game.stock.length == 0) {
            game.players.forEach(id => {
                this.emit(id, "pass", { player: np });
            })
            setTimeout(() => {
                ni = ni + 1;
                if (ni >= 4 || game.players[ni] == -1) {
                    ni = 0;
                }
                this.turn(game, ni);
            }, 1500)
        }
    }

    async notify(user_id, change) {
        this.emit(user_id, "user_sync", change);
        this.notifyFriends(user_id, "user_change", change);
    }

    async friendState(sender, receiver, state) {
        this.emit(sender, "request_" + state, { sender, receiver });
        this.emit(receiver, "request_" + state, { sender, receiver });
    }

    async emit(user_id, event, data) {
        if (user_id < 0) return;
        let sockets = this.getSockets(user_id);
        if (sockets)
            sockets.forEach(socket => {
                this.to(socket).emit(event, data);
            });
    }

    async notifyFriends(user_id, event, data) {
        data.user_id = parseInt(user_id);

        let friends = await this.select({
            select: ["sender", "receiver"],
            from: ["friend"],
            where: {
                keys: ["accepted", ["sender", "receiver"]],
                values: [true, user_id, user_id],
                op: ["AND", "OR"]
            }
        })

        let ids = [];

        friends.forEach(friend => {
            ids.push(friend.sender == user_id ? friend.receiver : friend.sender);
        });

        ids.forEach(id => {
            this.emit(id, event, data);
        })
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