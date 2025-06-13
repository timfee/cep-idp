import { teardownTestEnvironment } from "./test-utils/testEnv";

const globalTeardown = async () => {
  await teardownTestEnvironment();
};

export default globalTeardown;
