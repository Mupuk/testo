const jaiVersion = async ({ exec }) => {

  const fs = require('fs');
  try {
    const data = fs.readFileSync('jai_version_workaround.jai', 'utf8');
    console.log("File content:");
    console.log(data);
  } catch (err) {
      console.error("Error reading file:", err);
  }

       
  let jaiVersionOutput = '';

  const options = {};
  options.silent = false;
  options.ignoreReturnCode = true;
  options.listeners = {
    stdout: (data) => {
      jaiVersionOutput += data.toString();
    },
    stderr: (data) => {
      jaiVersionOutput += data.toString();
    },
    stdline: (string) => {
      jaiVersionOutput += string;
    },
    errline: (string) => {
      jaiVersionOutput += string;
    }
  };

  // Replace 'your-executable' with the command you want to run
  // currently this is a bug in jai so we need the workaround script
  await exec.exec('jai jai_version_workaround.jai', [], options);

  const versionMatch = jaiVersionOutput.match(/beta \d+\.\d+\.\d+/);
  const version = versionMatch ? versionMatch[0].replace(/\s+/g, '-') : 'VersionNotFound';

  return version;
}

// format a string that replaces '{xxx}' with object properties of name 'xxx'
//
// Example:
// 
// const template = 'Hello, {name}! Welcome to {place}.';
// const params = {
//   name: 'Alice',
//   place: 'Wonderland'
// };
//
// const result = format(template, params);
// console.log(result); // Outputs: "Hello, Alice! Welcome to Wonderland."
function format(template, params) {
  return template.replace(/\{(.*?)}/g, (match, p1) => params[p1.trim()] || '');
}

module.exports = {
  jaiVersion,
  format
}