const fs = require('fs');
const path = require('path');
const { tools } = require('../bin/lib/ai/interface');

const schema = tools.map(tool => ({
    type: "function",
    function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
    }
}));

const outputPath = path.resolve(__dirname, '../bin/tools-schema.json');
fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

console.log(`✅ Generated OpenAI-compatible tool schemas at: ${outputPath}`);
console.log(`Total tools: ${tools.length}`);
