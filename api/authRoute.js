
const sharp = require("sharp");
const Route = require("./route");

const bad_session = { status: "error", err: "bad_session" };
class AuthRoute extends Route {
    constructor(app, name) {
        super(app, name);
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

module.exports = AuthRoute;