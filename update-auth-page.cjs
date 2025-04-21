const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(process.cwd(), 'client/src/pages/auth-page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the first occurrence (Login Password field - line 479)
content = content.replace(
  '<FormLabel className="flex items-center">\n                              Password <span className="text-red-500 ml-1">*</span>\n                            </FormLabel>',
  '<FormLabel>\n                              Password\n                            </FormLabel>'
);

// Replace the second occurrence (Forgot Password Email field - line 580)
content = content.replace(
  '<FormLabel className="flex items-center">\n                              Email <span className="text-red-500 ml-1">*</span>\n                            </FormLabel>',
  '<FormLabel>\n                              Email\n                            </FormLabel>'
);

// Replace the third occurrence (Reset New Password field - line 647)
content = content.replace(
  '<FormLabel className="flex items-center">\n                                New Password <span className="text-red-500 ml-1">*</span>\n                              </FormLabel>',
  '<FormLabel>\n                                New Password\n                              </FormLabel>'
);

// Replace the fourth occurrence (Reset Confirm New Password field - line 686)
content = content.replace(
  '<FormLabel className="flex items-center">\n                                Confirm New Password <span className="text-red-500 ml-1">*</span>\n                              </FormLabel>',
  '<FormLabel>\n                                Confirm New Password\n                              </FormLabel>'
);

// Write the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Modified auth-page.tsx successfully');