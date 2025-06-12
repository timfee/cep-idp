require('ts-node/register');

const { WorkflowSchema } = require('../app/lib/workflow/types');
const workflow = require('../workflow.json');

try {
  WorkflowSchema.parse(workflow);
  console.log('workflow.json is valid');
} catch (err) {
  console.error('workflow.json failed validation');
  console.error(err);
  process.exit(1);
}
