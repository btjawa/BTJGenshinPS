const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');

async function package() {
    const files = await fs.readdir(`BTJGenshinPS-win32-ia32\\locales`);
    const filesToKeep = ['en-US.pak', 'zh-CN.pak', 'zh-TW.pak'];
    for (const file of files) {
      if (!filesToKeep.includes(file)) {
        await fs.unlink(path.join(`BTJGenshinPS-win32-ia32\\locales`, file));
      }
    }
}

package();
