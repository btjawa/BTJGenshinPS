const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const version = "1.0.0";

const localesDir = path.join(__dirname, `BTJGenshinPS-${version}-win32-ia32-alpha`, 'locales');
let error, stderr, stdout;

async function package() {
  try {
    ({error, stderr, stdout} = await exec(`node_modules\\.bin\\electron-packager . BTJGenshinPS --platform=win32 --overwrite --icon=./dist/favicon.ico --arch=ia32 --asar --ignore=GateServer --ignore=data --download.mirrorOptions.mirror=https://npm.taobao.org/mirrors/electron/`));
    if (error) { console.log(error); return; }
    console.log(stdout);
    console.log(stderr);

    const files = await fs.readdir(localesDir);
    const filesToKeep = ['en-US.pak', 'zh-CN.pak', 'zh-TW.pak'];
    for (const file of files) {
      if (!filesToKeep.includes(file)) {
        await fs.unlink(path.join(localesDir, file));
      }
    }
  } catch (error) {
    console.error(error);
  }
}

package();
