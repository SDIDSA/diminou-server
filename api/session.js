const Route = require("./route.js");
const Form = require('formidable').IncomingForm;
const sharp = require("sharp");

const success = { status: "success" };
const bad_session = { status: "error", err: "bad_session" };
class Session extends Route {
    constructor(app) {
        super(app, "/session");

        this.addEntry("getUser", async(req, res, user_id) => {
            res.send({ user : user_id });
        });

        this.addEntry("getForId", async (req, res) => {
            let bean = (await this.select({
                select: ["*"],
                from: [req.body.type],
                where: {
                    keys: ["id"],
                    values: [req.body.id]
                }
            }))[0];

            if(bean.password != undefined) {
                bean.password = "- UNAUTHORIZED ACCESS -"
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
                    op : ["AND", ["OR"]]
                }
            })
            let toSend = [];
            friends.forEach(friend => {
                toSend.push(friend.sender === user_id ? friend.received : friend.sender);
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

            res.send({friends : friends.map(u => u.sender)});
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

            res.send({friends : friends.map(u => u.sender)});
        });
        
        this.addEntry("sendRequest", async (req, res, user_id) => {
            await this.insert({
                table: "user",
                keys: [
                    "username",
                    "email",
                    "avatar"
                ],
                values: [
                    un,
                    req.body.email,
                    avatar
                ]
            }, "*");

            res.send({friends : friends.map(u => u.sender)});
        });
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