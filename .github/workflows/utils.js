const jaiVersion = async () => {
  // currently this is a bug in jai so we hardcode it       
  let jaiVersionOutput = 'Version: beta 0.1.092, built on 4 August 2024.';
  /*
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
  await exec.exec('jai', [], options);
  */
  

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

const pull_request_template = `
## General

- [x] I've looked for similar bugs
- [x] This bug fits into a single file
- [{already_reported}] I've already reported the bug to Jon

## Related Issues
Closes: #{issue_number}

## Bug Type
#### What type of bug is this? Delete the others.
- {bug_type}

## Categorization
#### What category does this bug belong to the most / What feature triggered the bug? Delete the others.
- {categories}

## Bug Description
#### Please fill this out if it is a more complicated bug.

{description}

## Workaround
#### If you have a workaround, please share it here.

{workaround}

## Short Code Snippet
#### Please put your code to reproduce the bug here. Only use it if it is a short bug(one file).

\`\`\`c
{code}
\`\`\`
`

module.exports = {
  jaiVersion,
  prTemplate: pull_request_template,
  format
}