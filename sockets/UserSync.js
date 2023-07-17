const SocketListener = require("./SocketListener.js");

const crypto = require('crypto');

class UserSync extends SocketListener {
    constructor(app) {
        super(app);
    }

    async register(user_id) {
        let token = crypto.randomBytes(24).toString("base64");

        await this.insert({
            table: "session",
            keys: [
                "user_id",
                "token"
            ],
            values: [
                user_id,
                token
            ]
        });

        return token;
    }

    async unregister(user_id, token) {
        await this.delete({
            from: "session",
            where: {
                keys: [
                    "user_id",
                    "token"
                ],
                values: [
                    user_id,
                    token
                ],
                op: ["AND"]
            }
        });
    }
}

module.exports = UserSync;