const decrementVersionString = (version, count = 1) =>  {
  const versionRegex = /(beta.)(\d+).(\d+).(\d+)/
  const versionSplit = version.match(versionRegex);

  let newMicro = parseInt(versionSplit[4]);
  let newMinor = parseInt(versionSplit[3]);
  let newMajor = parseInt(versionSplit[2]);
  for (let i = 0; i < count; i++) {
    // Decrement version
    let carry = 0;
    newMicro = newMicro - 1;
    if (newMicro < 0) {
      carry = 1
      newMicro = 0;
    }
    newMinor = newMinor - carry;
    if (newMinor < 0) {
      carry = 1
      newMinor = 0;
    }
    newMajor = newMajor - carry;
    if (newMajor < 0) {
      newMajor = 0;
    }
  }

  return `${versionSplit[1]}${newMajor}.${newMinor}.${newMicro.toString().padStart(3, '0')}`
}

const bugSuit = async ({github, context, exec, io}) => {
  const path = require('path');

  // Jai Version
  const { isDeepEqual, jaiVersion: get_jai_version } = require('./utils.js');
  let currentVersion = await get_jai_version({ exec });
  console.log('current version', currentVersion);

  // Get old state of test results
  let old_test_results = {};
  const fs = require('fs');
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    old_test_results = JSON.parse(data);
  } catch (err) {
      console.error("Error reading file:", err);
  }
  console.log(old_test_results);

  let compiler_path = await io.which('jai'); // we start with the current one
  await exec.exec(`${compiler_path} bug_suit.jai`);

  currentVersion = decrementVersionString(currentVersion);
  let extension = path.extname(compiler_path);
  compiler_path = path.resolve(compiler_path, '..', '..', '..', `jai-${currentVersion}/bin`) + `${path.sep}jai${extension}`;
  console.log('comppath', compiler_path)
  await exec.exec(`${compiler_path} bug_suit.jai`);

  currentVersion = decrementVersionString(currentVersion);
  compiler_path = 'c:/' + `jai-${currentVersion}/bin/jai`;
  await exec.exec(`${compiler_path} bug_suit.jai`);


  // Get new test results
  let new_test_results = {};
  const fs = require('fs');
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    new_test_results = JSON.parse(data);
  } catch (err) {
      console.error("Error reading file:", err);
  }
  console.log(new_test_results);
};

module.exports = bugSuit;