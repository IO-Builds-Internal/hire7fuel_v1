const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

try {
  const content = fs.readFileSync(path.join(__dirname, '../views/admin/jobs.ejs'), 'utf8');
  ejs.compile(content);
  console.log("Success! EJS compiles perfectly.");
} catch (err) {
  console.error("EJS Compile Error:", err);
}
