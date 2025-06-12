import { teardownTestEnvironment } from './test-utils/testEnv';

export default async () => {
  await teardownTestEnvironment();
};
