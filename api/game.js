const AuthRoute = require("./authRoute");
const Session = require("./session");

const success = { status: "success" };
const bad_room = { status: "error", err: "bad_room" };
class Game extends AuthRoute {
    constructor(app) {
        super(app, "/game");

        this.addEntry("deal", async(req, res) => {
            let room_id = req.body.room_id;
            
            if(this.app.user_sync.deal(room_id)) {
                res.send(success);
            }else {
                res.send(bad_room);
            }
        });

        this.addEntry("play", async (req, res, user_id) => {
            let room_id = req.body.room_id;
            let move = req.body.move;

            if(this.app.user_sync.play(room_id, user_id, move)) {
                res.send(success);
            } else {
                res.send(bad_room);
            }
        })
    }
}

module.exports = Game;