const Route = require("./route.js");

class Auth extends Route {
    async checkUsername(username) {
        return (await this.select({
            select: ["*"],
            from: ["user"],
            where: {
                keys: ["username"],
                values: [username]
            }
        })).length > 0;
    }

    async generateUniqueUsername(name) {
        let username = name;

        for(let i = 0; i < 9999; i++) {
            if(!(await this.checkUsername(username))) {
                return username;
            }else {
                username = name + i;
            }
        }
    }

    constructor(app) {
        super(app, "/auth");

        this.addEntry("googleLogIn", async (req, res) => {
            let acc = await this.select({
                select : ["*"],
                from : ["user"],
                where : {
                    keys : ["email"],
                    values : [req.body.email]
                }
            })
            if(acc.length == 0) {
                res.send({
                    empty : true
                });
            }else {
                let user = acc[0];
                let token = await this.app.user_sync.register(user.id);
                res.send({
                    user : user.id, token
                });
            }
        })

        this.addEntry("googleSignUp", async (req, res) => {
            let un = await this.generateUniqueUsername(req.body.name);
            let avatar = await app.media.generateAvatar(un);
            let inserted = await this.insert({
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

            let user = inserted[0];
            let token = await this.app.user_sync.register(user.id);
            res.send({
                user : user.id, token
            })
        })

        this.addEntry('editUsername', async (req, res) => {
            
        });

        this.addEntry("deleteAccount", async (req, res) => {
        
        });
    }
}

module.exports = Auth;