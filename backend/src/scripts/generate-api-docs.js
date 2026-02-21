#!/usr/bin/env node

/**
 * Generate API Documentation from Swagger Spec
 *
 * This script extracts the Swagger/OpenAPI spec and generates
 * a markdown file for the documentation.
 */

const fs = require('fs');
const path = require('path');

// Import the swagger spec from compiled dist folder
const { swaggerSpec } = require('../../dist/swagger');

const OUTPUT_FILE = path.join(__dirname, '../../../Documentation/API/API_ARCHITECTURE.md');

/**
 * Convert Swagger spec to Markdown
 */
function generateMarkdown(spec) {
  let markdown = `# API Architecture\n\n`;
  markdown += `> **Auto-generated from Swagger/OpenAPI specification**\n`;
  markdown += `> Last updated: ${new Date().toISOString()}\n\n`;

  // API Info
  markdown += `## ${spec.info.title}\n\n`;
  markdown += `**Version**: ${spec.info.version}\n\n`;
  if (spec.info.description) {
    markdown += `${spec.info.description}\n\n`;
  }

  // Base URL
  if (spec.servers && spec.servers.length > 0) {
    markdown += `## Base URL\n\n`;
    spec.servers.forEach(server => {
      markdown += `- **${server.description || 'Server'}**: \`${server.url}\`\n`;
    });
    markdown += `\n`;
  }

  // Authentication
  if (spec.components && spec.components.securitySchemes) {
    markdown += `## Authentication\n\n`;
    Object.entries(spec.components.securitySchemes).forEach(([name, scheme]) => {
      markdown += `### ${name}\n\n`;
      markdown += `- **Type**: ${scheme.type}\n`;
      if (scheme.scheme) markdown += `- **Scheme**: ${scheme.scheme}\n`;
      if (scheme.bearerFormat) markdown += `- **Format**: ${scheme.bearerFormat}\n`;
      if (scheme.description) markdown += `- **Description**: ${scheme.description}\n`;
      markdown += `\n`;
    });
  }

  // Group endpoints by tags
  const endpointsByTag = {};

  if (spec.paths) {
    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpoint]) => {
        const tag = endpoint.tags ? endpoint.tags[0] : 'Other';
        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }
        endpointsByTag[tag].push({
          path,
          method: method.toUpperCase(),
          ...endpoint
        });
      });
    });
  }

  // Generate endpoint documentation by tag
  markdown += `## Endpoints\n\n`;

  Object.entries(endpointsByTag).sort().forEach(([tag, endpoints]) => {
    markdown += `### ${tag}\n\n`;

    endpoints.forEach(endpoint => {
      const { path, method, summary, description, parameters, requestBody, responses, security } = endpoint;

      markdown += `#### ${method} ${path}\n\n`;

      if (summary) {
        markdown += `**${summary}**\n\n`;
      }

      if (description) {
        markdown += `${description}\n\n`;
      }

      // Authentication required
      if (security && security.length > 0) {
        markdown += `🔒 **Authentication Required**: Yes\n\n`;
      }

      // Parameters
      if (parameters && parameters.length > 0) {
        markdown += `**Parameters:**\n\n`;
        markdown += `| Name | In | Type | Required | Description |\n`;
        markdown += `|------|-------|------|----------|-------------|\n`;
        parameters.forEach(param => {
          const type = param.schema?.type || 'string';
          const required = param.required ? '✅' : '❌';
          markdown += `| \`${param.name}\` | ${param.in} | ${type} | ${required} | ${param.description || '-'} |\n`;
        });
        markdown += `\n`;
      }

      // Request Body
      if (requestBody) {
        markdown += `**Request Body:**\n\n`;
        const content = requestBody.content;
        if (content) {
          Object.entries(content).forEach(([contentType, body]) => {
            markdown += `Content-Type: \`${contentType}\`\n\n`;
            if (body.schema) {
              markdown += `\`\`\`json\n`;
              markdown += JSON.stringify(body.schema, null, 2);
              markdown += `\n\`\`\`\n\n`;
            }
          });
        }
      }

      // Responses
      if (responses) {
        markdown += `**Responses:**\n\n`;
        Object.entries(responses).forEach(([code, response]) => {
          markdown += `- **${code}**: ${response.description || 'Response'}\n`;
          if (response.content) {
            Object.entries(response.content).forEach(([contentType, body]) => {
              if (body.schema) {
                markdown += `  \`\`\`json\n`;
                markdown += `  ${JSON.stringify(body.schema, null, 2).split('\n').join('\n  ')}\n`;
                markdown += `  \`\`\`\n`;
              }
            });
          }
        });
        markdown += `\n`;
      }

      markdown += `---\n\n`;
    });
  });

  // Schemas/Models
  if (spec.components && spec.components.schemas) {
    markdown += `## Data Models\n\n`;
    Object.entries(spec.components.schemas).forEach(([name, schema]) => {
      markdown += `### ${name}\n\n`;
      if (schema.description) {
        markdown += `${schema.description}\n\n`;
      }
      markdown += `\`\`\`json\n`;
      markdown += JSON.stringify(schema, null, 2);
      markdown += `\n\`\`\`\n\n`;
    });
  }

  // Footer
  markdown += `---\n\n`;
  markdown += `## Documentation\n\n`;
  markdown += `This documentation is automatically generated from the OpenAPI/Swagger specification.\n\n`;
  markdown += `- **Interactive API Docs**: Visit \`http://localhost:3001/api/docs\` when the server is running\n`;
  markdown += `- **Swagger Spec**: Available at \`http://localhost:3001/api/docs.json\`\n\n`;
  markdown += `To regenerate this documentation:\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `cd backend\n`;
  markdown += `npm run build\n`;
  markdown += `npm run generate-docs\n`;
  markdown += `\`\`\`\n`;

  return markdown;
}

// Main execution
try {
  console.log('🚀 Generating API documentation from Swagger spec...\n');

  if (!swaggerSpec) {
    console.error('❌ Failed to load Swagger specification');
    console.error('   Make sure the backend is built: npm run build');
    process.exit(1);
  }

  const markdown = generateMarkdown(swaggerSpec);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');

  console.log('✅ API documentation generated successfully!');
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log(`   Size: ${(markdown.length / 1024).toFixed(2)} KB`);
  console.log(`   Endpoints: ${Object.keys(swaggerSpec.paths || {}).length}`);
  console.log('');
  console.log('📖 View the documentation:');
  console.log('   File: Documentation/API/API_ARCHITECTURE.md');
  console.log('   Docs viewer: http://localhost:3000/docs?file=API/API_ARCHITECTURE.md');
  console.log('');

} catch (error) {
  console.error('❌ Error generating documentation:', error.message);
  console.error(error);
  process.exit(1);
}

