module.exports = async ({github, context, core}) => {
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
  
  console.log(jaiVersionOutput);

  const versionMatch = jaiVersionOutput.match(/beta \d+\.\d+\.\d+/);
  const version = versionMatch ? versionMatch[0].replace(/\s+/g, '-') : 'VersionNotFound';

  console.log(`Parsed Version: ${version}`);
}
