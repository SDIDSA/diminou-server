var chars = "abcdefghijklmnopqrstuvwxyz";
var veryRandom = chars + chars.toUpperCase();
var numbers = "0123456789";
chars += numbers;

veryRandom += numbers;

class Random {
    constructor() { }

    random(length) {
        let res = "";
        for (let i = 0; i < length; i++) {
            res += chars.charAt(parseInt(Math.random() * chars.length));
        }
        return res;
    }

    conf_code(length) {
        let res = "";
        for (let i = 0; i < length; i++) {
            res += numbers.charAt(parseInt(Math.random() * numbers.length));
        }
        return res;
    }

    phone_code(phone) {
        let code = "";

        let readIndex = phone.length - 1;
        let writeIndex = 1;
        while (code.length < 6) {
            let readDigit = phone.charAt(readIndex--);
            if (numbers.indexOf(readDigit) == -1) {
                continue;
            }

            let writeDigit = ((readDigit - (writeIndex++)) + 10) % 10;

            code += writeDigit;
        }

        return code;
    }

    veryRandom(length) {
        let res = "";
        for (let i = 0; i < length; i++) {
            res += veryRandom.charAt(parseInt(Math.random() * veryRandom.length));
        }
        return res;
    }
}

module.exports = Random;