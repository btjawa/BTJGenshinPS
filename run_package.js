const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const packageJson = require('./package.json');
const [version, type] = packageJson.version.split('-');
const iconv = require('iconv-lite');

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

exec("chcp 65001",(error,stdout,stderr) => {
  error ? console.error(error) : console.log(`${stderr}\n${stdout}`)
})

async function package() {
  try {
    ({error, stdout, stderr} = await exec(`electron-packager . BTJGenshinPS --platform=win32 --overwrite --icon=./dist/favicon.ico --arch=ia32 --extra-resource=data --extra-resource=GateServer --ignore=GateServer --ignore=data --ignore=release.md --ignore=BGP-docs --ignore=log --ignore=app.config.json --prune --download.mirrorOptions.mirror=https://npm.taobao.org/mirrors/electron/`));
    if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));

    ({error, stdout, stderr} = await exec(`xcopy .\\node_modules\\iconv-lite .\\BTJGenshinPS-win32-ia32\\resources\\app\\node_modules\\iconv-lite /E /I /Y`));
    if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));

    ({error, stdout, stderr} = await exec(`xcopy .\\node_modules\\moment-timezone .\\BTJGenshinPS-win32-ia32\\resources\\app\\node_modules\\moment-timezone /E /I /Y`));
    if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));

    ({error, stdout, stderr} = await exec(`xcopy .\\node_modules\\form-data .\\BTJGenshinPS-win32-ia32\\resources\\app\\node_modules\\form-data /E /I /Y`));
    if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));

    ({error, stdout, stderr} = await exec(`asar pack BTJGenshinPS-win32-ia32\\resources\\app BTJGenshinPS-win32-ia32\\resources\\app.asar && rmdir BTJGenshinPS-win32-ia32\\resources\\app /s /q`));
    if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));

    ({error, stdout, stderr} = await exec(`move BTJGenshinPS-win32-ia32 BTJGenshinPS-${version}-win32-ia32-${type}`));
    if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));

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
