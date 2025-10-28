/**
 * Generates a random number between 1000 and 2000 (inclusive) for GDP calculation.
 * @returns A random integer.
 */
export const generateRandomGdpMultiplier = (): number => {
    return Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
};
