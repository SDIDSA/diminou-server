
const formatDate = d => {
    return adjust(d.getUTCDate(), 2) +
        adjust(d.getUTCMonth() + 1, 2) +
        adjust(d.getUTCFullYear(), 2) +
        adjust(d.getUTCHours(), 2) +
        adjust(d.getUTCMinutes(), 2) +
        adjust(d.getUTCSeconds(), 2);
}

const adjust = (val, length) => {
    let res = val + "";
    while (res.length < length) {
        res = "0" + res;
    }
    while (res.length > length) {
        res = res.substring(1);
    }
    return res;
}

class Route {
    constructor(app, path) {
        console.log("\nregistering route " + path);
        this.app = app;
        this.path = path;
    }

    addEntry(name, handler) {
        let ent = this.path + "/" + name;
        console.log("registering path  " + ent);

        this.app.post(ent, async (req, res) => {
            console.log(ent + " was called with " + JSON.stringify(req.body));
            handler(req, res);
        });
    }

    async select(data, schema) {
        return (await this.app.db.select(data, schema));
    }

    async delete(data, returning) {
        return (await this.app.db.delete(data, returning));
    }

    async insert(data, returning) {
        return await this.app.db.insert(data, returning);
    }

    async update(data) {
        return (await this.app.db.update(data));
    }

    formatDate(date) {
        return formatDate(date);
    }
}

module.exports = Route;