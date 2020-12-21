
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomString = () => {
    return Math.random().toString(36).substring(7);
}

export default {
    getRandomInt, getRandomString
};