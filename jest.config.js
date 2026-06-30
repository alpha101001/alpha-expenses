module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest',
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
};
