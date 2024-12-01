// :versionChange
const versionRegex = /(beta.)(\d+).(\d+).(\d+)/;

const getCurrentJaiVersion = async ({ exec }) => {      
  let jaiVersionOutput = '';

  const options = {};
  options.silent = true;
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

  // currently this is a bug in jai so we need the workaround script
  await exec.exec('jai jai_version_workaround.jai', [], options);

  const versionMatch = jaiVersionOutput.match(/beta.\d+\.\d+\.\d+/);
  const version = versionMatch ? versionMatch[0].replace(/\s+/g, '-') : 'VersionNotFound';


  // Check if the version is in the correct format
  // :versionChange
  if (versionRegex.test(version) === false) {
    console.error(
      'The version format has changed! Please update all places that break, like the IssueTrackers histories sorting with mixed version formats of the old and new one. :versionChange',
      version,
    );
    process.exit(1);
  }

  return version;
}



const decrementVersionString = (version, count = 1) => {
  const versionSplit = version.match(versionRegex);

  let newMicro = parseInt(versionSplit[4]);
  let newMinor = parseInt(versionSplit[3]);
  let newMajor = parseInt(versionSplit[2]);
  for (let i = 0; i < count; i++) {
    // Decrement version
    let carry = 0;
    newMicro = newMicro - 1;
    if (newMicro < 0) {
      carry = 1;
      newMicro = 0;
    }
    newMinor = newMinor - carry;
    if (newMinor < 0) {
      carry = 1;
      newMinor = 0;
    }
    newMajor = newMajor - carry;
    if (newMajor < 0) {
      newMajor = 0;
    }
  }

  return `${versionSplit[1]}${newMajor}.${newMinor}.${newMicro
    .toString()
    .padStart(3, '0')}`;
};



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



const isDeepEqual = (object1, object2) => {
  const isObject = (object) => {
    return object != null && typeof object === "object";
  };

  const objKeys1 = Object.keys(object1);
  const objKeys2 = Object.keys(object2);

  if (objKeys1.length !== objKeys2.length) return false;

  for (var key of objKeys1) {
    const value1 = object1[key];
    const value2 = object2[key];

    const isObjects = isObject(value1) && isObject(value2);

    if (
      (isObjects && !isDeepEqual(value1, value2)) 
      || (!isObjects && value1 !== value2)
    ) {
      return false;
    }
  }
  return true;
};



module.exports = {
  getCurrentJaiVersion,
  format,
  isDeepEqual,
  decrementVersionString,
}