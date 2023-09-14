const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const version = "1.0.0";
const type = "alpha";

const localesDir = path.join(__dirname, `BTJGenshinPS-${version}-win32-ia32-${type}`, 'locales');
let error, stderr, stdout;

(async function() {
  try {
      await fs.access(`BTJGenshinPS-${version}-win32-ia32-${type}`);
      await exec(`rmdir BTJGenshinPS-${version}-win32-ia32-${type} /s /q`);
      await package();
  } catch (err) {
      if (err.code === 'ENOENT') {
          await package();
      } else {
          console.error(err);
      }
  }
})();

async function package() {
  try {
    ({error, stderr, stdout} = await exec(`node_modules\\.bin\\electron-packager . BTJGenshinPS --platform=win32 --overwrite --icon=./dist/favicon.ico --arch=ia32 --asar --ignore=GateServer --ignore=data --download.mirrorOptions.mirror=https://npm.taobao.org/mirrors/electron/`));
    error ? console.error(error) : console.log(`${stdout}\n${stderr}`);

    ({error, stderr, stdout} = await exec(`move BTJGenshinPS-win32-ia32 BTJGenshinPS-${version}-win32-ia32-${type}`));
    error ? console.error(error) : console.log(`${stdout}\n${stderr}`);

    ({error, stderr, stdout} = await exec(`xcopy .\\data .\\BTJGenshinPS-${version}-win32-ia32-${type}\\resources\\data /E /I`));
    error ? console.error(error) : console.log(`${stdout}\n${stderr}`);

    ({error, stderr, stdout} = await exec(`xcopy .\\GateServer .\\BTJGenshinPS-${version}-win32-ia32-${type}\\resources\\GateServer /E /I`));
    error ? console.error(error) : console.log(`${stdout}\n${stderr}`);

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
