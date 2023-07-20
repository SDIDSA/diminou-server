const Route = require("./route.js");
const Form = require('formidable').IncomingForm;
const sharp = require("sharp");

const success = { status: "success" };
const bad_session = { status: "error", err: "bad_session" };
const bad_room = { status: "error", err: "bad_room" };
class Session extends Route {
    constructor(app) {
        super(app, "/session");

        this.addEntry("getUser", async(req, res, user_id) => {
            res.send({ user : user_id });
        });

        this.addEntry("getForId", async (req, res, user_id) => {
            let type = req.body.type;
            let bean = (await this.select({
                select: ["*"],
                from: [type],
                where: {
                    keys: ["id"],
                    values: [req.body.id]
                }
            }))[0];

            if(bean.password != undefined) {
                bean.password = "- UNAUTHORIZED ACCESS -"
            }

            if(type.toLowerCase() === "user") {
                if(user_id == bean.id) {
                    bean.friend = "self";
                } else {
                    let other_id = bean.id;
                    let friend = await this.select({
                        select : ["*"],
                        from: ["friend"],
                        where: {
                            keys : [["sender", "receiver"], ["sender", "receiver"]],
                            values : [other_id, user_id, user_id, other_id],
                            op : ["AND", "OR", "AND"]
                        }
                    });
                    if(friend.length == 0) {
                        bean.friend = "none";
                    }else if(!friend[0].accepted) {
                        if(friend[0].sender == user_id) {
                            bean.friend = "pending_sent";
                        }else {
                            bean.friend = "pending_received";
                        }
                    }else {
                        bean.friend = "friend";
                    }
                }
            }

            res.send(bean);
        });

        this.addEntry("logout", async(req, res, user_id, token) => {
            await this.app.user_sync.unregister(user_id, token);
            this.app.user_sync.removeToken(token);

            res.send(success);
        })

        this.addEntry("changeUsername", async (req, res, user_id) => {
            if(req.body.username.length < 5) {
                res.send({err : "un_short"});
                return;
            }
            try {
                let count = await this.update({
                    table: "user",
                    cols: ["username"],
                    values: [req.body.username],
                    where: {
                        keys: ["id"],
                        values: [user_id]
                    }
                });
    
                if (count == 1) {
                    res.send(success);
                    this.app.user_sync.notify(user_id, { username : req.body.username });
                } else {
                    res.send({err : "op_failed"});
                }
            }catch(err) {
                res.send({err : "un_taken"});
            }
        });

        this.addEntry("changeAvatar", async (req, res, user_id) => {
            var form = new Form();
            form.parse(req, async(err, fields, files) => {

                let avatar = files.avatar;
                let resized = avatar.filepath + "_resized.jpg";

                // resize/crop icon
                await sharp(avatar.filepath)
                    .resize(512, 512, {
                        kernel: sharp.kernel.lanczos3,
                        fit: 'cover',
                        position: 'center'
                    }).toFile(resized);

                // upload icon to cloudinary
                let url = await this.app.media.uploadFile(resized, {
                    public_id: "avatar_" + this.app.random.random(16)
                });

                let count = await this.update({
                    table: "user",
                    cols: ["avatar"],
                    values: [url],
                    where: {
                        keys: ["id"],
                        values: [user_id]
                    }
                });

                if (count == 1) {
                    res.send(success);
                    this.app.user_sync.notify(user_id, { avatar : url });
                } else {
                    res.send({err : true});
                }
            });
        })

        
        this.addEntry("getFriends", async (req, res, user_id) => {
            let friends = await this.select({
                select : ["sender", "receiver"],
                from: ["friend"],
                where: {
                    keys : ["accepted", ["sender", "receiver"]],
                    values : [true, user_id, user_id],
                    op : ["AND", "OR"]
                }
            })
            let toSend = [];
            friends.forEach(friend => {
                toSend.push(friend.sender === user_id ? friend.receiver : friend.sender);
            });

            res.send({friends : toSend});
        });
        
        this.addEntry("getRequests", async (req, res, user_id) => {
            let friends = await this.select({
                select : ["sender"],
                from: ["friend"],
                where: {
                    keys : ["accepted", "receiver"],
                    values : [false, user_id],
                    op : ["AND"]
                }
            })

            res.send({requests : friends.map(u => u.sender)});
        });
        
        this.addEntry("getSentRequests", async (req, res, user_id) => {
            let friends = await this.select({
                select : ["receiver"],
                from: ["friend"],
                where: {
                    keys : ["accepted", "sender"],
                    values : [false, user_id],
                    op : ["AND"]
                }
            })

            res.send({requests : friends.map(u => u.receiver)});
        });
        
        this.addEntry("getForUsername", async (req, res, user_id) => {
            let matches = await this.select({
                select : ["id"],
                from: ["user"],
                where: {
                    keys : [{like : "username"}, {not : "id"}],
                    values : [{like : req.body.username}, user_id],
                    op: ["AND"]
                },
                limit: 4
            })

            res.send({matches : matches.map(u => u.id)});
        });

        this.addEntry("sendRequest", async (req, res, user_id) => {
            let other_id = parseInt(req.body.user_id);
            let count = await this.insert({
                table: "friend",
                keys: [
                    "sender",
                    "receiver"
                ],
                values: [
                    user_id,
                    req.body.user_id,
                ]
            });

            if(count == 1) {
                this.app.user_sync.friendState(user_id, other_id, "sent");
                res.send({success});
            } else {
                res.send({err: "failed"})
            }
        });

        this.addEntry("cancelRequest", async (req, res, user_id) => {
            let other_id = parseInt(req.body.user_id);
            let count = await this.delete({
                from: "friend",
                where : {
                    keys: [[["sender", "receiver"], ["sender", "receiver"]], "accepted"],
                    values: [user_id, other_id, other_id, user_id, false],
                    op: ["AND", "OR", "AND", "AND"]
                }
            });

            if(count == 1) {
                this.app.user_sync.friendState(user_id, other_id, "canceled");
                res.send({success});
            } else {
                res.send({err: "failed"})
            }
        });

        this.addEntry("acceptRequest", async (req, res, user_id) => {
            let other_id = parseInt(req.body.user_id);
            let count = await this.update({
                table: "friend",
                cols: ["accepted"],
                values: [true],
                where: {
                    keys: ["sender", "receiver", "accepted"],
                    values: [other_id, user_id, false],
                    op: ["AND", "AND"]
                }
            });

            if(count == 1) {
                this.app.user_sync.friendState(user_id, other_id, "accepted");
                res.send({success});
            } else {
                res.send({err: "failed"})
            }
        });

        this.addEntry("createGame", (req, res, user_id) => {
            let game = this.app.user_sync.createGame(user_id);
            res.send({game});
        });

        this.addEntry("endGame", (req, res) => {
            let room_id = req.body.room_id;
            
            if(this.app.user_sync.endGame(room_id)) {
                res.send(success);
            }else {
                res.send(bad_room);
            }
        })

        this.addEntry("invite", (req, res, user_id) => {
            let room_id = req.body.room_id;
            let who = req.body.who;
            
            if(this.app.user_sync.invite(user_id, who, room_id)) {
                res.send(success);
            }else {
                res.send(bad_room);
            }
        });

        this.addEntry("join", (req, res, user_id) => {
            let room_id = req.body.room_id;
            
            if(this.app.user_sync.join(user_id, room_id)) {
                res.send(success);
            }else {
                res.send(bad_room);
            }
        });

        this.addEntry("leave", (req, res) => {
            let room_id = req.body.room_id;
            let user_id = req.body.user_id;
            
            if(this.app.user_sync.leave(user_id, room_id)) {
                res.send(success);
            }else {
                res.send(bad_room);
            }
        });

        this.addEntry("swap", async (req, res) => {
            let room_id = req.body.room_id;
            let i1 = req.body.i1;
            let i2 = req.body.i2;
            
            if(this.app.user_sync.swap(room_id, i1, i2)) {
                res.send(success);
            }else {
                res.send(bad_room);
            }
        })
    }

    addEntry(name, handler) {
        super.addEntry(name, async(req, res) => {
            let token = req.header("token");
            try {
                let user_id = (await this.select({
                    select: ["user_id"],
                    from: ["session"],
                    where: {
                        keys: ["token"],
                        values: [token]
                    }
                }))[0].user_id;

                handler(req, res, user_id, token);
            } catch (err) {
                res.send(bad_session);
            }
        });
    }

}

module.exports = Session;