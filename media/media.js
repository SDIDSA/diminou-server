let pfp_temp = "https://api.dicebear.com/6.x/notionists/png?seed={user_id}&size=512";

class Media {
    constructor() {
        this.cloudinary = require('cloudinary');
        this.cloudinary.config({
            cloud_name: 'mesa-clone',
            api_key: '139729568783577',
            api_secret: '7_rEAHSXpYRLD6_GABwMW3JQ-3A'
        });
    }

    async uploadRemote(remoteLink, name) {
        return new Promise((resolve, reject) => {
            this.cloudinary.v2.uploader.upload(remoteLink, {
                public_id: name
            }, (err, res) => {
                if (err) return reject(err);
                return resolve(res.url);
            })
        });
    }

    async deleteAsset(name) {
        return new Promise((resolve, reject) => {
            this.cloudinary.v2.uploader.destroy(name,
                (err, res) => {
                    if (err) return reject(err);
                    return resolve(res);
                })
        });
    }

    async uploadFile(path, options) {
        return new Promise((resolve, reject) => {
            this.cloudinary.v2.uploader.upload(path, options, (err, res) => {
                if (err) return reject(err);
                return resolve(res.url);
            })
        });
    }

    async generateAvatar(user_id) {
        let link = pfp_temp.replace("{user_id}", user_id);
        console.log(link);
        return await this.uploadRemote(link, "pfp_" + user_id);
    }
}

module.exports = Media;