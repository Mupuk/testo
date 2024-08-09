const decrementVersionString = (version) =>  {
  const versionRegex = /(beta-)(\d+).(\d+).(\d+)/
  const versionSplit = version.match(versionRegex);
  console.log(versionSplit);

  // Decrement version
  let carry = 0;
  let newMicro = parseInt(versionSplit[4]) - 1;
  if (newMicro < 0) {
    carry = 1
    newMicro = 0;
  }
  let newMinor = parseInt(versionSplit[3]) - carry;
  if (newMinor < 0) {
    carry = 1
    newMinor = 0;
  }
  let newMajor = parseInt(versionSplit[2]) - carry;
  if (newMajor < 0) {
    newMajor = 0;
  }
  return `${versionSplit[1]}${newMajor}.${newMinor}.${newMicro}`
}

const createIssue = async ({github, context, exec, io}) => {
  const { OS } = process.env;
  console.log(OS);

  const test = await io.which('jai')
  console.log(test);

  const { jaiVersion: get_jai_version } = require('./utils.js');
  let currentVersion = await get_jai_version({ exec });
  console.log('current version', currentVersion);

  let compiler_path = 'jai'; // we start with the current one
  await exec.exec(`${compiler_path} bug_suit.jai`);

  currentVersion = decrementVersionString(currentVersion);
  compiler_path = 'c:/' + `jai-${currentVersion}/bin/jai`;
  console.log(compiler_path)
  await exec.exec(`${compiler_path} bug_suit.jai`);

  currentVersion = decrementVersionString(currentVersion);
  compiler_path = 'c:/' + `jai-${currentVersion}/bin/jai`;
  await exec.exec(`${compiler_path} bug_suit.jai`);


  
  let content = {};

  const fs = require('fs');
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    console.log("File content:");
    content = JSON.parse(data);
  } catch (err) {
      console.error("Error reading file:", err);
  }
  
  console.log(content);
};

module.exports = createIssue;