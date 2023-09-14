const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const { config } = require('process');
const version = "1.0.0";

async function package() {
  try {
    ({error, stderr, stdout} = await exec(`node_modules\\.bin\\electron-packager . BTJGenshinPS --platform=win32 --overwrite --icon=./dist/favicon.ico --arch=ia32 --asar --ignore=GateServer --ignore=data`));
    error ? config.error(error) : console.log(`${stdout}\n${stderr}`)

    const files = await fs.readdir(`BTJGenshinPS-win32-ia32`);
    const filesToKeep = ['en-US.pak', 'zh-CN.pak', 'zh-TW.pak'];
    for (const file of files) {
      if (!filesToKeep.includes(file)) {
        await fs.unlink(path.join(`BTJGenshinPS-win32-ia32`, file));
      }
    }
  } catch (error) {
    console.error(error);
  }
}

package();
