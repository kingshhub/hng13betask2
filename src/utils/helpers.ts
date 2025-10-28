export const generateRandomGdpMultiplier = (): number => {
    return Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
};
